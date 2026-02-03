"use client";

import React from "react";

interface SkeletonProps extends React.HTMLAttributes<HTMLDivElement> {
  className?: string;
}

/**
 * Base skeleton component: a simple animated placeholder block.
 * Use className to set width/height/radius.
 * Example: <Skeleton className="h-4 w-full rounded-md" />
 */
export function Skeleton({ className = "h-4 w-full rounded-md", ...props }: SkeletonProps) {
  return (
    <div
      className={`${className} bg-slate-100 dark:bg-slate-700 animate-pulse`}
      {...props}
    />
  );
}

export default Skeleton;
