import { gameConfig, type Rank } from "@/config/game"
import type { PrismaClient } from "@prisma/client"
import { format } from "date-fns"

export function getRankFromXp(totalXp: number): Rank {
  const rankIndex = Math.floor(totalXp / gameConfig.rankXpStep)
  if (rankIndex >= gameConfig.ranks.length) {
    return gameConfig.ranks[gameConfig.ranks.length - 1]
  }
  return gameConfig.ranks[rankIndex] || gameConfig.ranks[0]
}

export function getNextRank(currentRank: Rank): Rank | null {
  const currentIndex = gameConfig.ranks.indexOf(currentRank)
  if (currentIndex === -1 || currentIndex === gameConfig.ranks.length - 1) {
    return null
  }
  return gameConfig.ranks[currentIndex + 1]
}

export function getXpForNextRank(totalXp: number): number {
  const currentRankIndex = Math.floor(totalXp / gameConfig.rankXpStep)
  const nextRankXp = (currentRankIndex + 1) * gameConfig.rankXpStep
  return nextRankXp - totalXp
}

export function calculateStreakBonus(streak: number): number {
  const bonusMultiplier = Math.floor(streak / 3) * gameConfig.streakBonusPer3Days
  return Math.min(bonusMultiplier, gameConfig.maxStreakBonus)
}

export function applyStreakBonus(baseXp: number, streak: number): number {
  const bonus = calculateStreakBonus(streak)
  return Math.floor(baseXp * (1 + bonus))
}

export async function generateDailyPlan(
  prisma: PrismaClient,
  date: string,
  currentCycleCode: number,
  streak: number
) {
  // Check if plan already exists
  const existingPlan = await prisma.dailyPlan.findUnique({
    where: { date },
  })

  if (existingPlan) {
    return existingPlan
  }

  // Load task templates
  const templatesModule = await import("@/content/taskTemplates.json")
  const templates = templatesModule.default || templatesModule

  // Select tasks
  const knowledgeTemplates = templates.filter(
    (t) => t.type === "KNOWLEDGE" && t.cycleCode === currentCycleCode
  )
  const drillJsTemplates = templates.filter((t) => t.type === "DRILL_JS")
  const drillTsTemplates = templates.filter((t) => t.type === "DRILL_TS")
  const interviewTemplates = templates.filter(
    (t) => t.type === "INTERVIEW" && t.cycleCode === currentCycleCode
  )

  // Pick random templates (avoid repeats by tracking used)
  const selectedTasks = []

  // 1 KNOWLEDGE
  if (knowledgeTemplates.length > 0) {
    const random = Math.floor(Math.random() * knowledgeTemplates.length)
    selectedTasks.push(knowledgeTemplates[random])
  }

  // 1 DRILL_JS
  if (drillJsTemplates.length > 0) {
    const random = Math.floor(Math.random() * drillJsTemplates.length)
    selectedTasks.push(drillJsTemplates[random])
  }

  // 1 DRILL_TS
  if (drillTsTemplates.length > 0) {
    const random = Math.floor(Math.random() * drillTsTemplates.length)
    selectedTasks.push(drillTsTemplates[random])
  }

  // 2 INTERVIEW
  if (interviewTemplates.length > 0) {
    const shuffled = [...interviewTemplates].sort(() => Math.random() - 0.5)
    selectedTasks.push(...shuffled.slice(0, 2))
  }

  // Calculate base XP
  let baseXp = selectedTasks.reduce((sum, task) => sum + task.xp, 0)

  // Apply streak bonus
  const bonus = calculateStreakBonus(streak)
  const targetXp = Math.floor(baseXp * (1 + bonus))

  // If still below target, add more tasks
  if (targetXp < gameConfig.defaultTargetXp && interviewTemplates.length > 2) {
    const extra = interviewTemplates
      .filter((t) => !selectedTasks.includes(t))
      .slice(0, 1)
    selectedTasks.push(...extra)
    baseXp = selectedTasks.reduce((sum, task) => sum + task.xp, 0)
  }

  // Create plan
  const plan = await prisma.dailyPlan.create({
    data: {
      date,
      cycleCode: currentCycleCode,
      targetXp: Math.max(targetXp, gameConfig.defaultTargetXp),
      tasks: {
        create: selectedTasks.map((template) => ({
          type: template.type,
          title: template.title,
          prompt: template.prompt,
          xp: template.xp,
          status: "TODO",
        })),
      },
    },
    include: {
      tasks: true,
    },
  })

  return plan
}

export async function canAdvanceCycle(
  prisma: PrismaClient,
  userId: number,
  currentCycleCode: number
): Promise<{ canAdvance: boolean; reasons: string[] }> {
  const reasons: string[] = []

  // Check daily plans
  const completedPlans = await prisma.dailyPlan.count({
    where: {
      cycleCode: currentCycleCode,
      tasks: {
        some: {
          status: "DONE",
        },
      },
    },
  })

  if (completedPlans < gameConfig.cycleAdvancementRequirements.minDailyPlans) {
    reasons.push(
      `Нужно ${gameConfig.cycleAdvancementRequirements.minDailyPlans} завершённых ежедневных планов (есть ${completedPlans})`
    )
  }

  // Check interview tasks
  const completedInterviews = await prisma.dailyTask.count({
    where: {
      type: "INTERVIEW",
      status: "DONE",
      dailyPlan: {
        cycleCode: currentCycleCode,
      },
    },
  })

  if (
    completedInterviews < gameConfig.cycleAdvancementRequirements.minInterviews
  ) {
    reasons.push(
      `Нужно ${gameConfig.cycleAdvancementRequirements.minInterviews} завершённых задач интервью (есть ${completedInterviews})`
    )
  }

  return {
    canAdvance: reasons.length === 0,
    reasons,
  }
}

export function getTodayDateString(): string {
  return format(new Date(), "yyyy-MM-dd")
}

export async function updateStreak(
  prisma: PrismaClient,
  userId: number,
  todayDate: string
): Promise<number> {
  const progress = await prisma.progress.findUnique({
    where: { userId },
  })

  if (!progress) {
    return 0
  }

  const lastDate = progress.lastCompletedDate
  if (!lastDate) {
    return 1
  }

  // Parse dates
  const last = new Date(lastDate)
  const today = new Date(todayDate)
  const yesterday = new Date(today)
  yesterday.setDate(yesterday.getDate() - 1)

  // Check if last completion was yesterday (maintain streak)
  if (
    last.getFullYear() === yesterday.getFullYear() &&
    last.getMonth() === yesterday.getMonth() &&
    last.getDate() === yesterday.getDate()
  ) {
    return progress.streak + 1
  }

  // Check if last completion was today (already counted)
  if (
    last.getFullYear() === today.getFullYear() &&
    last.getMonth() === today.getMonth() &&
    last.getDate() === today.getDate()
  ) {
    return progress.streak
  }

  // Streak broken, start over
  return 1
}
