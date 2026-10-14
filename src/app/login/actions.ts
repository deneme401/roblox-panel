"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { isMemberId } from "@/lib/auth/members";
import { SESSION_COOKIE, SESSION_DAYS, signSession } from "@/lib/auth/token";

export type LoginState = { error?: string } | undefined;

export async function login(_prev: LoginState, form: FormData): Promise<LoginState> {
  const member = form.get("member");
  const next = String(form.get("next") || "/");
  if (!isMemberId(member)) return { error: "Bir kullanıcı seç." };

  // APP_PASSWORD tanımlıysa (canlı ortam) ortak şifre istenir.
  const required = process.env.APP_PASSWORD;
  if (required && form.get("password") !== required) return { error: "Şifre yanlış." };

  (await cookies()).set(SESSION_COOKIE, await signSession(member), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: SESSION_DAYS * 86_400,
    path: "/",
  });
  redirect(next.startsWith("/") && !next.startsWith("//") ? next : "/");
}

export async function logout() {
  (await cookies()).delete(SESSION_COOKIE);
  redirect("/login");
}
