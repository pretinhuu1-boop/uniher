import * as React from "react";
import { cn } from "@/lib/utils";

/** ─── BADGE ─── */
interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: 'primary' | 'secondary' | 'gold' | 'outline' | 'alert' | 'success';
  size?: 'sm' | 'md' | 'lg';
}

export const Badge = React.forwardRef<HTMLSpanElement, BadgeProps>(
  ({ className, variant = 'primary', size = 'md', ...props }, ref) => {
    const variants = {
      primary: "bg-rose-100 text-rose-700",
      secondary: "bg-cream-200 text-uni-text-900 border-border-2",
      gold: "bg-gold-50 text-gold-700 border border-gold-200",
      outline: "border-2 border-border-2 text-uni-text-600",
      alert: "bg-rose-500 text-white shadow-sm",
      success: "bg-uni-green/10 text-uni-green border border-uni-green/20",
    };

    const sizes = {
      sm: "px-2 py-0.5 text-[10px] font-bold tracking-wider uppercase",
      md: "px-3 py-1 text-xs font-semibold tracking-wide",
      lg: "px-4 py-2 text-sm font-bold tracking-tight",
    };

    return (
      <span
        ref={ref}
        className={cn(
          "inline-flex items-center justify-center rounded-full transition-all duration-200",
          variants[variant],
          sizes[size],
          className
        )}
        {...props}
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
          <img src={src} alt={alt} className="aspect-square h-full w-full object-cover" />
        ) : (
          <span suppressHydrationWarning>{fallback || '?'}</span>
        )}
      </div>
    );
  }
);
Avatar.displayName = "Avatar";
