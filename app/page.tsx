import { Dashboard } from "@/features/dashboard/dashboard";
import { requireAppUser } from "@/app/auth";
import { loadWorkspace } from "@/services/workspace";

export const dynamic = "force-dynamic";

export default async function Home() {
  const user = await requireAppUser();
  const data = await loadWorkspace(user);
  return <Dashboard initialData={data} />;
}
