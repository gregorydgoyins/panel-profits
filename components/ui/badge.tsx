import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center rounded-sm border px-2 py-0.5 text-[10px] font-mono font-medium uppercase tracking-wider transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
  {
    variants: {
      variant: {
        default:
          "border-cobalt-700 bg-cobalt-900/60 text-cobalt-200",
        secondary:
          "border-graphite-600 bg-graphite-800 text-graphite-200",
        destructive:
          "border-red-900 bg-red-950/60 text-red-300",
        outline:
          "border-graphite-600 text-graphite-300",
        copper:
          "border-copper-700 bg-copper-950/60 text-copper-300",
        plum:
          "border-plum-700 bg-plum-950/60 text-plum-300",
        success:
          "border-emerald-800 bg-emerald-950/60 text-emerald-300",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return (
    <div className={cn(badgeVariants({ variant }), className)} {...props} />
  );
}

export { Badge, badgeVariants };
