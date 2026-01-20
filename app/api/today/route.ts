import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { getTodayDateString } from "@/lib/game"

export async function GET() {
  try {
    const today = getTodayDateString()

    const plan = await prisma.dailyPlan.findUnique({
      where: { date: today },
      include: {
        tasks: {
          orderBy: { createdAt: "asc" },
        },
      },
    })

    if (!plan) {
      return NextResponse.json({ plan: null })
    }

    const completedXp = plan.tasks
      .filter((t) => t.status === "DONE")
      .reduce((sum, t) => sum + t.xp, 0)

    return NextResponse.json({
      plan,
      completedXp,
      progress: (completedXp / plan.targetXp) * 100,
    })
  } catch (error) {
    console.error("Error fetching today plan:", error)
    return NextResponse.json(
      { error: "Не удалось загрузить план на сегодня" },
      { status: 500 }
    )
  }
}
