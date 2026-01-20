import { TopBar } from "@/components/layout/top-bar"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { prisma } from "@/lib/prisma"
import { getRankFromXp } from "@/lib/game"
import { AdvanceCycleButton } from "@/components/cycles/advance-cycle-button"
import { Lock, CheckCircle2, Circle } from "lucide-react"
import cyclesData from "@/content/cycles.json"
import { Progress } from "@/components/ui/progress"

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
      let studiedThemes: string[] = []

      if (status === "current" || status === "done") {
        completedPlans = await prisma.dailyPlan.count({
          where: {
            cycleCode: cycle.code,
            isCompleted: true,
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

        // Get studied themes: topics from completed KNOWLEDGE tasks
        const completedKnowledgeTasks = await prisma.dailyTask.findMany({
          where: {
            type: "KNOWLEDGE",
            status: "DONE",
            dailyPlan: {
              cycleCode: cycle.code,
            },
          },
          select: {
            title: true,
          },
        })

        // Load templates to get topicTitle
        const templatesModule = await import("@/content/taskTemplates.json")
        const templates = templatesModule.default || templatesModule

        studiedThemes = cycle.themes.filter((theme) => {
          return completedKnowledgeTasks.some((task) => {
            const template = templates.find(
              (t: any) => t.title === task.title && t.type === "KNOWLEDGE"
            )
            return template?.topicTitle === theme
          })
        })
      }

      return {
        ...cycle,
        status,
        completedPlans,
        completedInterviews,
        studiedThemes,
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
          <h1 className="text-3xl font-bold">Отслеживание прогресса</h1>
          <p className="text-muted-foreground mt-1">
            Отслеживайте прогресс по циклам и темам обучения
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
                        Цикл {cycle.code}
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
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="font-semibold">Темы:</h4>
                    <span className="text-sm text-muted-foreground">
                      {cycle.studiedThemes.length} / {cycle.themes.length} изучено
                    </span>
                  </div>
                  <Progress
                    value={(cycle.studiedThemes.length / cycle.themes.length) * 100}
                    className="mb-2"
                  />
                  <div className="flex flex-wrap gap-2">
                    {cycle.themes.map((theme, i) => {
                      const isStudied = cycle.studiedThemes.includes(theme)
                      return (
                        <Badge
                          key={i}
                          variant={isStudied ? "default" : "secondary"}
                          className={`text-xs ${isStudied ? "bg-green-600" : ""}`}
                        >
                          {theme}
                        </Badge>
                      )
                    })}
                  </div>
                </div>

                {cycle.status === "current" && (
                  <div className="border-t pt-4 space-y-2">
                    <h4 className="font-semibold">Прогресс к следующему циклу:</h4>
                    <div className="text-sm space-y-1">
                      <div>
                        Планов выполнено: {cycle.completedPlans} / 3
                      </div>
                      <div>
                        Интервью вопросов закрыто: {cycle.completedInterviews} / 6
                      </div>
                    </div>
                    {cycle.completedPlans >= 3 &&
                      cycle.completedInterviews >= 6 && (
                        <AdvanceCycleButton />
                      )}
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
