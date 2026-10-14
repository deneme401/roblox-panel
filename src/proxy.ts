import { NextResponse, type NextRequest } from "next/server";
import { SESSION_COOKIE, verifySession } from "@/lib/auth/token";

// İyimser kontrol: imzalı çerez yoksa giriş sayfasına yönlendir.
// Asıl yetki kontrolü Server Action'larda requireMember() ile yapılır.
export async function proxy(request: NextRequest) {
  const member = await verifySession(request.cookies.get(SESSION_COOKIE)?.value);
  if (member) return NextResponse.next();
  const url = new URL("/login", request.url);
  if (request.nextUrl.pathname !== "/") url.searchParams.set("next", request.nextUrl.pathname);
  return NextResponse.redirect(url);
}

export const config = {
  // giriş sayfası, cron route'ları (CRON_SECRET ile korunur) ve statik dosyalar hariç
  matcher: ["/((?!login|api/cron|_next/static|_next/image|favicon.ico|.*\.(?:png|jpg|svg|ico|webp)$).*)"],
};
