import { Dashboard } from "@/features/dashboard/dashboard";
import { requireChatGPTUser } from "@/app/chatgpt-auth";
import { loadWorkspace } from "@/services/workspace";

export const dynamic = "force-dynamic";

export default async function Home() {
  const user = await requireChatGPTUser("/");
  const data = await loadWorkspace(user);
  return <Dashboard initialData={data} />;
}
