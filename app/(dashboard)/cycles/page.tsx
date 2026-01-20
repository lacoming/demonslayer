import { TopBar } from "@/components/layout/top-bar"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { prisma } from "@/lib/prisma"
import { getRankFromXp } from "@/lib/game"
import { AdvanceCycleButton } from "@/components/cycles/advance-cycle-button"
import { Lock, CheckCircle2, Circle } from "lucide-react"
import cyclesData from "@/content/cycles.json"
import questionsData from "@/content/questions.json"

async function getCyclesData() {
  const progress = await prisma.progress.findUnique({
    where: { userId: 1 },
  })

  if (!progress) {
    return null
  }

  const rank = getRankFromXp(progress.totalXp)

  // Get cycle completion stats
  const cycles = await Promise.all(
    cyclesData.map(async (cycle) => {
      const status =
        cycle.code < progress.currentCycleCode
          ? "done"
          : cycle.code === progress.currentCycleCode
          ? "current"
          : "locked"

      // Count completed plans and interviews for current cycle
      let completedPlans = 0
      let completedInterviews = 0

      if (status === "current") {
        completedPlans = await prisma.dailyPlan.count({
          where: {
            cycleCode: cycle.code,
            tasks: {
              some: {
                status: "DONE",
              },
            },
          },
        })

        completedInterviews = await prisma.dailyTask.count({
          where: {
            type: "INTERVIEW",
            status: "DONE",
            dailyPlan: {
              cycleCode: cycle.code,
            },
          },
        })
      }

      const cycleQuestions = questionsData.filter(
        (q) => q.cycleCode === cycle.code
      )

      return {
        ...cycle,
        status,
        completedPlans,
        completedInterviews,
        questions: cycleQuestions,
      }
    })
  )

  return {
    progress: { ...progress, rank },
    cycles,
  }
}

export default async function CyclesPage() {
  const data = await getCyclesData()

  if (!data) {
    return <div>Загрузка...</div>
  }

  const { progress, cycles } = data

  return (
    <div>
      <TopBar
        rank={progress.rank}
        totalXp={progress.totalXp}
        streak={progress.streak}
      />

      <div className="container mx-auto px-4 py-8 space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Циклы обучения</h1>
          <p className="text-muted-foreground mt-1">
            Освойте каждый цикл, чтобы продвинуться в тренировках
          </p>
        </div>

        <div className="space-y-4">
          {cycles.map((cycle) => (
            <Card key={cycle.code}>
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      {cycle.status === "done" && (
                        <CheckCircle2 className="h-5 w-5 text-green-500" />
                      )}
                      {cycle.status === "current" && (
                        <Circle className="h-5 w-5 text-blue-500" />
                      )}
                      {cycle.status === "locked" && (
                        <Lock className="h-5 w-5 text-muted-foreground" />
                      )}
                      <Badge
                        variant={
                          cycle.status === "done"
                            ? "default"
                            : cycle.status === "current"
                            ? "secondary"
                            : "outline"
                        }
                      >
                        Cycle {cycle.code}
                      </Badge>
                      <Badge variant="outline">
                        {cycle.status === "done" ? "Завершён" : cycle.status === "current" ? "Текущий" : "Заблокирован"}
                      </Badge>
                    </div>
                    <CardTitle>{cycle.title}</CardTitle>
                    <CardDescription className="mt-2">
                      {cycle.description}
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <h4 className="font-semibold mb-2">Themes:</h4>
                  <div className="flex flex-wrap gap-2">
                    {cycle.themes.map((theme, i) => (
                      <Badge key={i} variant="secondary" className="text-xs">
                        {theme}
                      </Badge>
                    ))}
                  </div>
                </div>

                {cycle.status === "current" && (
                  <div className="border-t pt-4 space-y-2">
                    <h4 className="font-semibold">Прогресс к следующему циклу:</h4>
                    <div className="text-sm space-y-1">
                      <div>
                        Ежедневные планы: {cycle.completedPlans} / 3
                      </div>
                      <div>
                        Задачи интервью: {cycle.completedInterviews} / 6
                      </div>
                    </div>
                    {cycle.completedPlans >= 3 &&
                      cycle.completedInterviews >= 6 && (
                        <AdvanceCycleButton />
                      )}
                  </div>
                )}

                {cycle.questions.length > 0 && (
                  <div className="border-t pt-4">
                    <h4 className="font-semibold mb-2">
                      Interview Questions ({cycle.questions.length})
                    </h4>
                    <div className="space-y-2 max-h-60 overflow-y-auto">
                      {cycle.questions.map((q, i) => (
                        <div
                          key={i}
                          className="text-sm p-2 bg-muted rounded-md"
                        >
                          <div className="font-medium">{q.question}</div>
                          {q.category && (
                            <div className="text-xs text-muted-foreground mt-1">
                              Категория: {q.category}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </div>
  )
}
