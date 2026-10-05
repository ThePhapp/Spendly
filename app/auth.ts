import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/config";

export type AppUser = {
  userId: string;
  displayName: string;
  email: string;
  fullName: string | null;
  isDemo: boolean;
};

const demoUser: AppUser = {
  userId: "00000000-0000-4000-8000-000000000001",
  displayName: "An Nguyễn",
  email: "demo@spendly.app",
  fullName: "An Nguyễn",
  isDemo: true,
};

export async function getAppUser(): Promise<AppUser | null> {
  if (!isSupabaseConfigured()) return demoUser;

  const supabase = await createClient();
  const { data, error } = await supabase.auth.getUser();
  if (error || !data.user?.email) return null;

  const fullName =
    typeof data.user.user_metadata.full_name === "string"
      ? data.user.user_metadata.full_name
      : null;

  return {
    userId: data.user.id,
    displayName: fullName ?? data.user.email,
    email: data.user.email,
    fullName,
    isDemo: false,
  };
}

export async function requireAppUser(): Promise<AppUser> {
  const user = await getAppUser();
  if (user) return user;
  redirect("/login");
}
