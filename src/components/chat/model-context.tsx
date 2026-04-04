"use client";

import { createContext, useContext, useState, type ReactNode } from "react";
import type { ModelId } from "./model-selector";

const ModelContext = createContext<{
  model: ModelId;
  setModel: (model: ModelId) => void;
} | null>(null);

export function ModelProvider({ children }: { children: ReactNode }) {
  const [model, setModel] = useState<ModelId>("anthropic/claude-opus-4.6");
  return (
    <ModelContext value={{ model, setModel }}>
      {children}
    </ModelContext>
  );
}

export function useModel() {
  const ctx = useContext(ModelContext);
  if (!ctx) throw new Error("useModel must be used within ModelProvider");
  return ctx;
}
