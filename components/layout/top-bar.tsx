"use client"

import { RankBadge } from "@/components/shared/rank-badge"
import { XpProgress } from "@/components/shared/xp-progress"
import { Flame } from "lucide-react"
import Link from "next/link"
import { Button } from "@/components/ui/button"

interface TopBarProps {
  rank: string
  totalXp: number
  streak: number
  todayXp?: number
  todayTarget?: number
}

export function TopBar({
  rank,
  totalXp,
  streak,
  todayXp = 0,
  todayTarget = 100,
}: TopBarProps) {
  return (
    <header className="sticky top-0 z-40 w-full border-b bg-card/95 backdrop-blur supports-[backdrop-filter]:bg-card/60">
      <div className="container flex h-16 items-center justify-between px-4">
        <div className="flex items-center gap-4">
          <RankBadge rank={rank} totalXp={totalXp} />
          <div className="hidden md:flex items-center gap-2 text-sm text-muted-foreground">
            <Flame className="h-4 w-4 text-orange-500" />
            <span>Серия {streak} дней</span>
          </div>
        </div>

        <div className="flex-1 max-w-md mx-4 hidden md:block">
          <XpProgress current={todayXp} target={todayTarget} />
        </div>

        <div className="flex items-center gap-2">
          {todayXp < todayTarget && (
            <Link href="/today">
              <Button variant="breath" size="sm">
                Начать день
              </Button>
            </Link>
          )}
        </div>
      </div>
    </header>
  )
}
