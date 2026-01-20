import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { canAdvanceCycle } from "@/lib/game"
import cyclesData from "@/content/cycles.json"

export async function GET() {
  try {
    const progress = await prisma.progress.findUnique({
      where: { userId: 1 },
    })

    if (!progress) {
      return NextResponse.json(
        { error: "Прогресс не найден" },
        { status: 404 }
      )
    }

    const cycles = await Promise.all(
      cyclesData.map(async (cycle) => {
        const status =
          cycle.code < progress.currentCycleCode
            ? "done"
            : cycle.code === progress.currentCycleCode
            ? "current"
            : "locked"

        let canAdvance = false
        let reasons: string[] = []

        if (status === "current") {
          const result = await canAdvanceCycle(
            prisma,
            1,
            progress.currentCycleCode
          )
          canAdvance = result.canAdvance
          reasons = result.reasons
        }

        return {
          ...cycle,
          status,
          canAdvance,
          reasons,
        }
      })
    )

    return NextResponse.json({ cycles, currentCycle: progress.currentCycleCode })
  } catch (error) {
    console.error("Error fetching cycles:", error)
    return NextResponse.json(
      { error: "Не удалось загрузить циклы" },
      { status: 500 }
    )
  }
}
