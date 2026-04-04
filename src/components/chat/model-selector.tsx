"use client";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ClaudeIcon, GeminiIcon } from "@/components/icons/model-icons";
import { useModel } from "./model-context";

const models = [
  {
    id: "anthropic/claude-opus-4.6",
    name: "Claude Opus",
    icon: ClaudeIcon,
  },
  {
    id: "google/gemini-2.5-pro",
    name: "Gemini Pro",
    icon: GeminiIcon,
  },
] as const;

export type ModelId = (typeof models)[number]["id"];

const modelMap = Object.fromEntries(models.map((m) => [m.id, m])) as Record<
  ModelId,
  (typeof models)[number]
>;

export function ModelSelector() {
  const { model, setModel } = useModel();
  const current = modelMap[model];
  const CurrentIcon = current.icon;

  return (
    <Select
      value={model}
      onValueChange={(value) => setModel(value as ModelId)}
    >
      <SelectTrigger size="sm">
        <SelectValue>
          <CurrentIcon />
          {current.name}
        </SelectValue>
      </SelectTrigger>
      <SelectContent align="end" alignItemWithTrigger={false}>
        {models.map((m) => {
          const Icon = m.icon;
          return (
            <SelectItem key={m.id} value={m.id}>
              <Icon />
              {m.name}
            </SelectItem>
          );
        })}
      </SelectContent>
    </Select>
  );
}
