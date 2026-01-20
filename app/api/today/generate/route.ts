import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { generateDailyPlan, getTodayDateString } from "@/lib/game"

export async function POST() {
  try {
    const today = getTodayDateString()

    const progress = await prisma.progress.findUnique({
      where: { userId: 1 },
    })

    if (!progress) {
      return NextResponse.json(
        { error: "Прогресс не найден" },
        { status: 404 }
      )
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
