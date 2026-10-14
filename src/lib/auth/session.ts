import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { MEMBERS, type Member } from "./members";
import { SESSION_COOKIE, verifySession } from "./token";

/** Geçerli üye; çerez yoksa null. cookies() okuduğu için çağıran bileşen Suspense içinde olmalı. */
export async function getMember(): Promise<Member | null> {
  const id = await verifySession((await cookies()).get(SESSION_COOKIE)?.value);
  return id ? MEMBERS[id] : null;
}

/** Server Action'lar için: oturum yoksa girişe yönlendirir. */
export async function requireMember(): Promise<Member> {
  const m = await getMember();
  if (!m) redirect("/login");
  return m;
}
