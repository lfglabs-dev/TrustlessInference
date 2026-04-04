import { Providers } from "@/components/providers";
import { Nav } from "@/components/nav";
import { NetworkGuard } from "@/components/network-guard";

export default function MainLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <Providers>
      <NetworkGuard />
      <Nav />
      <main className="flex min-h-0 flex-1 flex-col">{children}</main>
    </Providers>
  );
}
