import { TopBar } from "@/components/layout/top-bar"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { XpProgress } from "@/components/shared/xp-progress"
import { Badge } from "@/components/ui/badge"
import { prisma } from "@/lib/prisma"
import { getRankFromXp, getTodayDateString } from "@/lib/game"
import { StartTaskButton } from "@/components/today/start-task-button"
import Link from "next/link"
import { GeneratePlanButton } from "@/components/today/generate-plan-button"
import { CheckCircle2, Circle, PlayCircle } from "lucide-react"

async function getTodayData() {
  const today = getTodayDateString()

  const progress = await prisma.progress.findUnique({
    where: { userId: 1 },
  })

  if (!progress) {
    return null
  }

  const rank = getRankFromXp(progress.totalXp)

  let plan = await prisma.dailyPlan.findUnique({
    where: { date: today },
    include: {
      tasks: {
        orderBy: { createdAt: "asc" },
      },
    },
  })

  // Auto-generate plan if missing
  if (!plan) {
    const { generateDailyPlan } = await import("@/lib/game")
    plan = await generateDailyPlan(
      prisma,
      today,
      progress.currentCycleCode,
      progress.streak
    )
  }

  const completedXp = plan?.completedXp || 0

  return {
    progress: { ...progress, rank },
    plan,
    completedXp,
    today,
  }
}

function getTaskTypeBadge(type: string) {
  const variants: Record<string, "default" | "secondary" | "outline"> = {
    KNOWLEDGE: "default",
    DRILL_JS: "secondary",
    DRILL_TS: "secondary",
    INTERVIEW: "outline",
  }

  return variants[type] || "outline"
}

function getTaskTypeLabel(type: string): string {
  const labels: Record<string, string> = {
    KNOWLEDGE: "Знания",
    DRILL_JS: "Практика JS",
    DRILL_TS: "Практика TS",
    INTERVIEW: "Интервью",
  }

  return labels[type] || type
}

export default async function TodayPage() {
  const data = await getTodayData()

  if (!data) {
    return <div>Загрузка...</div>
  }

  const { progress, plan, completedXp, today } = data

  return (
    <div>
      <TopBar
        rank={progress.rank}
        totalXp={progress.totalXp}
        streak={progress.streak}
        todayXp={completedXp}
        todayTarget={plan?.targetXp || 100}
      />

      <div className="container mx-auto px-4 py-8 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Тренировка на сегодня</h1>
            <p className="text-muted-foreground mt-1">
              Выполните ежедневный план, чтобы сохранить серию
            </p>
          </div>
          {!plan && <GeneratePlanButton />}
        </div>

        {plan ? (
          <>
            <Card>
              <CardHeader>
                <CardTitle>Прогресс</CardTitle>
              </CardHeader>
              <CardContent>
                <XpProgress current={completedXp} target={plan.targetXp} />
                {progress.streak > 0 && (
                  <div className="mt-4 text-sm text-muted-foreground">
                    Бонус серии: +{Math.floor((progress.streak / 3) * 5)}% ОП
                  </div>
                )}
              </CardContent>
            </Card>

            <div className="space-y-4">
              <h2 className="text-2xl font-semibold">Задачи</h2>
              {plan.tasks.map((task) => (
                <Card key={task.id}>
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <Badge variant={getTaskTypeBadge(task.type)}>
                            {getTaskTypeLabel(task.type)}
                          </Badge>
                          {task.status === "DONE" ? (
                            <CheckCircle2 className="h-5 w-5 text-green-500" />
                          ) : task.status === "IN_PROGRESS" ? (
                            <PlayCircle className="h-5 w-5 text-blue-500" />
                          ) : (
                            <Circle className="h-5 w-5 text-muted-foreground" />
                          )}
                        </div>
                        <CardTitle className="text-lg">{task.title}</CardTitle>
                        <CardDescription className="mt-2">
                          {task.prompt}
                        </CardDescription>
                      </div>
                      <div className="ml-4 text-right">
                        <div className="text-2xl font-bold text-primary">
                          +{task.xp}
                        </div>
                        <div className="text-xs text-muted-foreground">ОП</div>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    {task.status === "TODO" ? (
                      <StartTaskButton taskId={task.id} />
                    ) : task.status === "IN_PROGRESS" ? (
                      <Link href={`/today/tasks/${task.id}`}>
                        <Button variant="default" className="bg-blue-600 hover:bg-blue-700">
                          Продолжить
                        </Button>
                      </Link>
                    ) : (
                      <div className="text-sm text-green-500">
                        Завершено {task.completedAt?.toLocaleDateString()}
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          </>
        ) : (
          <Card>
            <CardContent className="py-12 text-center">
              <p className="text-muted-foreground mb-4">
                План на сегодня ещё не создан.
              </p>
              <GeneratePlanButton />
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}
