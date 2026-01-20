import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

interface AttemptRequest {
  date: string
  rankIndex: number
  question: string
  userAnswer: string
  aiScore: number
  passed: boolean
  pointsAwarded: number
  feedbackJson: string
}

export async function POST(request: Request) {
  try {
    const userId = 1 // TODO: get from session
    const body: AttemptRequest = await request.json()
    const {
      date,
      rankIndex,
      question,
      userAnswer,
      aiScore,
      passed,
      pointsAwarded,
      feedbackJson,
    } = body

    // Save attempt
    await prisma.sparringAttempt.create({
      data: {
        userId,
        date,
        rankIndex,
        question,
        userAnswer,
        aiScore,
        passed,
        pointsAwarded,
        feedbackJson,
      },
    })

    // Update progress if passed
    if (passed && pointsAwarded > 0) {
      const progress = await prisma.sparringProgress.findUnique({
        where: { userId },
      })

      if (progress) {
        const newTotalPoints = progress.totalPoints + pointsAwarded
        const newMarkPoints = progress.markPoints + pointsAwarded
        const newUnlockedRankIndex = Math.min(
          11,
          1 + Math.floor(newTotalPoints / 1000)
        )

        await prisma.sparringProgress.update({
          where: { userId },
          data: {
            totalPoints: newTotalPoints,
            markPoints: newMarkPoints,
            unlockedRankIndex: newUnlockedRankIndex,
          },
        })
      }
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Error saving sparring attempt:", error)
    return NextResponse.json(
      { error: "Не удалось сохранить попытку" },
      { status: 500 }
    )
  }
}
