import * as React from "react";
import { cn } from "@/lib/utils";

interface ToastProps {
  message: string;
  type?: 'success' | 'error' | 'info';
  onClose: () => void;
}

export function Toast({ message, type = 'info', onClose }: ToastProps) {
  React.useEffect(() => {
    const timer = setTimeout(onClose, 5000);
    return () => clearTimeout(timer);
  }, [onClose]);

  const variants = {
    success: "bg-uni-green text-white border-none",
    error: "bg-rose-700 text-white border-none",
    info: "bg-white text-uni-text-900 border-border-2 shadow-xl",
  };

  const icons = {
    success: "✓",
    error: "✕",
    info: "ℹ",
  };

  return (
    <div className={cn(
      "fixed bottom-4 right-4 z-[100] flex items-center gap-3 px-5 py-4 rounded-lg shadow-2xl animate-fadeUp border pointer-events-auto min-w-[300px]",
      variants[type]
    )}>
      <span className="flex-shrink-0 w-6 h-6 flex items-center justify-center rounded-full bg-white/20 font-bold">
        {icons[type]}
      </span>
      <p className="flex-grow text-sm font-medium">{message}</p>
      <button 
        onClick={onClose}
        className="text-white/60 hover:text-white transition-colors"
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
          <path d="M18 6L6 18M6 6l12 12" />
        </svg>
      </button>
    </div>
  );
}
