import * as React from "react";
import { cn } from "@/lib/utils";

/** ─── SKELETON ─── */
export function Skeleton({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn("animate-pulse rounded-md bg-cream-200/50", className)}
      {...props}
    />
  );
}

/** ─── MODAL (Simple) ─── */
interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
  className?: string;
}

export function Modal({ isOpen, onClose, title, children, className }: ModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-rose-700/20 backdrop-blur-sm animate-fadeIn" 
        onClick={onClose}
      />
      
      {/* Content */}
      <div className={cn(
        "relative bg-white rounded-lg shadow-xl w-full max-w-lg overflow-hidden animate-scaleIn border border-border-2",
        className
      )}>
        {/* Header */}
        {title && (
          <div className="px-6 py-4 border-b border-border-1 flex items-center justify-between">
            <h3 className="text-xl font-display font-semibold text-uni-text-900">{title}</h3>
            <button 
              onClick={onClose}
              className="p-1 rounded-full hover:bg-cream-100 transition-colors text-uni-text-400 hover:text-rose-700"
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                <path d="M18 6L6 18M6 6l12 12" />
              </svg>
            </button>
          </div>
        )}
        
        {/* Body */}
        <div className="p-6">
          {children}
        </div>
      </div>
    </div>
  );
}
