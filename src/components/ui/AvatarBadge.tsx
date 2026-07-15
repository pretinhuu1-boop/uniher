import * as React from "react";
import Image from "next/image";
import { cn } from "@/lib/utils";

/** ─── BADGE ─── */
export type CanonicalBadgeVariant = 'neutral' | 'positive' | 'warning' | 'critical' | 'info';
type LegacyBadgeVariant = 'primary' | 'secondary' | 'gold' | 'outline' | 'alert' | 'success';

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: CanonicalBadgeVariant | LegacyBadgeVariant;
  size?: 'sm' | 'md' | 'lg';
}

const canonicalBadgeVariant: Record<LegacyBadgeVariant, CanonicalBadgeVariant> = {
  primary: 'info',
  secondary: 'neutral',
  gold: 'warning',
  outline: 'neutral',
  alert: 'critical',
  success: 'positive',
};

export const Badge = React.forwardRef<HTMLSpanElement, BadgeProps>(
  ({ className, variant = 'neutral', size = 'md', ...props }, ref) => {
    const resolvedVariant = variant in canonicalBadgeVariant
      ? canonicalBadgeVariant[variant as LegacyBadgeVariant]
      : variant as CanonicalBadgeVariant;
    const variants = {
      neutral: "bg-[var(--platform-group)] text-[var(--platform-ink)]",
      positive: "border border-[var(--platform-positive)] bg-[var(--platform-surface)] text-[var(--platform-positive)]",
      warning: "border border-[var(--platform-warning)] bg-[var(--platform-surface)] text-[var(--platform-warning)]",
      critical: "bg-[var(--platform-critical)] text-[var(--platform-surface)]",
      info: "bg-[var(--platform-action)] text-[var(--platform-shell)]",
    };

    const sizes = {
      sm: "px-2 py-0.5 text-[10px] font-bold tracking-wider",
      md: "px-3 py-1 text-xs font-semibold tracking-wide",
      lg: "px-4 py-2 text-sm font-bold tracking-tight",
    };

    return (
      <span
        ref={ref}
        className={cn(
          "inline-flex items-center justify-center rounded-full transition-all duration-200",
          variants[resolvedVariant],
          sizes[size],
          className
        )}
        {...props}
        data-variant={resolvedVariant}
      />
    );
  }
);
Badge.displayName = "Badge";

/** ─── AVATAR ─── */
interface AvatarProps extends React.HTMLAttributes<HTMLDivElement> {
  src?: string;
  alt?: string;
  fallback?: string;
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
}

export const Avatar = React.forwardRef<HTMLDivElement, AvatarProps>(
  ({ className, src, alt, fallback, size = 'md', ...props }, ref) => {
    const sizes = {
      xs: "h-6 w-6 text-[10px]",
      sm: "h-8 w-8 text-xs",
      md: "h-11 w-11 text-sm font-medium",
      lg: "h-16 w-16 text-xl font-bold",
      xl: "h-24 w-24 text-3xl font-extrabold",
    };

    return (
      <div
        ref={ref}
        className={cn(
          "relative flex shrink-0 overflow-hidden rounded-full border-2 border-white shadow-sm bg-cream-200 items-center justify-center text-rose-700 select-none",
          sizes[size],
          className
        )}
        {...props}
      >
        {src ? (
          <Image src={src} alt={alt || ''} fill className="object-cover" unoptimized />
        ) : (
          <span suppressHydrationWarning>{fallback || '?'}</span>
        )}
      </div>
    );
  }
);
Avatar.displayName = "Avatar";
