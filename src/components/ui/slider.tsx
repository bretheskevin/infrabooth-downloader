import * as React from "react"
import * as SliderPrimitive from "@radix-ui/react-slider"

import { cn } from "@/lib/utils"

const Slider = React.forwardRef<
  React.ElementRef<typeof SliderPrimitive.Root>,
  React.ComponentPropsWithoutRef<typeof SliderPrimitive.Root>
>(({ className, "aria-label": ariaLabel, orientation, ...props }, ref) => {
  const isVertical = orientation === "vertical"
  return (
    <SliderPrimitive.Root
      ref={ref}
      orientation={orientation}
      className={cn(
        "relative flex touch-none select-none cursor-pointer",
        isVertical ? "flex-col h-full w-4 items-center" : "w-full items-center",
        className
      )}
      {...props}
    >
      <SliderPrimitive.Track className={cn(
        "relative grow overflow-hidden rounded-full bg-primary/20",
        isVertical ? "w-1.5 h-full" : "h-1.5 w-full"
      )}>
        <SliderPrimitive.Range className={cn("absolute bg-primary", isVertical ? "w-full" : "h-full")} />
      </SliderPrimitive.Track>
      <SliderPrimitive.Thumb aria-label={ariaLabel} className="block h-4 w-4 rounded-full border border-primary/50 bg-background shadow transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50" />
    </SliderPrimitive.Root>
  )
})
Slider.displayName = SliderPrimitive.Root.displayName

export { Slider }
