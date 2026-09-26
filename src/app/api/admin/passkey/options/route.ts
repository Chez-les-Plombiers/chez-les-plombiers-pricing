import { NextResponse } from "next/server";
import {
  generateRegistrationOptions,
  generateAuthenticationOptions,
} from "@simplewebauthn/server";
import { getPasskeys, poserDefi } from "@/lib/kv";
import { estAdmin } from "@/lib/auth";
import { contexteWebAuthn, RP_NOM, UTILISATEUR } from "@/lib/webauthn";

export const dynamic = "force-dynamic";

/**
 * Prepare une ceremonie WebAuthn et pose le defi.
 *
 * `mode: "enregistrer"` exige d'etre deja administrateur — une passkey
 * s'ajoute depuis une session ouverte, elle ne s'auto-octroie pas.
 * `mode: "connecter"` est public : c'est la porte d'entree.
 */
export async function POST(request: Request) {
  const { mode } = await request.json().catch(() => ({ mode: null }));
  const { rpId } = contexteWebAuthn(request);
  const clefs = (await getPasskeys()).filter((c) => c.rpId === rpId);

  if (mode === "enregistrer") {
    if (!(await estAdmin(request))) {
      return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
    }
    const options = await generateRegistrationOptions({
      rpName: RP_NOM,
      rpID: rpId,
      userID: UTILISATEUR.id,
      userName: UTILISATEUR.nom,
      userDisplayName: UTILISATEUR.affiche,
      attestationType: "none",
      // Les clefs deja posees : evite d'en creer une seconde sur le meme
      // appareil, et le navigateur le dit clairement a l'utilisateur.
      excludeCredentials: clefs.map((c) => ({ id: c.id })),
      authenticatorSelection: {
        residentKey: "required",      // se connecter sans saisir d'identifiant
        userVerification: "required", // Face ID / Touch ID / code — jamais la simple presence
      },
    });
    await poserDefi(`enregistrer:${rpId}`, options.challenge);
    return NextResponse.json(options);
  }

  if (mode === "connecter") {
    if (!clefs.length) {
      return NextResponse.json(
        { error: "Aucune clé n'est enregistrée pour ce domaine." },
        { status: 404 }
      );
    }
    const options = await generateAuthenticationOptions({
      rpID: rpId,
      allowCredentials: clefs.map((c) => ({ id: c.id })),
      userVerification: "required",
    });
    await poserDefi(`connecter:${rpId}`, options.challenge);
    return NextResponse.json(options);
  }

  return NextResponse.json({ error: "Mode inconnu" }, { status: 400 });
}
