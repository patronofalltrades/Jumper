import * as React from "react";
import { Slot } from "radix-ui";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

// Chunky press-down buttons from the prototype: a thick bottom border that collapses when pressed.
const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 rounded-xl border border-b-4 px-4 py-2.5 text-sm font-semibold whitespace-nowrap transition-[transform,border] outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background active:translate-y-0.5 active:border-b-2 disabled:pointer-events-none disabled:opacity-50",
  {
    variants: {
      variant: {
        default: "border-primary-deep bg-primary text-primary-foreground",
        outline: "border-border bg-card text-foreground",
        destructive: "border-black/25 bg-destructive text-white dark:text-black",
        link: "border-0 px-0 text-primary underline underline-offset-4 active:translate-y-0",
      },
    },
    defaultVariants: { variant: "default" },
  },
);

function Button({
  className,
  variant,
  asChild = false,
  ...props
}: React.ComponentProps<"button"> & VariantProps<typeof buttonVariants> & { asChild?: boolean }) {
  const Comp = asChild ? Slot.Root : "button";
  return <Comp data-slot="button" className={cn(buttonVariants({ variant, className }))} {...props} />;
}

export { Button, buttonVariants };
