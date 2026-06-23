"use client";

import { useEffect, useState } from "react";
import { useTheme } from "next-themes";

// Resolve a handful of token colors to concrete strings for libraries that can't consume CSS vars
// in SVG presentation attributes (recharts grid/axis) or non-DOM canvases (3Dmol background).
// Re-reads whenever the resolved theme flips.
function readVar(name: string): string {
  if (typeof window === "undefined") return "";
  const v = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
  return v ? `hsl(${v})` : "";
}

export type ThemeColors = {
  isDark: boolean;
  grid: string;
  axis: string;
  mol3dBackground: string;
};

export function useThemeColors(): ThemeColors {
  const { resolvedTheme } = useTheme();
  const [colors, setColors] = useState<ThemeColors>({
    isDark: false,
    grid: "hsl(0 0% 89.8%)",
    axis: "hsl(0 0% 45.1%)",
    mol3dBackground: "#ffffff",
  });

  useEffect(() => {
    const isDark = resolvedTheme === "dark";
    setColors({
      isDark,
      grid: readVar("--border"),
      axis: readVar("--muted-foreground"),
      // Match the --card surface so the viewer blends with its container in both themes.
      mol3dBackground: isDark ? "#171717" : "#ffffff",
    });
  }, [resolvedTheme]);

  return colors;
}
