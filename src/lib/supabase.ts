import { createClient } from "@supabase/supabase-js";
export const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL ||
    "https://iacahumfwacpknggqjtd.supabase.co",
  import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY ||
    "sb_publishable_zFpKvhZPkptRkV-9JQNn4A_yM-4-wM7",
  {
    auth: {
      flowType: "pkce",
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
    },
  },
);
export async function checked<T extends { error: { message: string } | null }>(
  request: PromiseLike<T>,
): Promise<T extends { data: infer D } ? D : undefined> {
  const result = await request;
  if (result.error) throw new Error(result.error.message);
  return ("data" in result ? result.data : undefined) as T extends {
    data: infer D;
  }
    ? D
    : undefined;
}
