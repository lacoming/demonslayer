import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { getStepsFromTemplate, type TaskTemplate } from "@/lib/task-steps"

export async function POST(
  request: Request,
  { params }: { params: { sessionId: string } }
) {
  try {
    const sessionId = parseInt(params.sessionId)

    const session = await prisma.taskSession.findUnique({
      where: { id: sessionId },
      include: {
        dailyTask: true,
        stepStates: true,
      },
    })

    if (!session) {
      return NextResponse.json(
        { error: "Сессия не найдена" },
        { status: 404 }
      )
    }

    if (session.status !== "ACTIVE") {
      return NextResponse.json(
        { error: "Сессия не активна" },
        { status: 400 }
      )
    }

    // Load template
    const templatesModule = await import("@/content/taskTemplates.json")
    const templates = templatesModule.default || templatesModule
    const template = templates.find(
      (t: TaskTemplate) =>
        t.title === session.dailyTask.title && t.type === session.dailyTask.type
    )

    if (!template) {
      return NextResponse.json(
        { error: "Шаблон задачи не найден" },
        { status: 404 }
      )
    }

    const steps = getStepsFromTemplate(template)

    // Check if current step is passed
    const currentStepState = session.stepStates.find(
      (s) => s.stepIndex === session.currentStepIndex
    )

    if (!currentStepState || !currentStepState.isPassed) {
      return NextResponse.json(
        { error: "Текущий шаг не завершён" },
        { status: 400 }
      )
    }

    // Move to next step
    const nextStepIndex = session.currentStepIndex + 1

    if (nextStepIndex >= steps.length) {
      return NextResponse.json(
        { error: "Все шаги завершены, используйте finish" },
        { status: 400 }
      )
    }

    // Update session
    const updatedSession = await prisma.taskSession.update({
      where: { id: sessionId },
      data: { currentStepIndex: nextStepIndex },
      include: { stepStates: true },
    })

    const nextStep = steps[nextStepIndex]
    const nextStepState = updatedSession.stepStates.find(
      (s) => s.stepIndex === nextStepIndex
    )

    return NextResponse.json({
      success: true,
      currentStepIndex: nextStepIndex,
      totalSteps: steps.length,
      currentStep: nextStep,
      stepState: nextStepState,
    })
  } catch (error) {
    console.error("Error moving to next step:", error)
    return NextResponse.json(
      { error: "Не удалось перейти к следующему шагу" },
      { status: 500 }
    )
  }
}
