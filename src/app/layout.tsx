import type { Metadata } from "next";
import localFont from "next/font/local";
import "./globals.css";
import { Providers } from "@/components/providers";
import { Nav } from "@/components/nav";

const etBook = localFont({
  src: [
    {
      path: "../../public/fonts/serif/etbookot-roman-webfont.woff2",
      weight: "400",
      style: "normal",
    },
    {
      path: "../../public/fonts/serif/etbookot-italic-webfont.woff2",
      weight: "400",
      style: "italic",
    },
    {
      path: "../../public/fonts/serif/etbookot-bold-webfont.woff2",
      weight: "700",
      style: "normal",
    },
  ],
  variable: "--font-serif",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Trustless AI",
  description: "Verifiable AI inference with TEE attestation",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${etBook.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      <body className="flex h-screen flex-col overflow-hidden">
        <Providers>
          <Nav />
          <main className="flex min-h-0 flex-1 flex-col">{children}</main>
        </Providers>
      </body>
    </html>
  );
}
