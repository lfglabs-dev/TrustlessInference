import Image from "next/image";
import { cn } from "@/lib/utils";

export function ClaudeIcon({ className }: { className?: string }) {
  return (
    <Image
      src="/claude_icon.png"
      alt="Claude"
      width={16}
      height={16}
      className={cn("size-4", className)}
    />
  );
}

export function GeminiIcon({ className }: { className?: string }) {
  return (
    <Image
      src="/gemini_icon.png"
      alt="Gemini"
      width={16}
      height={16}
      className={cn("size-4", className)}
    />
  );
}
