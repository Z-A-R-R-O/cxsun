"use client";

import * as React from "react";
import { cn } from "../lib";

export type AnimatedTab = {
  readonly value: string;
  readonly label: React.ReactNode;
  readonly content: React.ReactNode;
  readonly className?: string;
  readonly contentClassName?: string;
};

export type AnimatedTabsProps = {
  readonly tabs: readonly AnimatedTab[];
  readonly defaultValue?: string;
  readonly value?: string;
  readonly onValueChange?: (value: string) => void;
  readonly className?: string;
};

function resolveTabIndex(tabs: readonly AnimatedTab[], value?: string) {
  if (!value) return 0;
  const index = tabs.findIndex((tab) => tab.value === value);
  return index === -1 ? 0 : index;
}

export function AnimatedTabs({
  tabs,
  defaultValue,
  value,
  onValueChange,
  className,
}: AnimatedTabsProps) {
  const [internalValue, setInternalValue] = React.useState(defaultValue ?? tabs[0]?.value ?? "");
  const selectedValue = value ?? internalValue;
  const activeIndex = resolveTabIndex(tabs, selectedValue);
  const activeTab = tabs[activeIndex] ?? tabs[0];
  const [hoveredIndex, setHoveredIndex] = React.useState<number | null>(null);
  const [indicatorStyle, setIndicatorStyle] = React.useState<{
    readonly width: number;
    readonly x: number;
  } | null>(null);
  const [hoverStyle, setHoverStyle] = React.useState<{
    readonly width: number;
    readonly x: number;
  } | null>(null);
  const navRef = React.useRef<HTMLDivElement>(null);
  const buttonRefs = React.useRef<Array<HTMLButtonElement | null>>([]);

  React.useLayoutEffect(() => {
    const navRect = navRef.current?.getBoundingClientRect();
    const activeRect = buttonRefs.current[activeIndex]?.getBoundingClientRect();
    const hoveredRect =
      hoveredIndex == null ? null : buttonRefs.current[hoveredIndex]?.getBoundingClientRect();

    setIndicatorStyle(
      navRect && activeRect ? { width: activeRect.width, x: activeRect.left - navRect.left } : null,
    );
    setHoverStyle(
      navRect && hoveredRect
        ? { width: hoveredRect.width, x: hoveredRect.left - navRect.left }
        : null,
    );
  }, [activeIndex, hoveredIndex, tabs]);

  if (!activeTab) return null;

  return (
    <div className={cn("w-full", className)}>
      <div className="rounded-2xl border border-border/70 bg-card/60 p-1 shadow-sm">
        <div
          ref={navRef}
          className="relative flex items-center gap-1 overflow-x-auto"
          onPointerLeave={() => setHoveredIndex(null)}
        >
          {hoverStyle ? (
            <span
              className="absolute inset-y-0 z-0 rounded-xl bg-muted/80 transition-all duration-200 ease-out"
              style={{ width: hoverStyle.width, transform: `translateX(${hoverStyle.x}px)` }}
            />
          ) : null}
          {indicatorStyle ? (
            <span
              className="absolute bottom-0 z-10 h-0.5 rounded-full bg-foreground transition-all duration-200 ease-out"
              style={{
                width: Math.max(indicatorStyle.width - 18, 12),
                transform: `translateX(${indicatorStyle.x + 9}px)`,
              }}
            />
          ) : null}
          {tabs.map((tab, index) => {
            const isActive = index === activeIndex;

            return (
              <button
                key={tab.value}
                ref={(node) => {
                  buttonRefs.current[index] = node;
                }}
                type="button"
                className={cn(
                  "relative z-20 flex min-h-10 shrink-0 cursor-pointer items-center rounded-xl px-4 py-2 text-sm transition-colors",
                  isActive
                    ? "font-semibold text-foreground"
                    : "text-muted-foreground hover:text-foreground",
                  tab.className,
                )}
                onClick={() => {
                  setInternalValue(tab.value);
                  onValueChange?.(tab.value);
                }}
                onFocus={() => setHoveredIndex(index)}
                onPointerEnter={() => setHoveredIndex(index)}
              >
                {tab.label}
              </button>
            );
          })}
        </div>
      </div>
      <div
        key={activeTab.value}
        className={cn(
          "mt-4 animate-in fade-in-0 slide-in-from-bottom-1 duration-200",
          activeTab.contentClassName,
        )}
      >
        {activeTab.content}
      </div>
    </div>
  );
}
