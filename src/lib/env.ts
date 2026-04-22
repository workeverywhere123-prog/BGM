/**
 * Typed environment variable accessors.
 * Fail-fast on missing required values (server-side only).
 */

function required(name: string, value: string | undefined): string {
  if (!value || value.trim() === '' || value.startsWith('your-') || value.includes('your-project-ref')) {
    throw new Error(
      `Missing required env var: ${name}. ` +
        `Copy .env.example to .env.local and fill in real values from Supabase dashboard.`
    );
  }
  return value;
}

export const env = {
  // Client-safe (inlined at build time)
  SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL ?? '',
  SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? '',
  APP_URL: process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:9000',

  // Server-only — throws if accessed without a real value
  get SUPABASE_SERVICE_ROLE_KEY(): string {
    return required('SUPABASE_SERVICE_ROLE_KEY', process.env.SUPABASE_SERVICE_ROLE_KEY);
  },
} as const;

/** True when public Supabase configuration is present. */
export function isSupabaseConfigured(): boolean {
  return (
    env.SUPABASE_URL.length > 0 &&
    env.SUPABASE_ANON_KEY.length > 0 &&
    !env.SUPABASE_URL.includes('your-project-ref') &&
    !env.SUPABASE_ANON_KEY.startsWith('your-')
  );
}
