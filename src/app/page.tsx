import { auth } from "@/auth";
import { DashboardContainer } from "@/components/DashboardContainer";

export default async function Home() {
  const session = await auth();

  return <DashboardContainer userName={session?.user?.name} />;
}
