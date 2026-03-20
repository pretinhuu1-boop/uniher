import * as React from "react";
import { cn } from "@/lib/utils";

export interface InputProps
  extends React.InputHTMLAttributes<HTMLInputElement> {
  error?: string;
  label?: string;
}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, error, label, ...props }, ref) => {
    return (
      <div className="w-full space-y-2">
        {label && (
          <label className="text-sm font-medium text-uni-text-600 block pl-1">
            {label}
          </label>
        )}
        <input
          ref={ref}
          className={cn(
            "flex h-11 w-full rounded-md border-2 border-border-1 bg-white px-4 py-2 text-base ring-offset-rose-50 placeholder:text-uni-text-300 focus-visible:outline-none focus-visible:border-rose-400 focus-visible:ring-1 focus-visible:ring-rose-300 disabled:cursor-not-allowed disabled:opacity-50 transition-all duration-200",
            error && "border-rose-700 focus-visible:border-rose-700 focus-visible:ring-rose-100",
            className
          )}
          {...props}
        />
        {error && (
          <p className="text-xs font-medium text-rose-700 pl-1 -mt-1">{error}</p>
        )}
      </div>
    );
  }
);
Input.displayName = "Input";

export { Input };
