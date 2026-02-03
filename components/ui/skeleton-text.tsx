"use client";

import React from "react";
import { Skeleton } from "./skeleton";

interface SkeletonTextProps {
  lines?: number;
  lineClassName?: string;
}

/**
 * Multi-line skeleton text placeholder.
 * Useful for blocks of text with varying widths.
 * Example: <SkeletonText lines={3} />
 */
export function SkeletonText({ lines = 3, lineClassName = "h-3 w-full mb-2" }: SkeletonTextProps) {
  return (
    <div>
      {Array.from({ length: lines }).map((_, i) => (
        <Skeleton
          key={i}
          className={`${lineClassName} ${i === lines - 1 ? "mb-0" : ""}`}
        />
      ))}
    </div>
  );
}

export default SkeletonText;
