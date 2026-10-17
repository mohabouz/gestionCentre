"use client";

import { useEffect, useRef } from "react";

// Open overlays register here; only the most recently opened one reacts to Escape.
const layers: symbol[] = [];

export function useEscapeLayer(active: boolean, onClose: () => void) {
  const latest = useRef(onClose);
  useEffect(() => {
    latest.current = onClose;
  });
  useEffect(() => {
    if (!active) return;
    const id = Symbol("escape-layer");
    layers.push(id);
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "Escape" || layers[layers.length - 1] !== id) return;
      event.preventDefault();
      latest.current();
    };
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      const index = layers.indexOf(id);
      if (index >= 0) layers.splice(index, 1);
    };
  }, [active]);
}
