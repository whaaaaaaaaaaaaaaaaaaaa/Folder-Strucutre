import { Context } from "https://deno.land/x/oak@v12.6.1/mod.ts";
import { jwtVerify, SignJWT } from "npm:jose@5.9.6";
import { load } from "https://deno.land/std@0.208.0/dotenv/mod.ts";

const env = await load();
console.log("Loaded environment variables:", { 
  ADMIN_PASSWORD: env.ADMIN_PASSWORD,
  JWT_SECRET: env.JWT_SECRET 
});

const JWT_SECRET = env.JWT_SECRET || "your-secret-key";
const ADMIN_PASSWORD = env.ADMIN_PASSWORD || "default-password";
const secret = new TextEncoder().encode(JWT_SECRET);

export async function login(ctx: Context) {
  const body = await ctx.request.body({ type: "json" }).value;
  const { password } = body;
  
  console.log("Login attempt:", { 
    receivedPassword: password,
    expectedPassword: ADMIN_PASSWORD,
    matches: password === ADMIN_PASSWORD 
  });

  if (password === ADMIN_PASSWORD) {
    try {
      const token = await new SignJWT({ authorized: true })
        .setProtectedHeader({ alg: "HS256" })
        .setIssuedAt()
        .setExpirationTime("24h")
        .sign(secret);

      ctx.response.body = { token };
      ctx.response.status = 200;
    } catch (error) {
      console.error("JWT creation error:", error);
      ctx.response.status = 500;
      ctx.response.body = { error: "Failed to create authentication token" };
    }
  } else {
    ctx.response.status = 401;
    ctx.response.body = { error: "Invalid password" };
  }
}

export async function authMiddleware(ctx: Context, next: () => Promise<void>) {
  const path = ctx.request.url.pathname;
  console.log("Auth middleware - Path:", path);
  console.log("Auth middleware - Method:", ctx.request.method);
  
  // Allow OPTIONS requests to pass through for CORS
  if (ctx.request.method === "OPTIONS") {
    await next();
    return;
  }

  // Allow these paths without authentication
  const publicPaths = ['/login', '/folders', '/files'];
  if (publicPaths.includes(path) && ctx.request.method === 'GET') {
    await next();
    return;
  }

  // Check for auth header
  const authHeader = ctx.request.headers.get("Authorization");
  console.log("Auth header:", authHeader);

  if (!authHeader) {
    console.log("No auth header found");
    ctx.response.headers.set("Content-Type", "application/json");
    ctx.response.status = 401;
    ctx.response.body = JSON.stringify({
      success: false,
      error: "No authorization header"
    });
    return;
  }

  // Verify JWT token
  try {
    const token = authHeader.split(" ")[1];
    console.log("Token:", token);
    
    const { payload } = await jwtVerify(token, secret);
    console.log("Token payload:", payload);

    if (!payload.authorized) {
      throw new Error("Not authorized");
    }

    await next();
  } catch (error) {
    console.error("Auth error:", error);
    ctx.response.headers.set("Content-Type", "application/json");
    ctx.response.status = 401;
    ctx.response.body = JSON.stringify({
      success: false,
      error: "Invalid or expired token"
    });
  }
}
