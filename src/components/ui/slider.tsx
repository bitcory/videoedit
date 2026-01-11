import * as React from "react"
import * as SliderPrimitive from "@radix-ui/react-slider"
import { cn } from "@/lib/utils"

const Slider = React.forwardRef<
  React.ElementRef<typeof SliderPrimitive.Root>,
  React.ComponentPropsWithoutRef<typeof SliderPrimitive.Root>
>(({ className, ...props }, ref) => (
  <SliderPrimitive.Root
    ref={ref}
    className={cn(
      "relative flex w-full touch-none select-none items-center",
      className
    )}
    {...props}
  >
    <SliderPrimitive.Track className="relative h-3 w-full grow overflow-hidden bg-white border-2 border-black">
      <SliderPrimitive.Range className="absolute h-full bg-[hsl(340,82%,59%)]" />
    </SliderPrimitive.Track>
    <SliderPrimitive.Thumb className="block h-5 w-5 bg-[hsl(45,100%,60%)] border-2 border-black shadow-[2px_2px_0_0_#000] transition-colors focus-visible:outline-none disabled:pointer-events-none disabled:opacity-50 hover:bg-[hsl(45,100%,70%)]" />
  </SliderPrimitive.Root>
))
Slider.displayName = SliderPrimitive.Root.displayName

export { Slider }
