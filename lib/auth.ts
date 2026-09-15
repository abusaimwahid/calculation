import { createHmac, randomBytes, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";

const COOKIE_NAME = "lifeledger_session";
const SESSION_SECONDS = 60 * 60 * 24 * 30;

function config() {
  const production = process.env.NODE_ENV === "production";
  const user = process.env.APP_USER || (production ? "" : "admin");
  const password = process.env.APP_PASSWORD || (production ? "" : "change-this-password");
  const secret = process.env.SESSION_SECRET || (production ? "" : "lifeledger-local-development-secret-only");
  if (!user || !password || secret.length < 32) {
    throw new Error("APP_USER, APP_PASSWORD, and a SESSION_SECRET of at least 32 characters are required in production.");
  }
  return { user, password, secret };
}

function sign(payload: string, secret: string) {
  return createHmac("sha256", secret).update(payload).digest("base64url");
}

function secureEqual(a: string, b: string) {
  const aa = Buffer.from(a);
  const bb = Buffer.from(b);
  return aa.length === bb.length && timingSafeEqual(aa, bb);
}

export async function isAuthenticated() {
  const store = await cookies();
  const value = store.get(COOKIE_NAME)?.value;
  if (!value) return false;
  const [payload, signature] = value.split(".");
  if (!payload || !signature) return false;
  const { user, secret } = config();
  if (!secureEqual(signature, sign(payload, secret))) return false;
  try {
    const session = JSON.parse(Buffer.from(payload, "base64url").toString("utf8")) as { user?: string; expiresAt?: number };
    return session.user === user && typeof session.expiresAt === "number" && session.expiresAt > Date.now();
  } catch {
    return false;
  }
}

export async function setSession() {
  const store = await cookies();
  const { user, secret } = config();
  const payload = Buffer.from(JSON.stringify({ user, expiresAt: Date.now() + SESSION_SECONDS * 1000, nonce: randomBytes(16).toString("hex") })).toString("base64url");
  store.set(COOKIE_NAME, `${payload}.${sign(payload, secret)}`, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: SESSION_SECONDS,
  });
}

export async function clearSession() {
  const store = await cookies();
  store.delete(COOKIE_NAME);
}

export function validCredentials(user: string, password: string) {
  const { user: expectedUser, password: expectedPassword } = config();
  return secureEqual(user, expectedUser) && secureEqual(password, expectedPassword);
}
