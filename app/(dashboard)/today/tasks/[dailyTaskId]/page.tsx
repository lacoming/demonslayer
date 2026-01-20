"use client"

import { useState, useEffect } from "react"
import { useRouter, useParams } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { TheoryStep } from "@/components/task-steps/theory-step"
import { QuizStep } from "@/components/task-steps/quiz-step"
import { TextAnswerStep } from "@/components/task-steps/text-answer-step"
import { CodeAnswerStep } from "@/components/task-steps/code-answer-step"
import { validateStepAnswer, type Step } from "@/lib/task-steps"
import { toast } from "sonner"

function getTaskTypeLabel(type: string): string {
  const labels: Record<string, string> = {
    KNOWLEDGE: "Знания",
    DRILL_JS: "Практика JS",
    DRILL_TS: "Практика TS",
    INTERVIEW: "Интервью",
  }
  return labels[type] || type
}

export default function TaskPage() {
  const router = useRouter()
  const params = useParams()
  const dailyTaskId = parseInt(params.dailyTaskId as string)

  const [sessionId, setSessionId] = useState<number | null>(null)
  const [currentStepIndex, setCurrentStepIndex] = useState(0)
  const [totalSteps, setTotalSteps] = useState(0)
  const [currentStep, setCurrentStep] = useState<Step | null>(null)
  const [stepState, setStepState] = useState<any>(null)
  const [task, setTask] = useState<any>(null)
  const [answer, setAnswer] = useState<string | number | null>(null)
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    loadSession()
  }, [dailyTaskId])

  async function loadSession() {
    try {
      // Try to get existing session or start new one
      const res = await fetch("/api/task-sessions/start", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ dailyTaskId }),
      })

      if (!res.ok) {
        throw new Error("Не удалось загрузить сессию")
      }

      const data = await res.json()
      setSessionId(data.sessionId)
      setCurrentStepIndex(data.currentStepIndex)
      setTotalSteps(data.totalSteps)
      setCurrentStep(data.currentStep)
      setStepState(data.stepState)

      // Load task info
      const taskRes = await fetch(`/api/today`)
      if (taskRes.ok) {
        const todayData = await taskRes.json()
        const foundTask = todayData.plan?.tasks?.find(
          (t: any) => t.id === dailyTaskId
        )
        if (foundTask) {
          setTask(foundTask)
          // Load saved answer if exists
          if (data.stepState) {
            if (data.stepState.userAnswerText) {
              setAnswer(data.stepState.userAnswerText)
            } else if (data.stepState.userSelectedOption !== null) {
              setAnswer(data.stepState.userSelectedOption)
            }
          }
        }
      }
    } catch (error) {
      console.error(error)
      toast.error("Не удалось загрузить задание")
      router.push("/today")
    } finally {
      setLoading(false)
    }
  }

  async function handleSubmitAnswer() {
    if (!currentStep || answer === null) {
      return
    }

    const validation = validateStepAnswer(currentStep, answer)
    if (!validation.isValid) {
      toast.error(validation.message || "Неверный ответ")
      return
    }

    setSubmitting(true)
    try {
      const res = await fetch(`/api/task-sessions/${sessionId}/answer`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ answer }),
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || "Не удалось отправить ответ")
      }

      const data = await res.json()
      setStepState(data.stepState)
      toast.success("Ответ принят!")
    } catch (error) {
      console.error(error)
      toast.error(
        error instanceof Error ? error.message : "Не удалось отправить ответ"
      )
    } finally {
      setSubmitting(false)
    }
  }

  async function handleNext() {
    if (!sessionId) return

    setSubmitting(true)
    try {
      const res = await fetch(`/api/task-sessions/${sessionId}/next`, {
        method: "POST",
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || "Не удалось перейти к следующему шагу")
      }

      const data = await res.json()
      setCurrentStepIndex(data.currentStepIndex)
      setCurrentStep(data.currentStep)
      setStepState(data.stepState)
      setAnswer(
        data.stepState?.userAnswerText ||
          data.stepState?.userSelectedOption ||
          null
      )
    } catch (error) {
      console.error(error)
      toast.error(
        error instanceof Error
          ? error.message
          : "Не удалось перейти к следующему шагу"
      )
    } finally {
      setSubmitting(false)
    }
  }

  async function handleFinish() {
    if (!sessionId) return

    if (
      !confirm(
        "Вы уверены, что хотите завершить задание? После завершения будет начислен опыт."
      )
    ) {
      return
    }

    setSubmitting(true)
    try {
      const res = await fetch(`/api/task-sessions/${sessionId}/finish`, {
        method: "POST",
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || "Не удалось завершить задание")
      }

      const data = await res.json()
      toast.success(
        `Задание завершено! Начислено ${data.awardedXp} ОП (базовый: ${data.baseXp}, бонус: +${data.bonus})`
      )
      router.push("/today")
      router.refresh()
    } catch (error) {
      console.error(error)
      toast.error(
        error instanceof Error ? error.message : "Не удалось завершить задание"
      )
    } finally {
      setSubmitting(false)
    }
  }

  async function handleAbandon() {
    if (
      !confirm(
        "Вы уверены, что хотите выйти? Весь прогресс по заданию будет потерян."
      )
    ) {
      return
    }

    if (!sessionId) {
      router.push("/today")
      return
    }

    setSubmitting(true)
    try {
      const res = await fetch(`/api/task-sessions/${sessionId}/abandon`, {
        method: "POST",
      })

      if (!res.ok) {
        throw new Error("Не удалось выйти из задания")
      }

      toast.info("Прогресс сброшен")
      router.push("/today")
    } catch (error) {
      console.error(error)
      toast.error("Не удалось выйти из задания")
    } finally {
      setSubmitting(false)
    }
  }

  function isStepValid(): boolean {
    if (!currentStep) return false

    // Theory steps are always valid
    if (currentStep.type === "theory") return true

    // Check if answer is provided
    if (answer === null) return false

    // Validate answer
    const validation = validateStepAnswer(currentStep, answer)
    return validation.isValid
  }

  function canProceed(): boolean {
    if (!currentStep) return false
    if (currentStep.type === "theory") return true
    if (!stepState?.isPassed) return false
    return true
  }

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div>Загрузка...</div>
      </div>
    )
  }

  if (!currentStep || !task) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div>Задание не найдено</div>
      </div>
    )
  }

  const isLastStep = currentStepIndex === totalSteps - 1

  return (
    <div className="container mx-auto px-4 py-8 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <Badge variant="secondary">{getTaskTypeLabel(task.type)}</Badge>
            <span className="text-sm text-muted-foreground">
              Шаг {currentStepIndex + 1} из {totalSteps}
            </span>
          </div>
          <h1 className="text-3xl font-bold">{task.title}</h1>
        </div>
        <Button
          variant="destructive"
          onClick={handleAbandon}
          disabled={submitting}
        >
          Выйти из задания
        </Button>
      </div>

      <div className="space-y-4">
        {currentStep.type === "theory" && <TheoryStep step={currentStep} />}
        {currentStep.type === "quiz_single" && (
          <QuizStep
            step={currentStep}
            selectedOption={
              typeof answer === "number" ? answer : null
            }
            onSelect={(option) => setAnswer(option)}
          />
        )}
        {currentStep.type === "text_answer" && (
          <TextAnswerStep
            step={currentStep}
            answer={typeof answer === "string" ? answer : ""}
            onAnswerChange={(text) => setAnswer(text)}
          />
        )}
        {currentStep.type === "code_answer" && (
          <CodeAnswerStep
            step={currentStep}
            answer={typeof answer === "string" ? answer : ""}
            onAnswerChange={(text) => setAnswer(text)}
          />
        )}
      </div>

      <div className="flex gap-2 justify-end">
        {!isLastStep ? (
          <>
            {currentStep.type !== "theory" && !stepState?.isPassed && (
              <Button
                onClick={handleSubmitAnswer}
                disabled={!isStepValid() || submitting}
                variant="default"
              >
                Проверить ответ
              </Button>
            )}
            <Button
              onClick={handleNext}
              disabled={!canProceed() || submitting}
              variant="default"
              className="bg-green-600 hover:bg-green-700"
            >
              Дальше
            </Button>
          </>
        ) : (
          <>
            {currentStep.type !== "theory" && !stepState?.isPassed && (
              <Button
                onClick={handleSubmitAnswer}
                disabled={!isStepValid() || submitting}
                variant="default"
              >
                Проверить ответ
              </Button>
            )}
            <Button
              onClick={handleFinish}
              disabled={!canProceed() || submitting}
              variant="default"
              className="bg-green-600 hover:bg-green-700"
            >
              Завершить задание
            </Button>
          </>
        )}
      </div>
    </div>
  )
}
