"use client";

import { cn } from "@/lib/utils";
import { Lock, Search, Cpu, ShieldCheck } from "lucide-react";

const steps = [
  { label: "Encrypting", icon: Lock },
  { label: "Verifying model", icon: Search },
  { label: "Running inference", icon: Cpu },
  { label: "Attestation", icon: ShieldCheck },
];

interface TeeStatusProps {
  activeStep: number; // -1 = hidden, 0-3 = active step, 4 = all complete
}

export function TeeStatus({ activeStep }: TeeStatusProps) {
  if (activeStep < 0) return null;

  return (
    <div className="flex items-center justify-center gap-2 py-3">
      {steps.map((step, i) => {
        const Icon = step.icon;
        const isActive = i === activeStep;
        const isDone = i < activeStep;

        return (
          <div key={step.label} className="flex items-center gap-2">
            {i > 0 && (
              <div
                className={cn(
                  "h-px w-6 transition-colors duration-500",
                  isDone ? "bg-primary" : "bg-border"
                )}
              />
            )}
            <div className="flex items-center gap-1.5">
              <div
                className={cn(
                  "flex h-7 w-7 items-center justify-center rounded-full transition-all duration-500",
                  isDone && "bg-primary text-primary-foreground",
                  isActive && "bg-primary/20 text-primary animate-pulse",
                  !isDone && !isActive && "bg-muted text-muted-foreground"
                )}
              >
                <Icon className="h-3.5 w-3.5" />
              </div>
              <span
                className={cn(
                  "text-xs font-medium transition-colors duration-300 hidden sm:inline",
                  isDone && "text-primary",
                  isActive && "text-primary",
                  !isDone && !isActive && "text-muted-foreground"
                )}
              >
                {step.label}
              </span>
            </div>
          </div>
        );
      })}
    </div>
  );
}
