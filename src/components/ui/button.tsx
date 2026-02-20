import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@/lib/utils"

const buttonVariants = cva(
  "inline-flex items-center justify-center whitespace-nowrap text-sm font-bold transition-all duration-100 focus-visible:outline-none disabled:pointer-events-none disabled:opacity-50 border border-white/20",
  {
    variants: {
      variant: {
        default: "bg-white text-black shadow-[2px_2px_0_0_rgba(255,255,255,0.15)] hover:shadow-[1px_1px_0_0_rgba(255,255,255,0.15)] hover:translate-x-[1px] hover:translate-y-[1px] active:shadow-none active:translate-x-[2px] active:translate-y-[2px]",
        destructive:
          "bg-[#333] text-white shadow-[2px_2px_0_0_rgba(255,255,255,0.15)] hover:shadow-[1px_1px_0_0_rgba(255,255,255,0.15)] hover:translate-x-[1px] hover:translate-y-[1px]",
        outline:
          "bg-[#1a1a1a] text-white shadow-[2px_2px_0_0_rgba(255,255,255,0.15)] hover:shadow-[1px_1px_0_0_rgba(255,255,255,0.15)] hover:translate-x-[1px] hover:translate-y-[1px] hover:bg-[#222]",
        secondary:
          "bg-[#222] text-white shadow-[2px_2px_0_0_rgba(255,255,255,0.15)] hover:shadow-[1px_1px_0_0_rgba(255,255,255,0.15)] hover:translate-x-[1px] hover:translate-y-[1px]",
        ghost: "text-white hover:bg-white/10 border-transparent",
        link: "text-white underline-offset-4 hover:underline border-transparent",
        memphis: "bg-white text-black shadow-[3px_3px_0_0_rgba(255,255,255,0.15)] hover:shadow-[1px_1px_0_0_rgba(255,255,255,0.15)] hover:translate-x-[2px] hover:translate-y-[2px] border-2 border-white/30",
      },
      size: {
        default: "h-10 px-4 py-2",
        sm: "h-9 px-3",
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
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button"
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    )
  }
)
Button.displayName = "Button"

export { Button, buttonVariants }
