import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium transition-colors",
  {
    variants: {
      variant: {
        default: "bg-gray-100 text-gray-800",
        vegetarian: "bg-green-100 text-green-800",
        vegan: "bg-emerald-100 text-emerald-800",
        glutenFree: "bg-amber-100 text-amber-800",
        dairyFree: "bg-blue-100 text-blue-800",
        nuts: "border border-red-300 bg-red-50 text-red-800",
        spicy: "bg-orange-100 text-orange-800",
        featured: "bg-primary/10 text-primary",
        status: "bg-gray-100 text-gray-700",
        success: "bg-green-100 text-green-800",
        warning: "bg-yellow-100 text-yellow-800",
        error: "bg-red-100 text-red-800",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLSpanElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return (
    <span className={cn(badgeVariants({ variant }), className)} {...props} />
  );
}

export const dietaryTagVariant: Record<string, "vegetarian" | "vegan" | "glutenFree" | "dairyFree" | "nuts"> = {
  V: "vegetarian",
  VG: "vegan",
  GF: "glutenFree",
  DF: "dairyFree",
  N: "nuts",
};

export const dietaryTagLabel: Record<string, string> = {
  V: "Vegetarian",
  VG: "Vegan",
  GF: "Gluten-Free",
  DF: "Dairy-Free",
  N: "Contains Nuts",
};

export { Badge, badgeVariants };
