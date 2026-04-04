import { Providers } from "@/components/providers";
import { Nav } from "@/components/nav";

export default function MainLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <Providers>
      <Nav />
      <main className="flex min-h-0 flex-1 flex-col">{children}</main>
    </Providers>
  );
}
