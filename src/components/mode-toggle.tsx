"use client";

import { useEffect, useState } from "react";
import { useTheme } from "next-themes";
import { Button } from "@/components/ui/button";
import { Sun, Moon } from "lucide-react";
import { cn } from "@/lib/utils";

export function ModeToggle() {
  const { setTheme, resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  const isDark = mounted ? resolvedTheme === "dark" : false;

  return (
    <Button
      variant="ghost"
      size="icon"
      aria-label="Toggle theme"
      onClick={() => setTheme(isDark ? "light" : "dark")}
    >
      {/* Render the same element during SSR to avoid mismatches */}
      {!mounted ? (
        <Sun className="h-5 w-5 opacity-0" />
      ) : (
        <span className="relative inline-block h-5 w-5">
          <Sun
            className={cn(
              "absolute inset-0 h-5 w-5 transition-all duration-200",
              isDark ? "opacity-100 rotate-0 scale-100" : "opacity-0 -rotate-90 scale-0"
            )}
          />
          <Moon
            className={cn(
              "absolute inset-0 h-5 w-5 transition-all duration-200",
              isDark ? "opacity-0 rotate-90 scale-0" : "opacity-100 rotate-0 scale-100"
            )}
          />
        </span>
      )}
    </Button>
  );
}
