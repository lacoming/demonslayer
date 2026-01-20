import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

export async function POST(
  request: Request,
  { params }: { params: { sessionId: string } }
) {
  try {
    const sessionId = parseInt(params.sessionId)

    const session = await prisma.taskSession.findUnique({
      where: { id: sessionId },
      include: { dailyTask: true },
    })

    if (!session) {
      return NextResponse.json(
        { error: "Сессия не найдена" },
        { status: 404 }
      )
    }

    // Delete session (cascade will delete stepStates)
    await prisma.taskSession.delete({
      where: { id: sessionId },
    })

    // Reset task status to TODO
    await prisma.dailyTask.update({
      where: { id: session.dailyTaskId },
      data: { status: "TODO" },
    })

    return NextResponse.json({
      success: true,
      message: "Сессия отменена, прогресс сброшен",
    })
  } catch (error) {
    console.error("Error abandoning session:", error)
    return NextResponse.json(
      { error: "Не удалось отменить сессию" },
      { status: 500 }
    )
  }
}
