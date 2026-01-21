import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { getStepsFromTemplate, type TaskTemplate } from "@/lib/task-steps"

export async function POST(request: Request) {
  try {
    const { dailyTaskId } = await request.json()

    if (!dailyTaskId) {
      return NextResponse.json(
        { error: "dailyTaskId обязателен" },
        { status: 400 }
      )
    }

    // Get task
    const task = await prisma.dailyTask.findUnique({
      where: { id: dailyTaskId },
      include: { dailyPlan: true },
    })

    if (!task) {
      return NextResponse.json({ error: "Задача не найдена" }, { status: 404 })
    }

    if (task.status === "DONE") {
      return NextResponse.json(
        { error: "Задача уже завершена" },
        { status: 400 }
      )
    }

    // Check for existing active session
    const existingSession = await prisma.taskSession.findUnique({
      where: { dailyTaskId },
      include: { stepStates: true },
    })

    if (existingSession && existingSession.status === "ACTIVE") {
      // Return existing session
      const templatesModule = await import("@/content/taskTemplates.json")
      const templates = templatesModule.default || templatesModule
      const template = templates.find(
        (t: TaskTemplate) => t.title === task.title && t.type === task.type
      )

      if (!template) {
        return NextResponse.json(
          { error: "Шаблон задачи не найден" },
          { status: 404 }
        )
      }

      const steps = getStepsFromTemplate(template)
      const currentStep = steps[existingSession.currentStepIndex]
      const currentStepState = existingSession.stepStates.find(
        (s) => s.stepIndex === existingSession.currentStepIndex
      )

      // Auto-complete theory step if not already passed
      if (currentStep.type === "theory" && (!currentStepState || !currentStepState.isPassed)) {
        await prisma.taskStepState.upsert({
          where: {
            sessionId_stepIndex: {
              sessionId: existingSession.id,
              stepIndex: existingSession.currentStepIndex,
            },
          },
          update: { isPassed: true },
          create: {
            sessionId: existingSession.id,
            stepIndex: existingSession.currentStepIndex,
            isPassed: true,
          },
        })
        // Reload stepState after update
        const updatedStepState = await prisma.taskStepState.findUnique({
          where: {
            sessionId_stepIndex: {
              sessionId: existingSession.id,
              stepIndex: existingSession.currentStepIndex,
            },
          },
        })
        return NextResponse.json({
          sessionId: existingSession.id,
          currentStepIndex: existingSession.currentStepIndex,
          totalSteps: steps.length,
          currentStep,
          stepState: updatedStepState,
        })
      }

      return NextResponse.json({
        sessionId: existingSession.id,
        currentStepIndex: existingSession.currentStepIndex,
        totalSteps: steps.length,
        currentStep,
        stepState: currentStepState,
      })
    }

    // Load template
    const templatesModule = await import("@/content/taskTemplates.json")
    const templates = templatesModule.default || templatesModule
    const template = templates.find(
      (t: TaskTemplate) => t.title === task.title && t.type === task.type
    )

    if (!template) {
      return NextResponse.json(
        { error: "Шаблон задачи не найден" },
        { status: 404 }
      )
    }

    const steps = getStepsFromTemplate(template)

    // Create session
    const session = await prisma.taskSession.create({
      data: {
        userId: 1,
        dailyTaskId,
        currentStepIndex: 0,
        status: "ACTIVE",
        stepStates: {
          create: steps.map((step, index) => ({
            stepIndex: index,
            isPassed: step.type === "theory" ? true : false,
          })),
        },
      },
      include: { stepStates: true },
    })

    // Update task status
    await prisma.dailyTask.update({
      where: { id: dailyTaskId },
      data: { status: "IN_PROGRESS" },
    })

    const currentStep = steps[0]

    return NextResponse.json({
      sessionId: session.id,
      currentStepIndex: 0,
      totalSteps: steps.length,
      currentStep,
      stepState: session.stepStates[0],
    })
  } catch (error) {
    console.error("Error starting task session:", error)
    return NextResponse.json(
      { error: "Не удалось начать сессию" },
      { status: 500 }
    )
  }
}
