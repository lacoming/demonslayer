import { TopBar } from "@/components/layout/top-bar"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { RankBadge } from "@/components/shared/rank-badge"
import { XpProgress } from "@/components/shared/xp-progress"
import { Progress } from "@/components/ui/progress"
import { prisma } from "@/lib/prisma"
import { getRankFromXp, getXpForNextRank, getTodayDateString } from "@/lib/game"
import Link from "next/link"
import { Flame, Target, BookOpen, Swords } from "lucide-react"

async function getProgress() {
  const progress = await prisma.progress.findUnique({
    where: { userId: 1 },
  })

  if (!progress) {
    return null
  }

  const rank = getRankFromXp(progress.totalXp)
  const xpForNext = getXpForNextRank(progress.totalXp)

  const today = getTodayDateString()
  const todayPlan = await prisma.dailyPlan.findUnique({
    where: { date: today },
    include: {
      tasks: true,
    },
  })

  const todayXp = todayPlan
    ? todayPlan.tasks.filter((t) => t.status === "DONE").reduce((sum, t) => sum + t.xp, 0)
    : 0
  const todayTarget = todayPlan?.targetXp || 100

  return {
    ...progress,
    rank,
    xpForNext,
    todayXp,
    todayTarget,
  }
}

function getLoreText(rank: string): string {
  const lore: Record<string, string> = {
    Mizunoto: "Вы начинаете свой путь как Мидзуното, самый низкий ранг. Ваша семья была отнята, но вы отказываетесь сдаваться. Каждый день тренировок приближает вас к цели.",
    Mizunoe: "Вы доказали свою решимость. Как Мидзуное, вы понимаете, что постоянство — это ключ. Продолжайте дышать, продолжайте тренироваться.",
    Kanoto: "Ваши навыки растут. Как Каното, вы узнали, что знания и практика идут рука об руку. Путь впереди долог, но вы готовы.",
    Kanoe: "Вы делаете стабильный прогресс. Как Каное, вы обнаружили, что каждый вызов — это возможность стать сильнее.",
    Tsuchinoto: "Вы достигли средних рангов. Как Тсутиното, вы понимаете, что мастерство приходит от ежедневной преданности. Продолжайте двигаться вперёд.",
    Tsuchinoe: "Ваша преданность проявляется. Как Тсутиное, вы узнали, что небольшие ежедневные улучшения ведут к великим достижениям.",
    Hinoto: "Вы приближаетесь к высшим рангам. Как Хиното, вы поняли, что истинная сила идёт изнутри. Доверьтесь своей тренировке.",
    Hinoe: "Вы среди умелых. Как Хиное, вы доказали, что настойчивость побеждает талант. Финальные ранги ждут.",
    Kinoto: "Вы близки к вершине. Как Киното, вы овладели основами. Ещё один рывок, и вы достигнете элиты.",
    Kinoe: "Вы стоите среди элиты. Как Киное, вы показали исключительную преданность. Путь к Хашире в пределах досягаемости.",
    Hashira: "Вы достигли высшего ранга. Как Хашира, вы доказали свою ценность. Теперь столкнитесь с финальным вызовом и победите Музана.",
  }

  return lore[rank] || lore.Mizunoto
}

export default async function DashboardPage() {
  const progress = await getProgress()

  if (!progress) {
    return <div>Загрузка...</div>
  }

  const rankProgress = (progress.totalXp % 500) / 500

  return (
    <div>
      <TopBar
        rank={progress.rank}
        totalXp={progress.totalXp}
        streak={progress.streak}
        todayXp={progress.todayXp}
        todayTarget={progress.todayTarget}
      />

      <div className="container mx-auto px-4 py-8 space-y-6">
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          <Card>
            <CardHeader>
              <CardTitle>Current Rank</CardTitle>
              <CardDescription>Your progress in the Demon Slayer Corps</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <RankBadge rank={progress.rank as any} />
                <span className="text-sm text-muted-foreground">
                  {progress.xpForNext} XP до следующего ранга
                </span>
              </div>
              <Progress value={rankProgress * 100} max={100} />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Today's Progress</CardTitle>
              <CardDescription>Your daily training goals</CardDescription>
            </CardHeader>
            <CardContent>
              <XpProgress current={progress.todayXp} target={progress.todayTarget} />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Серия</CardTitle>
              <CardDescription>Дни последовательных тренировок</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2">
                <Flame className="h-8 w-8 text-orange-500" />
                <div>
                  <div className="text-2xl font-bold">{progress.streak}</div>
                  <div className="text-sm text-muted-foreground">days</div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Ваша история</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground leading-relaxed">
              {getLoreText(progress.rank)}
            </p>
          </CardContent>
        </Card>

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Link href="/today">
            <Card className="cursor-pointer hover:border-primary transition-colors">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Target className="h-5 w-5" />
                  Today
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">
                  View and complete today's training plan
                </p>
              </CardContent>
            </Card>
          </Link>

          <Link href="/sparring">
            <Card className="cursor-pointer hover:border-primary transition-colors">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Swords className="h-5 w-5" />
                  Спарринг
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">
                  Практикуйте вопросы для интервью
                </p>
              </CardContent>
            </Card>
          </Link>

          <Link href="/mock">
            <Card className="cursor-pointer hover:border-primary transition-colors">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BookOpen className="h-5 w-5" />
                  Mock Interview
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">
                  Timed interview simulation
                </p>
              </CardContent>
            </Card>
          </Link>

          <Link href="/cycles">
            <Card className="cursor-pointer hover:border-primary transition-colors">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BookOpen className="h-5 w-5" />
                  Циклы
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">
                  Просмотрите циклы обучения и прогресс
                </p>
              </CardContent>
            </Card>
          </Link>
        </div>
      </div>
    </div>
  )
}
