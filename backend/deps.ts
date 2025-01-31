// Deno standard library dependencies
// Oak framework
export { Application, Router, Context } from "https://deno.land/x/oak@v12.6.1/mod.ts";
export type { RouterContext } from "https://deno.land/x/oak@v12.6.1/mod.ts";

// CORS middleware
export { oakCors } from "https://deno.land/x/cors/mod.ts";

// SQLite database
export { DB } from "https://deno.land/x/sqlite@v3.8/mod.ts";

// JWT handling
export { create as createJWT, verify as verifyJWT } from "https://deno.land/x/djwt@v3.0.1/mod.ts";
export type { Payload } from "https://deno.land/x/djwt@v3.0.1/mod.ts";

// Bcrypt for password hashing
export * as bcrypt from "https://deno.land/x/bcrypt@v0.4.1/mod.ts";

// Environment variables
export { load as loadEnv } from "https://deno.land/std@0.208.0/dotenv/mod.ts";

// File system utilities
export { ensureDir, ensureFile } from "https://deno.land/std@0.208.0/fs/mod.ts";
export { join, dirname } from "https://deno.land/std@0.208.0/path/mod.ts";
