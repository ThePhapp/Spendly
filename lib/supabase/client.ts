"use client";

import { createBrowserClient } from "@supabase/ssr";
import type { SupabaseClient } from "@supabase/supabase-js";
import { getSupabaseConfig } from "./config";

let browserClient: SupabaseClient | undefined;

export function createClient(): SupabaseClient {
  const config = getSupabaseConfig();
  if (!config) {
    throw new Error(
      "Supabase chưa được cấu hình. Hãy thêm NEXT_PUBLIC_SUPABASE_URL và NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY.",
    );
  }

  browserClient ??= createBrowserClient(config.url, config.publishableKey);
  return browserClient;
}
