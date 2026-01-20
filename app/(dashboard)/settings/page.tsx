import { TopBar } from "@/components/layout/top-bar"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { prisma } from "@/lib/prisma"
import { getRankFromXp } from "@/lib/game"

async function getSettingsData() {
  const progress = await prisma.progress.findUnique({
    where: { userId: 1 },
  })

  if (!progress) {
    return null
  }

  const rank = getRankFromXp(progress.totalXp)

  return {
    progress: { ...progress, rank },
  }
}

export default async function SettingsPage() {
  const data = await getSettingsData()

  if (!data) {
    return <div>Загрузка...</div>
  }

  const { progress } = data

  return (
    <div>
      <TopBar
        rank={progress.rank}
        totalXp={progress.totalXp}
        streak={progress.streak}
      />

      <div className="container mx-auto px-4 py-8 space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Settings</h1>
          <p className="text-muted-foreground mt-1">
            Configure your training experience
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Настройки игры</CardTitle>
            <CardDescription>
              Настройте параметры игры (скоро)
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium">Target Daily XP</label>
                <p className="text-sm text-muted-foreground">
                  Default: 100 XP (configurable in config/game.ts)
                </p>
              </div>
              <div>
                <label className="text-sm font-medium">Rank XP Step</label>
                <p className="text-sm text-muted-foreground">
                  Default: 500 XP per rank (configurable in config/game.ts)
                </p>
              </div>
              <div>
                <label className="text-sm font-medium">Language</label>
                <p className="text-sm text-muted-foreground">
                  Currently: English (RU/EN toggle coming soon)
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Ваш прогресс</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Всего XP:</span>
                <span className="font-medium">{progress.totalXp}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Текущий ранг:</span>
                <span className="font-medium">{progress.rank}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Текущий цикл:</span>
                <span className="font-medium">{progress.currentCycleCode}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Серия:</span>
                <span className="font-medium">{progress.streak} дней</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
