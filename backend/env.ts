import { loadEnv } from "./deps.ts";

export async function load() {
  try {
    const env = await loadEnv({
      envPath: "./.env",
    });

    // Validate required environment variables
    const required = ["JWT_SECRET", "ADMIN_PASSWORD"];
    for (const key of required) {
      if (!env[key]) {
        throw new Error(`Missing required environment variable: ${key}`);
      }
    }

    return env;
  } catch (error) {
    console.error("Error loading environment variables:", error);
    throw error;
  }
}
