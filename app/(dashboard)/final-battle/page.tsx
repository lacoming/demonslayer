import { TopBar } from "@/components/layout/top-bar"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { prisma } from "@/lib/prisma"
import { getRankFromXp } from "@/lib/game"
import { CheckCircle2, XCircle, Trophy } from "lucide-react"
import { VictoryScreen } from "@/components/final-battle/victory-screen"

async function getFinalBattleData() {
  const progress = await prisma.progress.findUnique({
    where: { userId: 1 },
  })

  if (!progress) {
    return null
  }

  const rank = getRankFromXp(progress.totalXp)

  // Check if cycles 5 and 6 are completed
  const cycle5Plans = await prisma.dailyPlan.count({
    where: {
      cycleCode: 5,
      tasks: {
        some: {
          status: "DONE",
        },
      },
    },
  })

  const cycle6Plans = await prisma.dailyPlan.count({
    where: {
      cycleCode: 6,
      tasks: {
        some: {
          status: "DONE",
        },
      },
    },
  })

  const cycle5Complete = cycle5Plans >= 3
  const cycle6Complete = cycle6Plans >= 3

  // Check mock rounds
  const mockRounds = await prisma.mockRound.count()
  const hasEnoughMocks = mockRounds >= 5

  const isReady = cycle5Complete && cycle6Complete && hasEnoughMocks

  return {
    progress: { ...progress, rank },
    cycle5Complete,
    cycle6Complete,
    hasEnoughMocks,
    isReady,
    mockRounds,
  }
}

export default async function FinalBattlePage() {
  const data = await getFinalBattleData()

  if (!data) {
    return <div>Загрузка...</div>
  }

  const { progress, cycle5Complete, cycle6Complete, hasEnoughMocks, isReady, mockRounds } = data

  return (
    <div>
      <TopBar
        rank={progress.rank}
        totalXp={progress.totalXp}
        streak={progress.streak}
      />

      <div className="container mx-auto px-4 py-8 space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Финальная битва</h1>
          <p className="text-muted-foreground mt-1">
            Столкнитесь с Музаном и докажите своё мастерство
          </p>
        </div>

        {isReady ? (
          <VictoryScreen />
        ) : (
          <Card>
            <CardHeader>
              <CardTitle>Чеклист готовности</CardTitle>
              <CardDescription>
                Выполните все требования, чтобы разблокировать финальную битву
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-3">
                {cycle5Complete ? (
                  <CheckCircle2 className="h-6 w-6 text-green-500" />
                ) : (
                  <XCircle className="h-6 w-6 text-muted-foreground" />
                )}
                <div className="flex-1">
                  <div className="font-medium">Завершить Цикл 5 (React Core)</div>
                  <div className="text-sm text-muted-foreground">
                    Выполните как минимум 3 ежедневных плана для Цикла 5
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-3">
                {cycle6Complete ? (
                  <CheckCircle2 className="h-6 w-6 text-green-500" />
                ) : (
                  <XCircle className="h-6 w-6 text-muted-foreground" />
                )}
                <div className="flex-1">
                  <div className="font-medium">Завершить Цикл 6 (State & Data Fetching)</div>
                  <div className="text-sm text-muted-foreground">
                    Выполните как минимум 3 ежедневных плана для Цикла 6
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-3">
                {hasEnoughMocks ? (
                  <CheckCircle2 className="h-6 w-6 text-green-500" />
                ) : (
                  <XCircle className="h-6 w-6 text-muted-foreground" />
                )}
                <div className="flex-1">
                  <div className="font-medium">Завершить 5 пробных интервью</div>
                  <div className="text-sm text-muted-foreground">
                    Вы завершили {mockRounds} / 5
                  </div>
                </div>
              </div>

              {!isReady && (
                <div className="mt-6 p-4 bg-muted rounded-lg">
                  <p className="text-sm text-muted-foreground">
                    Продолжайте тренировки, чтобы разблокировать финальную битву. Освойте основы
                    и докажите свою готовность.
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}
