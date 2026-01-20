import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import sparringBankData from "@/content/sparring_bank.json"

interface SparringQuestion {
  id: number
  cycleCode: number
  category: string
  minRankIndex: number
  question: string
  keyPoints: string[]
}

export async function POST(request: Request) {
  try {
    const userId = 1 // TODO: get from session
    const { rankIndex, cycleCode } = await request.json()

    if (!rankIndex || !cycleCode) {
      return NextResponse.json(
        { error: "Требуются rankIndex и cycleCode" },
        { status: 400 }
      )
    }

    // Get user's sparring progress
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

    // Check if rank is unlocked
    const unlockedRankIndex = Math.min(
      11,
      1 + Math.floor(sparringProgress.totalPoints / 1000)
    )

    if (rankIndex > unlockedRankIndex) {
      return NextResponse.json(
        { error: "Этот уровень ещё не открыт" },
        { status: 403 }
      )
    }

    // Filter questions
    const bank = sparringBankData as SparringQuestion[]
    let filtered = bank.filter(
      (q) =>
        q.minRankIndex <= rankIndex &&
        q.cycleCode === cycleCode &&
        q.id !== sparringProgress.lastQuestionId
    )

    // Fallback: without minRankIndex filter
    if (filtered.length === 0) {
      filtered = bank.filter(
        (q) =>
          q.cycleCode === cycleCode &&
          q.id !== sparringProgress.lastQuestionId
      )
    }

    // Fallback: general JS Core pool
    if (filtered.length === 0) {
      filtered = bank.filter(
        (q) =>
          q.category === "JavaScript Core" &&
          q.id !== sparringProgress.lastQuestionId
      )
    }

    // Final fallback: any question except last
    if (filtered.length === 0) {
      filtered = bank.filter((q) => q.id !== sparringProgress.lastQuestionId)
    }

    // If still empty, allow any question
    if (filtered.length === 0) {
      filtered = bank
    }

    // Select random question
    const randomIndex = Math.floor(Math.random() * filtered.length)
    const selectedQuestion = filtered[randomIndex]

    // Update lastQuestionId
    await prisma.sparringProgress.update({
      where: { userId },
      data: { lastQuestionId: selectedQuestion.id },
    })

    return NextResponse.json({
      id: selectedQuestion.id,
      cycleCode: selectedQuestion.cycleCode,
      category: selectedQuestion.category,
      question: selectedQuestion.question,
      keyPoints: selectedQuestion.keyPoints || [],
    })
  } catch (error) {
    console.error("Error fetching sparring question:", error)
    return NextResponse.json(
      { error: "Не удалось получить вопрос" },
      { status: 500 }
    )
  }
}
