import { Progress } from "@/components/ui/progress"
import { cn } from "@/lib/utils"

interface XpProgressProps {
  current: number
  target: number
  className?: string
}

export function XpProgress({ current, target, className }: XpProgressProps) {
  const percentage = Math.min((current / target) * 100, 100)

  return (
    <div className={cn("space-y-2", className)}>
      <div className="flex justify-between text-sm">
        <span className="text-muted-foreground">XP дыхания</span>
        <span className="font-medium">
          {current} / {target}
        </span>
      </div>
      <Progress value={percentage} max={100} />
    </div>
  )
}
