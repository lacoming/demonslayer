import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { canAdvanceCycle } from "@/lib/game"

export async function POST() {
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

    const result = await canAdvanceCycle(
      prisma,
      1,
      progress.currentCycleCode
    )

    if (!result.canAdvance) {
      return NextResponse.json(
        {
          error: "Невозможно перейти к следующему циклу",
          reasons: result.reasons,
        },
        { status: 400 }
      )
    }

    const nextCycleCode = progress.currentCycleCode + 1

    if (nextCycleCode > 11) {
      return NextResponse.json(
        { error: "Уже достигнут максимальный цикл" },
        { status: 400 }
      )
    }

    await prisma.progress.update({
      where: { userId: 1 },
      data: {
        currentCycleCode: nextCycleCode,
      },
    })

    return NextResponse.json({
      success: true,
      newCycleCode: nextCycleCode,
    })
  } catch (error) {
    console.error("Error advancing cycle:", error)
    return NextResponse.json(
      { error: "Не удалось перейти к следующему циклу" },
      { status: 500 }
    )
  }
}
