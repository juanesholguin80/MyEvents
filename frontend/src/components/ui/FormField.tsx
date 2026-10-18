import { useId } from "react";
import type { ReactElement } from "react";
import { cn } from "@/lib/cn";

interface FormFieldProps {
  label: string;
  error?: string;
  children: (fieldProps: { id: string; "aria-describedby"?: string }) => ReactElement;
  className?: string;
}

export function FormField({ label, error, children, className }: FormFieldProps) {
  const id = useId();
  const errorId = `${id}-error`;

  return (
    <div className={cn("flex flex-col gap-1", className)}>
      <label htmlFor={id} className="text-sm font-medium text-gray-900">
        {label}
      </label>
      {children({ id, "aria-describedby": error ? errorId : undefined })}
      {error ? (
        <p id={errorId} className="text-sm text-red-600">
          {error}
        </p>
      ) : null}
    </div>
  );
}
