import { WarningDiamond } from "pixelarticons/react"

import { Badge } from "@/components/ui/badge"

interface TurnCountdownProps {
  secondsLeft: number
}

function TurnCountdown({ secondsLeft }: TurnCountdownProps) {
  const isEndingSoon = secondsLeft > 0 && secondsLeft <= 10
  const hasEnded = secondsLeft === 0
  const isUrgent = isEndingSoon || hasEnded

  return (
    <div
      className="flex min-w-24 flex-col items-end gap-1.5"
      role="timer"
      aria-label={`Temps restant : ${secondsLeft} seconde${secondsLeft > 1 ? "s" : ""}${hasEnded ? ". Temps écoulé." : "."}`}
    >
      <strong
        className={`text-3xl tabular-nums ${isUrgent ? "text-red-300" : "text-orange-300"}`}
      >
        {secondsLeft}s
      </strong>
      {hasEnded && (
        <Badge variant="destructive" className="gap-1 uppercase tracking-wider">
          <WarningDiamond aria-hidden="true" />
          Temps écoulé
        </Badge>
      )}
    </div>
  )
}

export { TurnCountdown }
