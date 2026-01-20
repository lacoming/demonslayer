"use client"

import { Badge } from "@/components/ui/badge"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { type Rank } from "@/config/game"
import { gameConfig } from "@/config/game"
import { getXpForNextRank } from "@/lib/game"
import { Progress } from "@/components/ui/progress"

interface RankBadgeProps {
  rank: Rank
  totalXp?: number
  className?: string
}

export function RankBadge({ rank, totalXp = 0, className }: RankBadgeProps) {
  const currentIndex = gameConfig.ranks.indexOf(rank)
  const nextRank = currentIndex < gameConfig.ranks.length - 1 
    ? gameConfig.ranks[currentIndex + 1] 
    : null
  const xpForNext = getXpForNextRank(totalXp)
  const rankXpStep = gameConfig.rankXpStep
  const progressPercent = ((rankXpStep - xpForNext) / rankXpStep) * 100

  return (
    <Popover>
      <PopoverTrigger asChild>
        <button>
          <Badge variant="secondary" className={`cursor-pointer ${className}`}>
            {rank}
          </Badge>
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-80">
        <div className="space-y-4">
          <div>
            <h3 className="font-semibold mb-2">Лестница рангов</h3>
            <div className="flex items-start gap-4">
              <div className="flex flex-col-reverse gap-1">
                {gameConfig.ranks.map((r, index) => (
                  <div
                    key={r}
                    className={`text-sm py-1 px-2 rounded ${
                      r === rank
                        ? "bg-primary text-primary-foreground font-bold"
                        : index < currentIndex
                        ? "bg-green-100 text-green-800"
                        : "text-muted-foreground"
                    }`}
                  >
                    {r}
                  </div>
                ))}
              </div>
              {nextRank && (
                <div className="flex-1 space-y-2">
                  <div className="text-sm">
                    <div className="font-medium mb-1">Прогресс до {nextRank}</div>
                    <Progress value={progressPercent} className="h-2" />
                    <div className="text-xs text-muted-foreground mt-1">
                      {xpForNext} / {rankXpStep} ОП до следующего ранга
                    </div>
                  </div>
                </div>
              )}
              {!nextRank && (
                <div className="flex-1 text-sm text-muted-foreground">
                  Достигнут максимальный ранг!
                </div>
              )}
            </div>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  )
}
