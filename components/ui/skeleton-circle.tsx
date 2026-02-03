"use client";

import React from "react";
import { Skeleton } from "./skeleton";

interface SkeletonCircleProps {
  size?: "sm" | "md" | "lg" | "xl";
  className?: string;
}

const sizeMap: Record<string, string> = {
  sm: "h-8 w-8",
  md: "h-10 w-10",
  lg: "h-12 w-12",
  xl: "h-16 w-16",
};

/**
 * Circular skeleton placeholder for avatars/icons.
 * Example: <SkeletonCircle size="md" />
 */
export function SkeletonCircle({ size = "md", className = "" }: SkeletonCircleProps) {
  const sizeClass = sizeMap[size];
  return <Skeleton className={`${sizeClass} rounded-full ${className}`} />;
}

export default SkeletonCircle;
