import * as React from "react";
import { cn } from "@/lib/utils";

function Badge({ className, ...props }: React.ComponentProps<"span">) {
  return (
    <span
      data-slot="badge"
      className={cn(
        "inline-flex w-fit shrink-0 items-center rounded-full border border-probe/40 bg-probe/15 px-2.5 py-0.5 text-xs font-semibold whitespace-nowrap text-foreground",
        className,
      )}
      {...props}
    />
  );
}

export { Badge };
