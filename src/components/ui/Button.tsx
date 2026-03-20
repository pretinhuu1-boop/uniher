import * as React from "react";
import { cn } from "@/lib/utils";

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'gold';
  size?: 'sm' | 'md' | 'lg' | 'icon';
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = 'primary', size = 'md', ...props }, ref) => {
    const variants = {
      primary: "bg-rose-500 text-white hover:bg-rose-700 shadow-sm",
      secondary: "bg-uni-green text-white hover:opacity-90",
      outline: "border-2 border-rose-500 text-rose-500 hover:bg-rose-50",
      ghost: "text-uni-text-600 hover:bg-cream-100",
      gold: "bg-gold-700 text-white hover:bg-gold-500 shadow-sm",
    };

    const sizes = {
      sm: "h-9 px-3 text-sm",
      md: "h-11 px-6 text-base",
      lg: "h-14 px-8 text-lg font-semibold",
      icon: "h-10 w-10 flex items-center justify-center p-0",
    };

    return (
      <button
        ref={ref}
        className={cn(
          "inline-flex items-center justify-center rounded-md transition-all active:scale-[0.98] disabled:opacity-50 disabled:pointer-events-none duration-200",
          variants[variant],
          sizes[size],
          className
        )}
        {...props}
      />
    );
  }
);
Button.displayName = "Button";

export { Button };
