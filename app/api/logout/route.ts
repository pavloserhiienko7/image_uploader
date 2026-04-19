import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { getSessionCookieName } from "@/lib/auth";

export async function POST() {
  const cookieStore = await cookies();

  cookieStore.set({
    name: getSessionCookieName(),
    value: "",
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 0
  });

  return NextResponse.json({ success: true });
}

