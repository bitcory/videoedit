import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@/lib/utils"

const defaultInnerSize = {
  default: "px-4 py-2 text-sm",
  sm: "px-3 py-1.5 text-xs",
  lg: "px-8 py-2.5",
  icon: "p-2",
}

const buttonVariants = cva(
  "inline-flex items-center justify-center whitespace-nowrap text-sm font-semibold rounded-lg transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50 disabled:pointer-events-none disabled:opacity-50",
  {
    variants: {
      variant: {
        default: "",
        destructive:
          "bg-destructive text-destructive-foreground shadow-lg shadow-red-500/20 hover:shadow-xl hover:shadow-red-500/25 hover:scale-[1.02] active:scale-[0.98]",
        outline:
          "border border-white/[0.20] bg-white/[0.08] text-foreground hover:bg-white/[0.14] hover:border-white/[0.30] active:scale-[0.98]",
        secondary:
          "bg-secondary text-secondary-foreground border border-white/[0.08] hover:bg-secondary/80 hover:border-white/[0.14] active:scale-[0.98]",
        ghost: "text-foreground/70 hover:text-foreground hover:bg-white/[0.06] rounded-lg",
        link: "text-primary underline-offset-4 hover:underline",
      },
      size: {
        default: "h-10 px-4 py-2",
        sm: "h-9 px-3 text-xs",
        lg: "h-11 px-8",
        icon: "h-10 w-10",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, children, ...props }, ref) => {
    const Comp = asChild ? Slot : "button"
    const resolvedVariant = variant ?? 'default'
    const resolvedSize = size ?? 'default'

    // 그라디언트 글로우 버튼 (default variant)
    if (resolvedVariant === 'default' && !asChild) {
      return (
        <Comp
          className={cn(
            "group relative rounded-lg bg-gradient-to-br from-indigo-500 to-fuchsia-500 p-0.5 transition-all duration-300 hover:scale-110 active:scale-95 focus-visible:outline-none disabled:pointer-events-none disabled:opacity-50 btn-glow",
            className
          )}
          ref={ref}
          {...props}
        >
          <span
            className={cn(
              "flex items-center justify-center gap-1.5 rounded-md bg-slate-950 font-semibold text-slate-100 transition-colors duration-300 group-hover:bg-slate-950/50 group-hover:text-white group-active:bg-slate-950/80",
              defaultInnerSize[resolvedSize]
            )}
          >
            {children}
          </span>
        </Comp>
      )
    }

    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      >
        {children}
      </Comp>
    )
  }
)
Button.displayName = "Button"

export { Button, buttonVariants }
