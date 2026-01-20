import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { getStepsFromTemplate, type TaskTemplate } from "@/lib/task-steps"

export async function GET(
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
    const currentStep = steps[session.currentStepIndex]
    const stepState = session.stepStates.find(
      (s) => s.stepIndex === session.currentStepIndex
    )

    return NextResponse.json({
      sessionId: session.id,
      currentStepIndex: session.currentStepIndex,
      totalSteps: steps.length,
      currentStep,
      stepState,
      status: session.status,
    })
  } catch (error) {
    console.error("Error getting task session:", error)
    return NextResponse.json(
      { error: "Не удалось получить сессию" },
      { status: 500 }
    )
  }
}
