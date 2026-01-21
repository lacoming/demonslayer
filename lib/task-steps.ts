import { gameConfig } from "@/config/game"

export type StepType = "theory" | "quiz_single" | "text_answer" | "code_answer"

export interface Step {
  type: StepType
  title: string
  content?: string
  question?: string
  options?: string[]
  correctAnswer?: number
  minChars?: number
  keywords?: string[]
  prompt?: string
  requiredTokens?: string[]
}

export interface TaskTemplate {
  id: string
  type: string
  cycleCode: number | null
  topicTitle?: string
  title: string
  prompt: string
  xp: number
  steps?: Step[]
}

export function generateStepsFromPrompt(
  prompt: string,
  type: string
): Step[] {
  // Default: 2 steps for backward compatibility
  return [
    {
      type: "theory",
      title: "Изучение материала",
      content: prompt,
    },
    {
      type: "text_answer",
      title: "Объяснение своими словами",
      question: "Напишите краткое объяснение своими словами (минимум 80 символов)",
      minChars: gameConfig.minTextAnswerChars,
    },
  ]
}

export function getStepsFromTemplate(template: TaskTemplate): Step[] {
  if (template.steps && template.steps.length > 0) {
    return template.steps
  }
  // Fallback: generate from prompt
  return generateStepsFromPrompt(template.prompt, template.type)
}

export function validateStepAnswer(
  step: Step,
  answer: string | number | null
): { isValid: boolean; message?: string } {
  switch (step.type) {
    case "theory":
      // Theory steps don't require answers
      return { isValid: true }

    case "quiz_single":
      if (!answer && answer !== 0) {
        return { isValid: false, message: "Ответ не может быть пустым" }
      }
      if (typeof answer !== "number") {
        return { isValid: false, message: "Выберите вариант ответа" }
      }
      if (answer === step.correctAnswer) {
        return { isValid: true }
      }
      return { isValid: false, message: "Неверно, попробуйте ещё" }

    case "text_answer":
      if (!answer && answer !== 0) {
        return { isValid: false, message: "Ответ не может быть пустым" }
      }
      if (typeof answer !== "string") {
        return { isValid: false, message: "Введите текстовый ответ" }
      }
      const minChars = step.minChars || gameConfig.minTextAnswerChars
      if (answer.length < minChars) {
        return {
          isValid: false,
          message: `Минимум ${minChars} символов (сейчас ${answer.length})`,
        }
      }
      // Check keywords if provided
      if (step.keywords && step.keywords.length > 0) {
        const lowerAnswer = answer.toLowerCase()
        const hasKeyword = step.keywords.some((keyword) =>
          lowerAnswer.includes(keyword.toLowerCase())
        )
        if (!hasKeyword) {
          return {
            isValid: false,
            message: `Ответ должен содержать одно из ключевых слов: ${step.keywords.join(", ")}`,
          }
        }
      }
      return { isValid: true }

    case "code_answer":
      if (!answer && answer !== 0) {
        return { isValid: false, message: "Ответ не может быть пустым" }
      }
      if (typeof answer !== "string") {
        return { isValid: false, message: "Введите код" }
      }
      const requiredTokens =
        step.requiredTokens || gameConfig.codeAnswerTokens
      if (requiredTokens && requiredTokens.length > 0) {
        const hasToken = requiredTokens.some((token) =>
          answer.includes(token)
        )
        if (!hasToken) {
          return {
            isValid: false,
            message: `Код должен содержать один из токенов: ${requiredTokens.join(", ")}`,
          }
        }
      }
      return { isValid: true }

    default:
      return { isValid: true }
  }
}
