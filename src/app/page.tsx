import { Workspace } from "@/components/vendor/workspace";
import { loadWorkspaces } from "@/lib/vendors";
import { configuredMode } from "@/lib/providers";
export const dynamic = "force-dynamic";
export default async function Home() {
  const vendors = await loadWorkspaces();
  return (
    <Workspace initialVendors={vendors} configuredMode={configuredMode()} />
  );
}
