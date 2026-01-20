import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { getTodayDateString } from "@/lib/game"
import { z } from "zod"

const createMockRoundSchema = z.object({
  durationMin: z.number(),
  mode: z.enum(["TIMED", "UNTIMED"]),
  score: z.number().min(0).max(10),
  notes: z.string().optional(),
})

export async function GET() {
  try {
    const rounds = await prisma.mockRound.findMany({
      orderBy: { createdAt: "desc" },
      take: 20,
    })

    return NextResponse.json({ rounds })
  } catch (error) {
    console.error("Error fetching mock rounds:", error)
    return NextResponse.json(
      { error: "Не удалось загрузить пробные раунды" },
      { status: 500 }
    )
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const data = createMockRoundSchema.parse(body)

    const today = getTodayDateString()

    const round = await prisma.mockRound.create({
      data: {
        date: today,
        durationMin: data.durationMin,
        mode: data.mode,
        score: data.score,
        notes: data.notes,
      },
    })

    return NextResponse.json(round)
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Invalid request data", details: error.errors },
        { status: 400 }
      )
    }
    console.error("Error creating mock round:", error)
    return NextResponse.json(
      { error: "Не удалось создать пробный раунд" },
      { status: 500 }
    )
  }
}
