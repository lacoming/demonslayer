import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { getRankFromXp } from "@/lib/game"

export async function GET() {
  try {
    const progress = await prisma.progress.findUnique({
      where: { userId: 1 },
      include: {
        user: true,
      },
    })

    if (!progress) {
      return NextResponse.json(
        { error: "Прогресс не найден" },
        { status: 404 }
      )
    }

    const rank = getRankFromXp(progress.totalXp)

    return NextResponse.json({
      ...progress,
      rank,
    })
  } catch (error) {
    console.error("Error fetching progress:", error)
    return NextResponse.json(
      { error: "Не удалось загрузить прогресс" },
      { status: 500 }
    )
  }
}
