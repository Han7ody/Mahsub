"use client";

import React, { useState, useEffect, useRef } from "react";
import UnifiedSearch from "./UnifiedSearch";

interface CollapsibleHeaderProps {
  title: string;
  badge?: string;
  searchValue: string;
  onSearchChange: (value: string) => void;
  searchPlaceholder: string;
  onMenuClick: () => void;

  /** Optional back button (recommended for mobile). */
  showBackButton?: boolean;
  onBackClick?: () => void;
  backAriaLabel?: string;

  primaryAction?: {
    label: string;
    icon: string;
    onClick: () => void;
  };
  isLoading?: boolean;
  scrollContainerRef?: React.RefObject<HTMLElement | null>;
  onScrollStateChange?: (isCollapsed: boolean) => void;
}

export default function CollapsibleHeader({
  title,
  badge,
  searchValue,
  onSearchChange,
  searchPlaceholder,
  onMenuClick,
  showBackButton = false,
  onBackClick,
  backAriaLabel = "رجوع",
  primaryAction,
  isLoading = false,
  scrollContainerRef,
  onScrollStateChange,
}: CollapsibleHeaderProps) {
  const [scrollProgress, setScrollProgress] = useState(0);
  const [isMobile, setIsMobile] = useState<boolean>(false);
  const [isRTL, setIsRTL] = useState<boolean>(false);
  const rafRef = useRef<number | undefined>(undefined);
  const lastProgressRef = useRef<number>(0);
  const collapsedRef = useRef<boolean>(false);

  // Scroll range for collapse
  // Start collapsing earlier so it feels responsive on smaller scrolls.
  const COLLAPSE_START = 20;
  const COLLAPSE_END = 90;
  const COLLAPSE_RANGE = COLLAPSE_END - COLLAPSE_START;

  // Check if mobile on mount and resize
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };

    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // RTL detection (for correct back-arrow direction)
  useEffect(() => {
    try {
      setIsRTL(document?.documentElement?.dir === "rtl");
    } catch {
      // no-op
    }
  }, []);

  // Smooth scroll-linked header collapse (mobile only)
  useEffect(() => {
    const scrollContainer = scrollContainerRef?.current;
    if (!scrollContainer) return; // Exit if no scroll container

    const handleScroll = () => {
      if (rafRef.current) {
        cancelAnimationFrame(rafRef.current);
      }

      rafRef.current = requestAnimationFrame(() => {
        if (!isMobile) {
          if (lastProgressRef.current !== 0) {
            lastProgressRef.current = 0;
            setScrollProgress(0);
          }
          if (collapsedRef.current) {
            collapsedRef.current = false;
            onScrollStateChange?.(false);
          }
          return;
        }

        // Check if there's enough content to warrant collapsing
        // If the total scrollable area is small, don't collapse to avoid flickering loops
        // where shrinking the header reduces scrollHeight, forcing scrollTop down, re-expanding header...
        const maxScroll = scrollContainer.scrollHeight - scrollContainer.clientHeight;
        // If there's barely any scrollable content, keep header expanded to avoid flicker.
        // (Previously this was too strict and prevented collapse on short lists.)
        if (maxScroll <= 24) {
          if (lastProgressRef.current !== 0) {
            lastProgressRef.current = 0;
            setScrollProgress(0);
          }
          if (collapsedRef.current) {
            collapsedRef.current = false;
            onScrollStateChange?.(false);
          }
          return;
        }

        const currentScrollY = scrollContainer.scrollTop;

        // Calculate progress (0 = expanded, 1 = collapsed)
        let progress = 0;
        if (currentScrollY > COLLAPSE_START) {
          progress = Math.min((currentScrollY - COLLAPSE_START) / COLLAPSE_RANGE, 1);
        }

        // Avoid excessive rerenders for tiny scroll deltas.
        if (Math.abs(progress - lastProgressRef.current) > 0.005) {
          lastProgressRef.current = progress;
          setScrollProgress(progress);
        }

        // Notify parent of collapse state with hysteresis to prevent rapid toggling.
        const nextCollapsed = progress >= 0.6 ? true : progress <= 0.3 ? false : collapsedRef.current;
        if (nextCollapsed !== collapsedRef.current) {
          collapsedRef.current = nextCollapsed;
          onScrollStateChange?.(nextCollapsed);
        }
      });
    };

    scrollContainer.addEventListener("scroll", handleScroll, { passive: true });
    // Also listen to resize to re-check scrollability
    window.addEventListener("resize", handleScroll);

    // When the page content changes (filter/search/loading), scrollHeight can change
    // without a scroll/resize event firing. Observe DOM mutations (lightweight) and re-evaluate.
    const mutationObserver = new MutationObserver(() => handleScroll());
    mutationObserver.observe(scrollContainer, { childList: true });

    handleScroll(); // Initial call

    return () => {
      scrollContainer.removeEventListener("scroll", handleScroll);
      window.removeEventListener("resize", handleScroll);
      mutationObserver.disconnect();
      if (rafRef.current) {
        cancelAnimationFrame(rafRef.current);
      }
    };
  }, [isMobile, COLLAPSE_START, COLLAPSE_RANGE, scrollContainerRef, onScrollStateChange]);

  return (
    <header
      className="sticky top-0 z-10 bg-white/90 backdrop-blur-md border-b border-slate-100 transition-shadow duration-200"
      style={{
        paddingTop: isMobile ? `${1 - scrollProgress * 0.4}rem` : '1rem',
        paddingBottom: isMobile ? `${1 - scrollProgress * 0.4}rem` : '1rem',
        paddingLeft: '1rem',
        paddingRight: '1rem',
        boxShadow: `0 ${1 + scrollProgress * 2}px ${4 + scrollProgress * 8}px -1px rgb(0 0 0 / ${0.1 + scrollProgress * 0.05})`,
      }}
    >
      <div className="max-w-6xl mx-auto">
        {/* Desktop Layout */}
        <div className="hidden md:flex flex-wrap items-center justify-between gap-4 md:gap-6">
          <div className="flex items-center gap-3 md:gap-4 w-full md:w-auto">
            {showBackButton && onBackClick && (
              <button
                onClick={onBackClick}
                aria-label={backAriaLabel}
                className="size-10 rounded-xl bg-slate-100 text-text-main flex items-center justify-center hover:bg-slate-200 transition-colors"
              >
                <span className="material-symbols-outlined">{isRTL ? "arrow_forward" : "arrow_back"}</span>
              </button>
            )}

            <h2 className="text-2xl font-bold text-text-main">{title}</h2>
            {badge && (
              <div className="bg-primary-soft text-primary px-3 py-1 rounded-full text-xs font-bold border border-primary/10">
                {badge}
              </div>
            )}
          </div>

          <div className="flex items-center gap-3">
            <UnifiedSearch
              value={searchValue}
              onChange={onSearchChange}
              placeholder={searchPlaceholder}
              expandedWidth="w-80"
            />
            {primaryAction && (
              <button
                onClick={primaryAction.onClick}
                className="bg-primary text-white px-6 py-2.5 rounded-full font-bold text-sm flex items-center gap-2 hover:bg-green-600 hover:scale-105 transition-all duration-200 shadow-md shadow-primary/20 shrink-0 transform active:scale-95"
              >
                {primaryAction.icon.startsWith('http') ? (
                  <img src={primaryAction.icon} alt="" className="size-5 object-contain brightness-0 invert" />
                ) : (
                  <span className="material-symbols-outlined text-[20px]">{primaryAction.icon}</span>
                )}
                <span>{primaryAction.label}</span>
              </button>
            )}
          </div>
        </div>

        {/* Mobile Layout - Scroll-linked (no DOM swap to avoid flicker/jitter) */}
        <div className="md:hidden">
          <div
            style={{
              willChange: "transform, opacity",
              transform: `translateY(${scrollProgress * -8}px)`,
            }}
          >
            {/* Header Row */}
            <div className="flex items-center justify-between gap-3" style={{ marginBottom: `${12 * (1 - scrollProgress)}px` }}>
              <div className="flex items-center gap-3 min-w-0 flex-1">
                {showBackButton && onBackClick && (
                  <button
                    onClick={onBackClick}
                    aria-label={backAriaLabel}
                    className="border border-slate-100 text-slate-600 bg-white hover:bg-slate-50 flex items-center justify-center shrink-0 transition-colors duration-200"
                    style={{
                      width: `${40 - scrollProgress * 8}px`,
                      height: `${40 - scrollProgress * 8}px`,
                      borderRadius: `${16 - scrollProgress * 6}px`,
                    }}
                  >
                    <span
                      className="material-symbols-outlined"
                      style={{ fontSize: `${24 - scrollProgress * 6}px` }}
                    >
                      {isRTL ? "arrow_forward" : "arrow_back"}
                    </span>
                  </button>
                )}

                <button
                  onClick={onMenuClick}
                  className="border border-slate-100 text-slate-600 bg-white hover:bg-slate-50 flex items-center justify-center shrink-0 transition-colors duration-200"
                  style={{
                    width: `${40 - scrollProgress * 8}px`,
                    height: `${40 - scrollProgress * 8}px`,
                    borderRadius: `${16 - scrollProgress * 6}px`,
                  }}
                >
                  <span
                    className="material-symbols-outlined"
                    style={{ fontSize: `${24 - scrollProgress * 6}px` }}
                  >
                    menu
                  </span>
                </button>

                <h2
                  className="font-bold text-text-main truncate min-w-0"
                  style={{
                    fontSize: `${24 - scrollProgress * 6}px`,
                    lineHeight: 1.2,
                  }}
                >
                  {title}
                </h2>

                {badge && (
                  <div
                    className="bg-primary-soft text-primary rounded-full text-xs font-bold border border-primary/10 shrink-0 whitespace-nowrap"
                    style={{
                      paddingLeft: `${12 - scrollProgress * 4}px`,
                      paddingRight: `${12 - scrollProgress * 4}px`,
                      paddingTop: `${4 - scrollProgress * 2}px`,
                      paddingBottom: `${4 - scrollProgress * 2}px`,
                      transform: `scale(${1 - scrollProgress * 0.12})`,
                      transformOrigin: "right center",
                    }}
                  >
                    {badge}
                  </div>
                )}
              </div>

              {/* Primary action hidden on mobile; use FAB instead */}
            </div>

            {/* Search Row (collapses smoothly) */}
            <div
              style={{
                overflow: "hidden",
                maxHeight: `${56 * (1 - scrollProgress)}px`,
                opacity: 1 - scrollProgress * 1.2,
                pointerEvents: scrollProgress > 0.85 ? "none" : "auto",
                transform: `translateY(${scrollProgress * -6}px)`,
                willChange: "max-height, opacity, transform",
              }}
            >
              <UnifiedSearch
                value={searchValue}
                onChange={onSearchChange}
                placeholder={searchPlaceholder}
                expandedWidth="w-full"
              />
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}