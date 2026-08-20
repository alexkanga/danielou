import { z } from "zod";

const envSchema = z.object({
  DATABASE_URL: z.string().min(1, "DATABASE_URL is required"),
  DIRECT_URL: z.string().min(1, "DIRECT_URL is required"),
  AUTH_SECRET: z.string().min(32, "AUTH_SECRET must be at least 32 characters"),
  BETTER_AUTH_SECRET: z.string().min(32, "BETTER_AUTH_SECRET must be at least 32 characters"),
  BETTER_AUTH_URL: z.string().url(),
  NODE_ENV: z.enum(["development", "production", "test"]).default("development"),
});

export type Env = z.infer<typeof envSchema>;

let _env: Env | undefined;

export function getEnv(): Env {
  if (!_env) {
    _env = envSchema.parse(process.env);
  }
  return _env;
}

export function validateEnv(): Env {
  return envSchema.parse(process.env);
}
