import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import {
  createSessionToken,
  getSessionCookieName,
  getSessionMaxAge,
  validateAdminCredentials
} from "@/lib/auth";

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as {
      username?: string;
      password?: string;
    };

    if (!body.username || !body.password) {
      return NextResponse.json(
        { error: "Username and password are required." },
        { status: 400 }
      );
    }

    const isValid = validateAdminCredentials(body.username, body.password);

    if (!isValid) {
      return NextResponse.json({ error: "Invalid login or password." }, { status: 401 });
    }

    const response = NextResponse.json({ success: true });
    const cookieStore = await cookies();

    cookieStore.set({
      name: getSessionCookieName(),
      value: createSessionToken(body.username),
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: getSessionMaxAge()
    });

    return response;
  } catch (error) {
    const message = error instanceof Error ? error.message : "Login failed.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

