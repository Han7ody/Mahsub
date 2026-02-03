"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useBodyScrollLock } from "@/lib/use-body-scroll-lock";
import { getSignedUrl } from "@/lib/storage";

interface ReceiptViewerProps {
  isOpen: boolean;
  onClose: () => void;
  receiptUrl: string | null;
  receiptPath?: string; // Storage path for generating download URLs
  receiptType?: "image" | "pdf" | "unknown";
  title?: string;
}

type ViewerState = "loading" | "loaded" | "error" | "empty";

function detectReceiptType(url: string): "image" | "pdf" | "unknown" {
  const lower = url.toLowerCase();
  if (lower.match(/\.(jpg|jpeg|png|gif|webp|bmp|svg)(\?|$)/)) return "image";
  if (lower.match(/\.pdf(\?|$)/)) return "pdf";
  if (lower.includes("image/")) return "image";
  if (lower.includes("application/pdf")) return "pdf";
  return "unknown";
}

export default function ReceiptViewer({
  isOpen,
  onClose,
  receiptUrl,
  receiptPath,
  receiptType,
  title = "الإيصال",
}: ReceiptViewerProps) {
  const [state, setState] = useState<ViewerState>("loading");
  const [isMobile, setIsMobile] = useState(false);
  const [isClosing, setIsClosing] = useState(false);
  const [zoom, setZoom] = useState(1);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [sheetDragY, setSheetDragY] = useState(0);
  const [isSheetDragging, setIsSheetDragging] = useState(false);
  const [actualReceiptUrl, setActualReceiptUrl] = useState<string | null>(receiptUrl);
  const imageRef = useRef<HTMLImageElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const type = receiptType || (actualReceiptUrl ? detectReceiptType(actualReceiptUrl) : "unknown");

  useBodyScrollLock(isOpen);

  // Generate signed URL if we have a path but no URL
  useEffect(() => {
    if (isOpen && receiptPath && !receiptUrl) {
      setState("loading");
      getSignedUrl('receipts', receiptPath).then(({ signedUrl, error }) => {
        if (signedUrl && !error) {
          setActualReceiptUrl(signedUrl);
        } else {
          console.error('Failed to generate signed URL for receipt:', error);
          setState("error");
        }
      });
    } else if (isOpen) {
      setActualReceiptUrl(receiptUrl);
    }
  }, [isOpen, receiptUrl, receiptPath]);

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile();
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  useEffect(() => {
    if (isOpen) {
      setIsClosing(false);
      setZoom(1);
      setPosition({ x: 0, y: 0 });
      setSheetDragY(0);
      setIsSheetDragging(false);
      setState(!actualReceiptUrl && !receiptPath ? "empty" : "loading");
    }
  }, [isOpen, actualReceiptUrl, receiptPath]);

  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen) handleClose();
    };
    window.addEventListener("keydown", handleEsc);
    return () => window.removeEventListener("keydown", handleEsc);
  }, [isOpen]);

  const handleClose = useCallback(() => {
    setIsClosing(true);
    setTimeout(() => {
      setIsClosing(false);
      onClose();
    }, 300);
  }, [onClose]);

  const handleImageLoad = () => setState("loaded");
  const handleImageError = () => setState("error");

  const handleZoomIn = () => setZoom((z) => Math.min(z + 0.5, 4));
  const handleZoomOut = () => {
    setZoom((z) => {
      const newZoom = Math.max(z - 0.5, 1);
      if (newZoom === 1) setPosition({ x: 0, y: 0 });
      return newZoom;
    });
  };
  const handleResetZoom = () => {
    setZoom(1);
    setPosition({ x: 0, y: 0 });
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    if (zoom > 1) {
      setIsDragging(true);
      setDragStart({ x: e.clientX - position.x, y: e.clientY - position.y });
    }
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (isDragging && zoom > 1) {
      setPosition({ x: e.clientX - dragStart.x, y: e.clientY - dragStart.y });
    }
  };

  const handleMouseUp = () => setIsDragging(false);

  const handleTouchStart = (e: React.TouchEvent) => {
    if (zoom > 1 && e.touches.length === 1) {
      setIsDragging(true);
      setDragStart({
        x: e.touches[0].clientX - position.x,
        y: e.touches[0].clientY - position.y,
      });
    }
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (isDragging && zoom > 1 && e.touches.length === 1) {
      setPosition({
        x: e.touches[0].clientX - dragStart.x,
        y: e.touches[0].clientY - dragStart.y,
      });
    }
  };

  const handleTouchEnd = () => setIsDragging(false);

  const handleSheetTouchStart = (e: React.TouchEvent) => {
    setIsSheetDragging(true);
    setDragStart({ x: 0, y: e.touches[0].clientY });
  };

  const handleSheetTouchMove = (e: React.TouchEvent) => {
    if (!isSheetDragging) return;
    const deltaY = e.touches[0].clientY - dragStart.y;
    if (deltaY > 0) setSheetDragY(deltaY);
  };

  const handleSheetTouchEnd = () => {
    setIsSheetDragging(false);
    if (sheetDragY > 100) {
      handleClose();
    } else {
      setSheetDragY(0);
    }
  };

  const openInNewTab = () => {
    if (actualReceiptUrl) window.open(actualReceiptUrl, "_blank");
  };

  const handleDownload = async () => {
    if (!receiptPath) {
      // Fallback if no path is available
      if (actualReceiptUrl) window.open(actualReceiptUrl, '_blank');
      return;
    }
    
    try {
      // Get a signed URL with download flag set to true
      const { signedUrl, error } = await getSignedUrl('receipts', receiptPath, 3600, true);
      
      if (error || !signedUrl) {
        console.error('Failed to generate download URL:', error);
        // Fallback to opening in new tab
        if (actualReceiptUrl) window.open(actualReceiptUrl, '_blank');
        return;
      }
      
      // Open the download URL which will have Content-Disposition: attachment
      window.open(signedUrl, '_blank');
    } catch (error) {
      console.error('Failed to download receipt:', error);
      if (actualReceiptUrl) window.open(actualReceiptUrl, '_blank');
    }
  };

  if (!isOpen) return null;

  const renderContent = () => {
    if (state === "empty") {
      return (
        <div className="flex flex-col items-center justify-center min-h-[300px] text-center p-6">
          <span className="material-symbols-outlined text-5xl text-slate-300 dark:text-slate-600 mb-4">receipt_long</span>
          <p className="text-slate-500 dark:text-slate-400 font-medium">لا يوجد إيصال لهذه المعاملة</p>
        </div>
      );
    }

    if (state === "error") {
      return (
        <div className="flex flex-col items-center justify-center min-h-[300px] text-center p-6">
          <span className="material-symbols-outlined text-5xl text-red-300 dark:text-red-500/50 mb-4">error_outline</span>
          <p className="text-slate-600 dark:text-slate-300 font-bold mb-2">تعذر عرض الإيصال</p>
          <p className="text-slate-500 dark:text-slate-400 text-sm mb-4">حدث خطأ أثناء تحميل الإيصال</p>
          <button onClick={openInNewTab} className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-xl font-bold text-sm hover:bg-green-600 transition-colors">
            <span className="material-symbols-outlined text-lg">open_in_new</span>
            فتح الإيصال في نافذة جديدة
          </button>
        </div>
      );
    }

    if (type === "image" || type === "unknown") {
      return (
        <div
          ref={containerRef}
          className="w-full bg-slate-100 dark:bg-slate-800"
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
          style={{ cursor: zoom > 1 ? (isDragging ? "grabbing" : "grab") : "default" }}
        >
          {state === "loading" && (
            <div className="flex items-center justify-center bg-slate-100 dark:bg-slate-800 min-h-[300px]">
              <div className="flex flex-col items-center gap-3">
                <span className="material-symbols-outlined text-4xl text-slate-400 animate-pulse">image</span>
                <p className="text-slate-500 dark:text-slate-400 text-sm font-medium">جاري تحميل الإيصال...</p>
              </div>
            </div>
          )}
          <img
            ref={imageRef}
            src={actualReceiptUrl || ""}
            alt="الإيصال"
            onLoad={handleImageLoad}
            onError={handleImageError}
            className="w-full h-auto block select-none"
            style={{
              transform: zoom > 1 ? `scale(${zoom}) translate(${position.x / zoom}px, ${position.y / zoom}px)` : undefined,
              opacity: state === "loaded" ? 1 : 0,
              display: state === "loading" ? "none" : "block",
            }}
            draggable={false}
          />
        </div>
      );
    }

    if (type === "pdf") {
      return (
        <div className="relative flex-1 bg-slate-100 dark:bg-slate-800 min-h-[400px] md:min-h-[500px]">
          {state === "loading" && (
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="flex flex-col items-center gap-3">
                <span className="material-symbols-outlined text-4xl text-slate-400 animate-pulse">picture_as_pdf</span>
                <p className="text-slate-500 dark:text-slate-400 text-sm font-medium">جاري تحميل الملف...</p>
              </div>
            </div>
          )}
          <iframe src={actualReceiptUrl || ""} className="w-full h-full border-0" onLoad={() => setState("loaded")} onError={() => setState("error")} title="عرض الإيصال" />
        </div>
      );
    }

    return null;
  };

  const renderZoomControls = () => {
    if ((type !== "image" && type !== "unknown") || state !== "loaded") return null;
    return (
      <div className="flex items-center gap-1 bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-1 shadow-sm">
        <button onClick={handleZoomOut} disabled={zoom <= 1} className="size-8 flex items-center justify-center rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 disabled:opacity-40 disabled:cursor-not-allowed transition-colors" title="تصغير">
          <span className="material-symbols-outlined text-lg">remove</span>
        </button>
        <button onClick={handleResetZoom} className="px-2 h-8 flex items-center justify-center rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 text-xs font-bold min-w-[40px] transition-colors" title="إعادة تعيين">
          {Math.round(zoom * 100)}%
        </button>
        <button onClick={handleZoomIn} disabled={zoom >= 4} className="size-8 flex items-center justify-center rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 disabled:opacity-40 disabled:cursor-not-allowed transition-colors" title="تكبير">
          <span className="material-symbols-outlined text-lg">add</span>
        </button>
      </div>
    );
  };

  // Desktop Modal
  if (!isMobile) {
    return (
      <div
        className={`fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm transition-opacity duration-300 ${isClosing ? "opacity-0" : "opacity-100"}`}
        onClick={handleClose}
      >
        <div
          className={`bg-white dark:bg-slate-900 w-full max-w-2xl rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 transition-all duration-300 flex flex-col ${isClosing ? "scale-95 opacity-0" : "scale-100 opacity-100"}`}
          style={{ maxHeight: '85vh' }}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center justify-between p-4 md:p-6 border-b border-slate-100 dark:border-slate-800 flex-shrink-0">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
                <span className="material-symbols-outlined text-xl">receipt_long</span>
              </div>
              <h2 className="text-lg font-bold text-slate-900 dark:text-white">{title}</h2>
            </div>
            <div className="flex items-center gap-2">
              {renderZoomControls()}
              {actualReceiptUrl && state === "loaded" && (
                <>
                  <button onClick={handleDownload} className="size-9 flex items-center justify-center rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 dark:text-slate-400 transition-colors" title="تحميل الإيصال">
                    <span className="material-symbols-outlined text-lg">download</span>
                  </button>
                  <button onClick={openInNewTab} className="size-9 flex items-center justify-center rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 dark:text-slate-400 transition-colors" title="فتح في نافذة جديدة">
                    <span className="material-symbols-outlined text-lg">open_in_new</span>
                  </button>
                </>
              )}
              <button onClick={handleClose} className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors">
                <span className="material-symbols-outlined text-lg">close</span>
                <span className="text-sm font-bold">إغلاق</span>
              </button>
            </div>
          </div>

          {/* Content - scrollable */}
          <div className="flex-1 overflow-y-auto" style={{ minHeight: 0 }}>
            {renderContent()}
          </div>
        </div>
      </div>
    );
  }

  // Mobile Bottom Sheet
  return (
    <div
      className={`fixed inset-0 z-[60] bg-black/40 backdrop-blur-sm transition-opacity duration-300 ${isClosing ? "opacity-0" : "opacity-100"}`}
      style={{ opacity: isClosing ? 0 : Math.max(0.4, 1 - sheetDragY / 300) }}
      onClick={handleClose}
    >
      <div
        className={`absolute bottom-0 left-0 right-0 bg-white dark:bg-slate-900 rounded-t-3xl shadow-2xl flex flex-col max-h-[90vh] ${isSheetDragging ? "" : "transition-transform duration-300"} ${isClosing ? "translate-y-full" : ""}`}
        style={{ transform: isClosing ? "translateY(100%)" : `translateY(${sheetDragY}px)` }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Drag Handle */}
        <div className="flex justify-center pt-3 pb-1 flex-shrink-0 cursor-grab active:cursor-grabbing touch-none" onTouchStart={handleSheetTouchStart} onTouchMove={handleSheetTouchMove} onTouchEnd={handleSheetTouchEnd}>
          <div className="w-10 h-1 bg-slate-300 dark:bg-slate-600 rounded-full" />
        </div>

        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-slate-100 dark:border-slate-800 flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
              <span className="material-symbols-outlined text-xl">receipt_long</span>
            </div>
            <h2 className="text-lg font-bold text-slate-900 dark:text-white">{title}</h2>
          </div>
          <div className="flex items-center gap-2">
            {actualReceiptUrl && state === "loaded" && (
              <>
                <button onClick={handleDownload} className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 text-sm font-bold">
                  <span className="material-symbols-outlined text-lg">download</span>
                  تحميل
                </button>
                <button onClick={openInNewTab} className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 text-sm font-bold">
                  <span className="material-symbols-outlined text-lg">open_in_new</span>
                  فتح
                </button>
              </>
            )}
            <button onClick={handleClose} aria-label="إغلاق" className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
              <span className="material-symbols-outlined text-lg">close</span>
            </button>
          </div>
        </div>

        {/* Zoom Controls (mobile) */}
        {(type === "image" || type === "unknown") && state === "loaded" && (
          <div className="flex items-center justify-center gap-2 px-5 py-3 border-b border-slate-100 dark:border-slate-800 flex-shrink-0">
            {renderZoomControls()}
          </div>
        )}

        {/* Content */}
        <div className="flex-1 overflow-y-auto" style={{ minHeight: 0 }}>{renderContent()}</div>

        {/* Safe area padding for iOS */}
        <div className="pb-6 bg-white dark:bg-slate-900 flex-shrink-0" />
      </div>
    </div>
  );
}
