import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { getRankFromXp, getTodayDateString, updateStreak } from "@/lib/game"

export async function POST(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const taskId = parseInt(params.id)

    const task = await prisma.dailyTask.findUnique({
      where: { id: taskId },
      include: {
        dailyPlan: true,
      },
    })

    if (!task) {
      return NextResponse.json({ error: "Задача не найдена" }, { status: 404 })
    }

    if (task.status === "DONE") {
      return NextResponse.json({ error: "Задача уже завершена" }, { status: 400 })
    }

    const today = getTodayDateString()

    // Update task
    await prisma.dailyTask.update({
      where: { id: taskId },
      data: {
        status: "DONE",
        completedAt: new Date(),
      },
    })

    // Create XP log
    await prisma.xpLog.create({
      data: {
        date: today,
        amount: task.xp,
        reason: `Завершено: ${task.title}`,
      },
    })

    // Update progress
    const progress = await prisma.progress.findUnique({
      where: { userId: 1 },
    })

    if (!progress) {
      return NextResponse.json(
        { error: "Прогресс не найден" },
        { status: 404 }
      )
    }

    const newTotalXp = progress.totalXp + task.xp
    const newRank = getRankFromXp(newTotalXp)

    // Check if daily plan is complete
    const allTasks = await prisma.dailyTask.findMany({
      where: { dailyPlanId: task.dailyPlanId },
    })

    const allDone = allTasks.every((t) => t.status === "DONE")
    const completedXp = allTasks
      .filter((t) => t.status === "DONE")
      .reduce((sum, t) => sum + t.xp, 0)

    let newStreak = progress.streak
    let lastCompletedDate = progress.lastCompletedDate

    if (allDone && completedXp >= task.dailyPlan.targetXp) {
      // Day completed, update streak
      newStreak = await updateStreak(prisma, 1, today)
      lastCompletedDate = today
    }

    await prisma.progress.update({
      where: { userId: 1 },
      data: {
        totalXp: newTotalXp,
        rank: newRank,
        streak: newStreak,
        lastCompletedDate,
      },
    })

    return NextResponse.json({
      success: true,
      newTotalXp,
      newRank,
      newStreak,
      dayComplete: allDone && completedXp >= task.dailyPlan.targetXp,
    })
  } catch (error) {
    console.error("Error completing task:", error)
    return NextResponse.json(
      { error: "Не удалось завершить задачу" },
      { status: 500 }
    )
  }
}
