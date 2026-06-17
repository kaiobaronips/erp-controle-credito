import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";

function isPublic(pathname: string): boolean {
  // /api/auth e sub-rotas exatas (/api/auth/...) — não aceita /api/auth-anything
  if (pathname === "/api/auth" || pathname.startsWith("/api/auth/")) return true;
  if (pathname === "/login") return true;
  return false;
}

async function requireSession(req: NextRequest) {
  return auth.api.getSession({ headers: req.headers });
}

export async function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl;

  if (isPublic(pathname)) return NextResponse.next();

  if (pathname.startsWith("/api/")) {
    const session = await requireSession(req);
    if (!session) {
      return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
    }
    return NextResponse.next();
  }

  // Páginas do dashboard
  const session = await requireSession(req);
  if (!session) {
    return NextResponse.redirect(new URL("/login", req.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
