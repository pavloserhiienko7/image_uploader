import { createHmac, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";

const SESSION_COOKIE = "image_uploader_session";
const SESSION_TTL_SECONDS = 60 * 60 * 24 * 7;

type SessionPayload = {
  username: string;
  expiresAt: number;
};

function getAuthEnv() {
  return {
    username: process.env.ADMIN_USERNAME,
    password: process.env.ADMIN_PASSWORD,
    secret: process.env.SESSION_SECRET
  };
}

function getSessionSecret() {
  const secret = getAuthEnv().secret;

  if (!secret) {
    throw new Error("SESSION_SECRET is not configured.");
  }

  return secret;
}

function toBase64Url(value: string) {
  return Buffer.from(value, "utf8").toString("base64url");
}

function fromBase64Url(value: string) {
  return Buffer.from(value, "base64url").toString("utf8");
}

function sign(value: string) {
  return createHmac("sha256", getSessionSecret()).update(value).digest("base64url");
}

function safeEqual(a: string, b: string) {
  const left = Buffer.from(a);
  const right = Buffer.from(b);

  if (left.length !== right.length) {
    return false;
  }

  return timingSafeEqual(left, right);
}

export function isAuthConfigured() {
  const { username, password, secret } = getAuthEnv();
  return Boolean(username && password && secret);
}

export function validateAdminCredentials(username: string, password: string) {
  const env = getAuthEnv();

  if (!env.username || !env.password || !env.secret) {
    throw new Error("Admin authentication env vars are not fully configured.");
  }

  return username === env.username && password === env.password;
}

export function createSessionToken(username: string) {
  const payload: SessionPayload = {
    username,
    expiresAt: Date.now() + SESSION_TTL_SECONDS * 1000
  };
  const encodedPayload = toBase64Url(JSON.stringify(payload));
  const signature = sign(encodedPayload);

  return `${encodedPayload}.${signature}`;
}

export function verifySessionToken(token: string | undefined) {
  if (!token) {
    return null;
  }

  const [encodedPayload, signature] = token.split(".");

  if (!encodedPayload || !signature) {
    return null;
  }

  const expectedSignature = sign(encodedPayload);

  if (!safeEqual(signature, expectedSignature)) {
    return null;
  }

  try {
    const payload = JSON.parse(fromBase64Url(encodedPayload)) as SessionPayload;

    if (!payload.username || payload.expiresAt < Date.now()) {
      return null;
    }

    return payload;
  } catch {
    return null;
  }
}

export async function getSession() {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE)?.value;

  return verifySessionToken(token);
}

export function getSessionCookieName() {
  return SESSION_COOKIE;
}

export function getSessionMaxAge() {
  return SESSION_TTL_SECONDS;
}

