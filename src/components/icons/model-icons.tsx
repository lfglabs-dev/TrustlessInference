import { cn } from "@/lib/utils";

export function ClaudeIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      className={cn("size-4", className)}
      aria-hidden="true"
    >
      <path
        d="M15.58 3.545l-3.2 8.87 9.062-4.47c.465-.23.63-.42.63-.715 0-.44-.355-.795-.795-.795a.96.96 0 00-.38.085l-5.317 2.58zM8.42 20.455l3.2-8.87-9.062 4.47c-.465.23-.63.42-.63.715 0 .44.355.795.795.795a.96.96 0 00.38-.085l5.317-2.58zM12 2C6.477 2 2 6.477 2 12s4.477 10 10 10 10-4.477 10-10S17.523 2 12 2z"
        fill="#D97757"
      />
    </svg>
  );
}

export function GeminiIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      className={cn("size-4", className)}
      aria-hidden="true"
    >
      <path
        d="M12 2C12 7.52 7.52 12 2 12c5.52 0 10 4.48 10 10 0-5.52 4.48-10 10-10-5.52 0-10-4.48-10-10z"
        fill="#4285F4"
      />
    </svg>
  );
}
