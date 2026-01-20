import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { validateStepAnswer, getStepsFromTemplate, type TaskTemplate } from "@/lib/task-steps"

export async function POST(
  request: Request,
  { params }: { params: { sessionId: string } }
) {
  try {
    const sessionId = parseInt(params.sessionId)
    const { answer } = await request.json()

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

    // Load template and get current step
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

    // Validate answer
    const validation = validateStepAnswer(currentStep, answer)
    if (!validation.isValid) {
      return NextResponse.json(
        { error: validation.message || "Неверный ответ" },
        { status: 400 }
      )
    }

    // Update step state
    const stepState = await prisma.taskStepState.upsert({
      where: {
        sessionId_stepIndex: {
          sessionId,
          stepIndex: session.currentStepIndex,
        },
      },
      update: {
        userAnswerText:
          typeof answer === "string" ? answer : null,
        userSelectedOption:
          typeof answer === "number" ? answer : null,
        isPassed: true,
      },
      create: {
        sessionId,
        stepIndex: session.currentStepIndex,
        userAnswerText: typeof answer === "string" ? answer : null,
        userSelectedOption: typeof answer === "number" ? answer : null,
        isPassed: true,
      },
    })

    return NextResponse.json({
      success: true,
      stepState,
      message: "Ответ принят",
    })
  } catch (error) {
    console.error("Error submitting answer:", error)
    return NextResponse.json(
      { error: "Не удалось отправить ответ" },
      { status: 500 }
    )
  }
}
