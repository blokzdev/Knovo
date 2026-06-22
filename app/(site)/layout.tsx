import { SiteHeader } from "@/components/site/SiteHeader";
import { SiteFooter } from "@/components/site/SiteFooter";
import { AccountMenu } from "@/components/site/AccountMenu";
import { Toaster } from "@/components/ui/sonner";
import { getViewer } from "@/lib/reader/viewer";

export const dynamic = "force-dynamic";

export default async function SiteLayout({ children }: { children: React.ReactNode }) {
  const viewer = await getViewer();
  return (
    <div className="flex min-h-screen flex-col">
      <SiteHeader account={<AccountMenu viewer={viewer} />} />
      <div className="flex-1">{children}</div>
      <SiteFooter />
      <Toaster />
    </div>
  );
}
