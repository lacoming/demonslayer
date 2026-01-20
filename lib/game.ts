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

  // Deterministic selection based on date to avoid repeats
  // Simple hash function for date + type + cycleCode
  function hashString(str: string): number {
    let hash = 0
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i)
      hash = (hash << 5) - hash + char
      hash = hash & hash // Convert to 32bit integer
    }
    return Math.abs(hash)
  }

  const selectedTasks = []

  // 1 KNOWLEDGE
  if (knowledgeTemplates.length > 0) {
    const hash = hashString(`${date}-KNOWLEDGE-${currentCycleCode}`)
    const index = hash % knowledgeTemplates.length
    selectedTasks.push(knowledgeTemplates[index])
  }

  // 1 DRILL_JS
  if (drillJsTemplates.length > 0) {
    const hash = hashString(`${date}-DRILL_JS`)
    const index = hash % drillJsTemplates.length
    selectedTasks.push(drillJsTemplates[index])
  }

  // 1 DRILL_TS
  if (drillTsTemplates.length > 0) {
    const hash = hashString(`${date}-DRILL_TS`)
    const index = hash % drillTsTemplates.length
    selectedTasks.push(drillTsTemplates[index])
  }

  // 2 INTERVIEW
  if (interviewTemplates.length > 0) {
    const hash1 = hashString(`${date}-INTERVIEW-1-${currentCycleCode}`)
    const hash2 = hashString(`${date}-INTERVIEW-2-${currentCycleCode}`)
    const index1 = hash1 % interviewTemplates.length
    let index2 = hash2 % interviewTemplates.length
    // Ensure different tasks
    if (index2 === index1 && interviewTemplates.length > 1) {
      index2 = (index2 + 1) % interviewTemplates.length
    }
    selectedTasks.push(interviewTemplates[index1])
    if (index2 !== index1) {
      selectedTasks.push(interviewTemplates[index2])
    }
  }

  // Calculate base XP
  let baseXp = selectedTasks.reduce((sum, task) => sum + task.xp, 0)

  // If still below target, add more tasks
  if (baseXp < gameConfig.defaultTargetXp && interviewTemplates.length > 2) {
    const extra = interviewTemplates
      .filter((t) => !selectedTasks.includes(t))
      .slice(0, 1)
    selectedTasks.push(...extra)
    baseXp = selectedTasks.reduce((sum, task) => sum + task.xp, 0)
  }

  // targetXp is fixed, streak bonus applies to awarded XP, not target
  const targetXp = Math.max(baseXp, gameConfig.defaultTargetXp)

  // Create plan
  const plan = await prisma.dailyPlan.create({
    data: {
      date,
      cycleCode: currentCycleCode,
      targetXp,
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

  // Check daily plans using isCompleted
  const completedPlans = await prisma.dailyPlan.count({
    where: {
      cycleCode: currentCycleCode,
      isCompleted: true,
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

  // Compare date strings directly (YYYY-MM-DD format)
  // Calculate yesterday's date string
  const today = new Date(todayDate + "T00:00:00")
  const yesterday = new Date(today)
  yesterday.setDate(yesterday.getDate() - 1)
  const yesterdayStr = format(yesterday, "yyyy-MM-dd")

  // Check if last completion was yesterday (maintain streak)
  if (lastDate === yesterdayStr) {
    return progress.streak + 1
  }

  // Check if last completion was today (already counted)
  if (lastDate === todayDate) {
    return progress.streak
  }

  // Streak broken, start over
  return 1
}
