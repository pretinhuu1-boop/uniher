import * as React from "react";
import { cn } from "@/lib/utils";

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'gold' | 'danger';
  size?: 'sm' | 'md' | 'lg' | 'icon';
  isLoading?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ children, className, disabled, isLoading = false, variant = 'primary', size = 'md', ...props }, ref) => {
    const primaryVariant = "bg-[var(--platform-action)] text-[var(--platform-shell)] hover:bg-[var(--platform-action-strong)]";
    const secondaryVariant = "border border-[var(--platform-line)] bg-[var(--platform-surface)] text-[var(--platform-ink)] hover:bg-[var(--platform-group)]";
    const variants = {
      primary: primaryVariant,
      secondary: secondaryVariant,
      outline: secondaryVariant,
      ghost: "bg-transparent text-[var(--platform-ink)] hover:bg-[var(--platform-group)]",
      gold: primaryVariant,
      danger: "bg-[var(--platform-critical)] text-[var(--platform-surface)] hover:opacity-90",
    };

    const sizes = {
      sm: "h-11 px-3 text-sm",
      md: "h-11 px-6 text-base",
      lg: "h-14 px-8 text-lg font-semibold",
      icon: "h-11 w-11 flex items-center justify-center p-0",
    };

    return (
      <button
        ref={ref}
        className={cn(
          "inline-flex min-h-11 min-w-11 items-center justify-center rounded-[var(--platform-radius-control)] transition-colors duration-[var(--platform-duration-fast)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--platform-action)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--platform-surface)] disabled:pointer-events-none disabled:opacity-50",
          variants[variant],
          sizes[size],
          className
        )}
        {...props}
        aria-busy={isLoading || undefined}
        disabled={disabled || isLoading}
      >
        {isLoading ? 'Salvando…' : children}
      </button>
    );
  }
);
Button.displayName = "Button";

export { Button };
