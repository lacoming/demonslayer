import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

export async function GET() {
  try {
    const userId = 1 // TODO: get from session

    let sparringProgress = await prisma.sparringProgress.findUnique({
      where: { userId },
    })

    if (!sparringProgress) {
      sparringProgress = await prisma.sparringProgress.create({
        data: {
          userId,
          totalPoints: 0,
          unlockedRankIndex: 1,
          markPoints: 0,
        },
      })
    }

    // Calculate unlocked rank based on totalPoints
    const unlockedRankIndex = Math.min(
      11,
      1 + Math.floor(sparringProgress.totalPoints / 1000)
    )

    // Update if changed
    if (sparringProgress.unlockedRankIndex !== unlockedRankIndex) {
      sparringProgress = await prisma.sparringProgress.update({
        where: { userId },
        data: { unlockedRankIndex },
      })
    }

    return NextResponse.json({
      totalPoints: sparringProgress.totalPoints,
      unlockedRankIndex: sparringProgress.unlockedRankIndex,
      markPoints: sparringProgress.markPoints,
      lastQuestionId: sparringProgress.lastQuestionId,
    })
  } catch (error) {
    console.error("Error fetching sparring progress:", error)
    return NextResponse.json(
      { error: "Не удалось загрузить прогресс спарринга" },
      { status: 500 }
    )
  }
}
