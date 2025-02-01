import { create, verify as jwtVerify, decode } from "djwt";

export async function verify(token: string, secret: string) {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign", "verify"]
  );

  try {
    return await jwtVerify(token, key);
  } catch (error) {
    throw new Error("Invalid token");
  }
}

export async function createToken(payload: object, secret: string) {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign", "verify"]
  );

  return await create({ alg: "HS256", typ: "JWT" }, payload, key);
}
