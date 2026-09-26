import { NextResponse } from "next/server";
import { getPasskeys, setPasskeys } from "@/lib/kv";
import { estAdmin } from "@/lib/auth";
import { contexteWebAuthn } from "@/lib/webauthn";

export const dynamic = "force-dynamic";

/** Les clefs enregistrees, sans la partie publique — inutile a l'ecran. */
export async function GET(request: Request) {
  if (!(await estAdmin(request))) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  }
  const { rpId } = contexteWebAuthn(request);
  const clefs = await getPasskeys();
  return NextResponse.json(
    clefs.map((c) => ({
      id: c.id,
      libelle: c.libelle,
      rpId: c.rpId,
      creeeLe: c.creeeLe,
      vueLe: c.vueLe ?? null,
      /** false = enregistree sur un autre domaine, donc inutilisable ici. */
      utilisableIci: c.rpId === rpId,
    }))
  );
}

/**
 * Retire une clef.
 *
 * ⚠️ On accepte de retirer la derniere : le mot de passe reste la voie de
 * secours, et refuser enfermerait dans un appareil perdu.
 */
export async function DELETE(request: Request) {
  if (!(await estAdmin(request))) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  }
  const { id } = await request.json().catch(() => ({ id: null }));
  if (!id) return NextResponse.json({ error: "Requête invalide" }, { status: 400 });
  const clefs = await getPasskeys();
  await setPasskeys(clefs.filter((c) => c.id !== id));
  return NextResponse.json({ ok: true });
}
