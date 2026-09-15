import { createHmac, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";

const COOKIE_NAME = "lifeledger_session";

function expectedToken() {
  const secret = process.env.SESSION_SECRET || "development-only-secret";
  const user = process.env.APP_USER || "admin";
  const password = process.env.APP_PASSWORD || "change-this-password";
  return createHmac("sha256", secret).update(`lifeledger:${user}:${password}`).digest("hex");
}

function secureEqual(a: string, b: string) {
  const aa = Buffer.from(a);
  const bb = Buffer.from(b);
  return aa.length === bb.length && timingSafeEqual(aa, bb);
}

export async function isAuthenticated() {
  const store = await cookies();
  const value = store.get(COOKIE_NAME)?.value;
  return Boolean(value && secureEqual(value, expectedToken()));
}

export async function setSession() {
  const store = await cookies();
  store.set(COOKIE_NAME, expectedToken(), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 30,
  });
}

export async function clearSession() {
  const store = await cookies();
  store.delete(COOKIE_NAME);
}

export function validCredentials(user: string, password: string) {
  const expectedUser = process.env.APP_USER || "admin";
  const expectedPassword = process.env.APP_PASSWORD || "change-this-password";
  return secureEqual(user, expectedUser) && secureEqual(password, expectedPassword);
}
