import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import {
  getRankFromXp,
  getTodayDateString,
  updateStreak,
  applyStreakBonus,
} from "@/lib/game"
import { getStepsFromTemplate, type TaskTemplate } from "@/lib/task-steps"

export async function POST(
  request: Request,
  { params }: { params: { sessionId: string } }
) {
  try {
    const sessionId = parseInt(params.sessionId)
    const today = getTodayDateString()

    const session = await prisma.taskSession.findUnique({
      where: { id: sessionId },
      include: {
        dailyTask: {
          include: { dailyPlan: true },
        },
        stepStates: true,
      },
    })

    if (!session) {
      return NextResponse.json(
        { error: "Сессия не найдена" },
        { status: 404 }
      )
    }

    if (session.status !== "ACTIVE") {
      return NextResponse.json(
        { error: "Сессия не активна" },
        { status: 400 }
      )
    }

    // Load template to check all steps
    const templatesModule = await import("@/content/taskTemplates.json")
    const templates = templatesModule.default || templatesModule
    const template = templates.find(
      (t: TaskTemplate) =>
        t.title === session.dailyTask.title && t.type === session.dailyTask.type
    )

    if (!template) {
      return NextResponse.json(
        { error: "Шаблон задачи не найден" },
        { status: 404 }
      )
    }

    const steps = getStepsFromTemplate(template)

    // Auto-complete any theory steps that aren't passed yet
    for (let index = 0; index < steps.length; index++) {
      const step = steps[index]
      if (step.type === "theory") {
        const stepState = session.stepStates.find((s) => s.stepIndex === index)
        if (!stepState || !stepState.isPassed) {
          await prisma.taskStepState.upsert({
            where: {
              sessionId_stepIndex: {
                sessionId,
                stepIndex: index,
              },
            },
            update: { isPassed: true },
            create: {
              sessionId,
              stepIndex: index,
              isPassed: true,
            },
          })
        }
      }
    }

    // Reload stepStates after auto-completing theories
    const updatedSession = await prisma.taskSession.findUnique({
      where: { id: sessionId },
      include: { stepStates: true },
    })

    if (!updatedSession) {
      return NextResponse.json(
        { error: "Сессия не найдена" },
        { status: 404 }
      )
    }

    // Verify all steps are passed (theory steps are always considered passed)
    const allStepsPassed = steps.every((step, index) => {
      // Theory steps are always passed
      if (step.type === "theory") return true
      const stepState = updatedSession.stepStates.find((s) => s.stepIndex === index)
      return stepState?.isPassed
    })

    if (!allStepsPassed) {
      return NextResponse.json(
        { error: "Не все шаги завершены" },
        { status: 400 }
      )
    }

    // Get progress for streak bonus
    const progress = await prisma.progress.findUnique({
      where: { userId: 1 },
    })

    if (!progress) {
      return NextResponse.json(
        { error: "Прогресс не найден" },
        { status: 404 }
      )
    }

    // Calculate awarded XP with streak bonus
    const baseXp = session.dailyTask.xp
    const awardedXp = applyStreakBonus(baseXp, progress.streak)

    // Mark session as completed
    await prisma.taskSession.update({
      where: { id: sessionId },
      data: { status: "COMPLETED" },
    })

    // Update task
    await prisma.dailyTask.update({
      where: { id: session.dailyTaskId },
      data: {
        status: "DONE",
        completedAt: new Date(),
      },
    })

    // Create XP log
    await prisma.xpLog.create({
      data: {
        date: today,
        amount: awardedXp,
        reason: `Завершено: ${session.dailyTask.title}`,
      },
    })

    // Update progress
    const newTotalXp = progress.totalXp + awardedXp
    const newRank = getRankFromXp(newTotalXp)

    // Update plan completedXp
    const plan = session.dailyTask.dailyPlan
    const newCompletedXp = plan.completedXp + awardedXp
    const isPlanCompleted = newCompletedXp >= plan.targetXp

    await prisma.dailyPlan.update({
      where: { id: plan.id },
      data: {
        completedXp: newCompletedXp,
        isCompleted: isPlanCompleted,
      },
    })

    // Update streak if plan is completed
    let newStreak = progress.streak
    let lastCompletedDate = progress.lastCompletedDate

    if (isPlanCompleted) {
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
      awardedXp,
      baseXp,
      bonus: awardedXp - baseXp,
      newTotalXp,
      newRank,
      newStreak,
      dayComplete: isPlanCompleted,
    })
  } catch (error) {
    console.error("Error finishing task session:", error)
    return NextResponse.json(
      { error: "Не удалось завершить задание" },
      { status: 500 }
    )
  }
}
