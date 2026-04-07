import { type ButtonHTMLAttributes, forwardRef } from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
  // Base
  "inline-flex items-center justify-center gap-2 rounded-lg font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/50 disabled:opacity-50 disabled:cursor-not-allowed border select-none",
  {
    variants: {
      variant: {
        primary:
          "bg-brand text-surface-dark border-transparent hover:bg-brand-hover active:scale-[0.98]",
        secondary:
          "bg-white text-gray-800 border-gray-200 hover:bg-gray-50 hover:border-gray-300",
        danger:
          "bg-red-500 text-white border-transparent hover:bg-red-600",
        ghost:
          "bg-transparent text-gray-600 border-transparent hover:bg-gray-100 hover:text-gray-900",
        outline:
          "bg-transparent text-gray-700 border-gray-200 hover:bg-gray-50",
      },
      size: {
        sm:  "h-8  px-3   text-xs",
        md:  "h-9  px-4   text-sm",
        lg:  "h-10 px-5   text-sm",
        icon:"h-9  w-9    text-sm p-0",
      },
    },
    defaultVariants: { variant: "secondary", size: "md" },
  }
);

export interface ButtonProps
  extends ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {}

const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, ...props }, ref) => (
    <button
      ref={ref}
      className={cn(buttonVariants({ variant, size }), className)}
      {...props}
    />
  )
);
Button.displayName = "Button";

export { Button, buttonVariants };
