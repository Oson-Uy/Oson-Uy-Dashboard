import { NextResponse } from "next/server";

export async function POST(request: Request) {
  const { locale } = (await request.json()) as { locale?: string };
  const safeLocale = ["uz", "ru"].includes(locale ?? "") ? locale! : "ru";

  const response = NextResponse.json({ ok: true });
  response.cookies.set("oson_uy_dash_locale", safeLocale, {
    path: "/",
    maxAge: 60 * 60 * 24 * 365,
    sameSite: "lax",
  });

  return response;
}
