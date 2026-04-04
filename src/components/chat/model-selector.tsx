"use client";

import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { Bot, Sparkles } from "lucide-react";

const models = [
  {
    id: "anthropic/claude-opus-4.6",
    name: "Claude Opus",
    provider: "Anthropic",
    icon: Bot,
    color: "text-orange-500",
  },
  {
    id: "google/gemini-2.5-flash",
    name: "Gemini Flash",
    provider: "Google",
    icon: Sparkles,
    color: "text-blue-500",
  },
] as const;

export type ModelId = (typeof models)[number]["id"];

interface ModelSelectorProps {
  selected: ModelId;
  onSelect: (model: ModelId) => void;
}

export function ModelSelector({ selected, onSelect }: ModelSelectorProps) {
  return (
    <div className="flex gap-3">
      {models.map((model) => {
        const Icon = model.icon;
        const isSelected = selected === model.id;
        return (
          <Card
            key={model.id}
            role="radio"
            aria-checked={isSelected}
            tabIndex={0}
            onClick={() => onSelect(model.id)}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") onSelect(model.id);
            }}
            className={cn(
              "flex-1 cursor-pointer transition-all",
              isSelected
                ? "border-primary ring-2 ring-primary/20"
                : "hover:border-muted-foreground/30"
            )}
          >
            <CardContent className="flex items-center gap-3 p-4">
              <Icon className={cn("h-6 w-6", model.color)} />
              <div>
                <p className="font-medium text-sm">{model.name}</p>
                <p className="text-xs text-muted-foreground">
                  {model.provider}
                </p>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
