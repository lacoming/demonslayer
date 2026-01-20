"use client"

interface HunterMarkProgressProps {
  markPoints: number
}

export function HunterMarkProgress({ markPoints }: HunterMarkProgressProps) {
  const progress = (markPoints % 1000) / 1000
  const step = 1 + Math.floor(markPoints / 1000)
  const currentStepPoints = markPoints % 1000

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between text-sm">
        <span className="font-medium">Метка охотника</span>
        <span className="text-muted-foreground">
          {currentStepPoints} / 1000
        </span>
      </div>
      <div className="w-full bg-muted rounded-full h-2">
        <div
          className="bg-primary h-2 rounded-full transition-all duration-300"
          style={{ width: `${progress * 100}%` }}
        />
      </div>
      {step > 1 && (
        <div className="text-xs text-muted-foreground">
          Ступень {step}
        </div>
      )}
    </div>
  )
}
