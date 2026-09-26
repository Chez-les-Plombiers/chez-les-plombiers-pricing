import { NextResponse } from "next/server";
import {
  verifyRegistrationResponse,
  verifyAuthenticationResponse,
} from "@simplewebauthn/server";
import { getPasskeys, setPasskeys, consommerDefi } from "@/lib/kv";
import { estAdmin, creerSession } from "@/lib/auth";
import { contexteWebAuthn } from "@/lib/webauthn";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  if (!body?.mode || !body?.reponse) {
    return NextResponse.json({ error: "Requête invalide" }, { status: 400 });
  }
  const { rpId, origine } = contexteWebAuthn(request);

  // ⚠️ Le defi est consomme AVANT toute verification : meme sur echec il ne
  // doit pas pouvoir resservir.
  const defi = await consommerDefi(`${body.mode}:${rpId}`);
  if (!defi) {
    return NextResponse.json(
      { error: "Demande expirée — recommencez." },
      { status: 400 }
    );
  }

  if (body.mode === "enregistrer") {
    if (!(await estAdmin(request))) {
      return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
    }
    const v = await verifyRegistrationResponse({
      response: body.reponse,
      expectedChallenge: defi,
      expectedOrigin: origine,
      expectedRPID: rpId,
      requireUserVerification: true,
    }).catch(() => null);

    if (!v?.verified || !v.registrationInfo) {
      return NextResponse.json({ error: "Clé refusée" }, { status: 400 });
    }

    const { credential } = v.registrationInfo;
    const clefs = await getPasskeys();
    await setPasskeys([
      ...clefs.filter((c) => c.id !== credential.id),
      {
        id: credential.id,
        publicKey: Buffer.from(credential.publicKey).toString("base64url"),
        counter: credential.counter,
        rpId,
        libelle:
          typeof body.libelle === "string" && body.libelle.trim()
            ? body.libelle.trim().slice(0, 60)
            : "Appareil sans nom",
        creeeLe: new Date().toISOString(),
      },
    ]);
    return NextResponse.json({ ok: true });
  }

  if (body.mode === "connecter") {
    const clefs = await getPasskeys();
    const clef = clefs.find((c) => c.id === body.reponse.id && c.rpId === rpId);
    if (!clef) {
      return NextResponse.json({ error: "Clé inconnue" }, { status: 401 });
    }

    const v = await verifyAuthenticationResponse({
      response: body.reponse,
      expectedChallenge: defi,
      expectedOrigin: origine,
      expectedRPID: rpId,
      requireUserVerification: true,
      credential: {
        id: clef.id,
        publicKey: new Uint8Array(Buffer.from(clef.publicKey, "base64url")),
        counter: clef.counter,
      },
    }).catch(() => null);

    if (!v?.verified) {
      return NextResponse.json({ error: "Signature refusée" }, { status: 401 });
    }

    // ⚠️ Le compteur n'avance pas sur toutes les plateformes — Apple le laisse
    // a zero. On l'enregistre sans en faire une condition, sous peine de
    // bloquer tous les iPhone au deuxieme usage.
    await setPasskeys(
      clefs.map((c) =>
        c.id === clef.id
          ? {
              ...c,
              counter: v.authenticationInfo.newCounter,
              vueLe: new Date().toISOString(),
            }
          : c
      )
    );

    const jeton = await creerSession("admin", `passkey — ${clef.libelle}`);
    if (!jeton) {
      return NextResponse.json(
        { error: "Session impossible : stockage indisponible." },
        { status: 500 }
      );
    }
    return NextResponse.json({ token: jeton });
  }

  return NextResponse.json({ error: "Mode inconnu" }, { status: 400 });
}
