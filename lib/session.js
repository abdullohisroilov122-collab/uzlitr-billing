// Session cookie helpers. Kept free of Node-only imports so middleware (Edge runtime) can use them.
import { SignJWT, jwtVerify } from "jose";

export const SESSION_COOKIE = "uzlitr_session";
export const SESSION_HOURS = 12;
export const REMEMBER_DAYS = 30; // customers who tick "remember me"

function secret() {
  const value = process.env.SESSION_SECRET;
  if (!value || value.length < 32) {
    throw new Error("SESSION_SECRET must be set and at least 32 characters long.");
  }
  return new TextEncoder().encode(value);
}

export async function signSession(userId, hours = SESSION_HOURS) {
  return new SignJWT({})
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(String(userId))
    .setIssuedAt()
    .setExpirationTime(`${hours}h`)
    .sign(secret());
}

export async function readSession(token) {
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, secret(), { algorithms: ["HS256"] });
    return { userId: Number(payload.sub) };
  } catch {
    return null;
  }
}
