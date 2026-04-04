"use client";

import { useCallback, useEffect, useState } from "react";

const slides = [
  {
    label: "Problem",
    content: "Did you already get that feeling?",
  },
  {
    label: "Solution",
    content: "A trustless AI marketplace",
    bullets: [
      "Buy inference from any model, pay per token on-chain",
      "The provider cryptographically proves you got what you paid for",
    ],
  },
  {
    label: "Demo",
    content: "",
  },
];

export default function Presentation() {
  const [current, setCurrent] = useState(0);

  const next = useCallback(() => {
    setCurrent((c) => Math.min(c + 1, slides.length - 1));
  }, []);

  const prev = useCallback(() => {
    setCurrent((c) => Math.max(c - 1, 0));
  }, []);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "ArrowRight" || e.key === " ") {
        e.preventDefault();
        next();
      }
      if (e.key === "ArrowLeft") {
        e.preventDefault();
        prev();
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [next, prev]);

  const slide = slides[current];

  return (
    <div
      className="flex h-screen w-screen select-none flex-col items-center justify-center px-12"
      onClick={next}
    >
      <p className="mb-6 text-sm uppercase tracking-[0.3em] opacity-40">
        {slide.label}
      </p>

      {slide.content && (
        <h1 className="max-w-3xl text-center font-[family-name:var(--font-serif)] text-5xl leading-tight">
          {slide.content}
        </h1>
      )}

      {slide.bullets && (
        <ul className="mt-10 max-w-2xl space-y-6 text-center font-[family-name:var(--font-serif)] text-2xl leading-relaxed opacity-70">
          {slide.bullets.map((b) => (
            <li key={b}>{b}</li>
          ))}
        </ul>
      )}

      {slide.label === "Demo" && (
        <h1 className="font-[family-name:var(--font-serif)] text-7xl italic">
          Demo
        </h1>
      )}

      {/* slide indicator */}
      <div className="fixed bottom-8 flex gap-2">
        {slides.map((_, i) => (
          <div
            key={i}
            className={`h-1.5 w-1.5 rounded-full transition-opacity ${
              i === current ? "bg-black opacity-60" : "bg-black opacity-15"
            }`}
          />
        ))}
      </div>
    </div>
  );
}
