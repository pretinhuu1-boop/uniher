import * as React from "react";
import { cn } from "@/lib/utils";

export interface InputProps
  extends React.InputHTMLAttributes<HTMLInputElement> {
  error?: string;
  label?: string;
  description?: string;
}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({
    'aria-describedby': ariaDescribedBy,
    'aria-invalid': ariaInvalid,
    className,
    description,
    error,
    label,
    id,
    ...props
  }, ref) => {
    const generatedId = React.useId().replace(/:/g, '');
    const inputId = id || `input-${generatedId}`;
    const descriptionId = `${inputId}-description`;
    const errorId = `${inputId}-error`;
    const describedBy = [
      ariaDescribedBy,
      description ? descriptionId : undefined,
      error ? errorId : undefined,
    ].filter(Boolean).join(' ') || undefined;

    return (
      <div className="w-full space-y-2">
        {label && (
          <label htmlFor={inputId} className="block pl-1 text-sm font-medium text-[var(--platform-muted)]">
            {label}
          </label>
        )}
        <input
          ref={ref}
          id={inputId}
          className={cn(
            "flex h-11 w-full rounded-[var(--platform-radius-control)] border border-[var(--platform-line)] bg-[var(--platform-surface)] px-4 py-2 text-base text-[var(--platform-ink)] placeholder:text-[var(--platform-muted)] transition-colors duration-[var(--platform-duration-fast)] focus-visible:border-[var(--platform-action)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--platform-action)] focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50",
            error && "border-[var(--platform-critical)] focus-visible:border-[var(--platform-critical)] focus-visible:ring-[var(--platform-critical)]",
            className
          )}
          {...props}
          aria-describedby={describedBy}
          aria-invalid={error ? true : ariaInvalid}
        />
        {description && (
          <p id={descriptionId} className="pl-1 text-xs text-[var(--platform-muted)]">
            {description}
          </p>
        )}
        {error && (
          <p id={errorId} className="pl-1 text-xs font-medium text-[var(--platform-critical)]">{error}</p>
        )}
      </div>
    );
  }
);
Input.displayName = "Input";

export { Input };
