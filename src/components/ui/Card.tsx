import * as React from "react";
import { cn } from "@/lib/utils";

interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'default' | 'flat' | 'glossy' | 'outline';
}

const Card = React.forwardRef<HTMLDivElement, CardProps>(
  ({ className, variant = 'default', ...props }, ref) => {
    const variants = {
      default: "bg-white shadow-md border-border-1",
      flat: "bg-cream-100 border-none shadow-none",
      glossy: "bg-white/80 backdrop-blur-md shadow-xl border-border-2",
      outline: "bg-transparent border-2 border-border-1 shadow-sm",
    };

    return (
      <div
        ref={ref}
        className={cn(
          "rounded-md p-6 border transition-all duration-300",
          variants[variant],
          className
        )}
        {...props}
      />
    );
  }
);
Card.displayName = "Card";

export { Card };
