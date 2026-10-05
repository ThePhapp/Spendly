import { isSupabaseConfigured } from "@/lib/supabase/config";

export function GET() {
  return Response.json({
    status: "ok",
    database: isSupabaseConfigured() ? "supabase" : "demo",
    timestamp: new Date().toISOString(),
  });
}
