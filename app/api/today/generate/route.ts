import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { generateDailyPlan, getTodayDateString } from "@/lib/game"

export async function POST(request: Request) {
  try {
    const today = getTodayDateString()
    const { force } = await request.json().catch(() => ({})) // Allow force regeneration

    const progress = await prisma.progress.findUnique({
      where: { userId: 1 },
    })

    if (!progress) {
      return NextResponse.json(
        { error: "Прогресс не найден" },
        { status: 404 }
      )
    }

    // If force=true, delete existing plan first
    if (force) {
      const existingPlan = await prisma.dailyPlan.findUnique({
        where: { date: today },
        include: { tasks: true },
      })

      if (existingPlan) {
        // Delete plan (tasks will be deleted via cascade)
        await prisma.dailyPlan.delete({
          where: { date: today },
        })
      }
    }

    const plan = await generateDailyPlan(
      prisma,
      today,
      progress.currentCycleCode,
      progress.streak
    )

    return NextResponse.json(plan)
  } catch (error) {
    console.error("Error generating daily plan:", error)
    return NextResponse.json(
      { error: "Не удалось создать ежедневный план" },
      { status: 500 }
    )
  }
}
