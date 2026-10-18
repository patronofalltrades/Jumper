import type { ReactNode } from "react";
import { Label } from "@/components/ui/label";

/** The look of a text area or a select in the snapshot forms, the same as the Input component. */
export const boxClass =
  "w-full rounded-xl border border-input bg-card px-3 py-2 text-base outline-none placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/40 aria-invalid:border-destructive";

/** The props that tie a control to its message: the control is invalid, and it points to the message. */
export const invalid = (id: string, error?: string) => (error ? { "aria-invalid": true, "aria-describedby": `${id}-error` } : {});

/** A label, a control, and the message under it when the field is missing or not correct (issue #27). */
export function Field({ id, label, error, children }: { id: string; label: string; error?: string; children: ReactNode }) {
  return (
    <div className="flex flex-col gap-1.5">
      <Label htmlFor={id}>{label}</Label>
      {children}
      {error && (
        <p id={`${id}-error`} className="text-sm font-medium text-destructive">
          {error}
        </p>
      )}
    </div>
  );
}
