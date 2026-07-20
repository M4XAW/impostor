import * as React from "react"

import { cn } from "@/lib/utils"

const markerPositions = [
    "-left-1.25 -top-1.25",
    "-right-1.25 -top-1.25",
    "-bottom-1.25 -left-1.25",
    "-bottom-1.25 -right-1.25",
] as const

function CornerMarkers({
    className,
    markerClassName,
    ...props
}: React.ComponentProps<"div"> & { markerClassName?: string }) {
    return (
        <div
            aria-hidden="true"
            data-slot="corner-markers"
            className={cn("pointer-events-none absolute inset-0 z-20", className)}
            {...props}
        >
            {markerPositions.map((position) => (
                <span
                    key={position}
                    className={cn(
                        "absolute size-2.25 border border-dotted border-border bg-background",
                        position,
                        markerClassName
                    )}
                />
            ))}
        </div>
    )
}

export { CornerMarkers }
