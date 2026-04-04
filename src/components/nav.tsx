"use client";

import Link from "next/link";
import Image from "next/image";
import { WalletButton } from "./wallet-button";
import { ThemeToggle } from "./theme-toggle";
import { ModelSelector } from "./chat/model-selector";

export function Nav() {
  return (
    <header className="sticky top-0 z-50 border-b bg-background/80 backdrop-blur-sm">
      <div className="mx-auto flex h-14 max-w-5xl items-center justify-between px-4">
        <Link href="/" className="flex items-center gap-2 font-heading text-lg font-bold tracking-tight">
          <Image src="/flare-logo.png" alt="Flare" width={24} height={24} />
          Trustless AI
        </Link>
        <div className="flex items-center gap-2">
          <ModelSelector />
          <ThemeToggle />
          <WalletButton />
        </div>
      </div>
    </header>
  );
}
