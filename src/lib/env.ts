// Central place to read frontend environment variables.
// All frontend env vars MUST be prefixed with VITE_ to be exposed by Vite.

export const REQUIRED_ENV_VARS = [
  "VITE_SUPABASE_URL",
  "VITE_SUPABASE_PUBLISHABLE_KEY",
] as const;

export const OPTIONAL_ENV_VARS = ["VITE_SUPABASE_PROJECT_ID"] as const;

export function getMissingEnvVars(): string[] {
  const env = import.meta.env as Record<string, string | undefined>;
  return REQUIRED_ENV_VARS.filter((k) => {
    const v = env[k];
    return !v || v.trim() === "";
  });
}
