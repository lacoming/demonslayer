import { NextResponse } from "next/server"
import { chatCompletion } from "@/lib/openrouter"
import { parseAIJSONResponse } from "@/lib/ai-parser"
import { readFileSync } from "fs"
import { join } from "path"
import cyclesData from "@/content/cycles.json"

const SPARRING_PROMPT_PATH = join(process.cwd(), "prompts", "sparring.system.txt")

interface EvaluateRequest {
  rankIndex: number
  rankName: string
  cycleCode: number
  question: string
  userAnswer: string
  keyPoints?: string[]
}

interface SparringFeedback {
  score: number
  passed: boolean
  strengths: string[]
  mistakes: string[]
  missing: string[]
  betterAnswer: string
  followUpQuestion: string
}

/**
 * Нормализует ответ от AI модели, приводя все поля к нужным типам
 */
function normalizeSparringFeedback(input: any): SparringFeedback {
  // Нормализация score
  let score: number
  if (typeof input.score === "number") {
    score = input.score
  } else if (typeof input.score === "string") {
    // Заменяем запятую на точку и парсим
    const s = input.score.trim().replace(",", ".")
    const n = Number.parseFloat(s)
    if (!Number.isNaN(n)) {
      score = n
    } else {
      // Пытаемся извлечь число regex
      const match = input.score.match(/(\d+[.,]\d+|\d+)/)
      if (match) {
        score = Number.parseFloat(match[1].replace(",", "."))
      } else {
        score = 0
      }
    }
  } else {
    score = 0
  }

  // Нормализация passed
  let passed: boolean
  if (typeof input.passed === "boolean") {
    passed = input.passed
  } else if (typeof input.passed === "string") {
    const lower = input.passed.toLowerCase().trim()
    passed = lower === "true" || lower === "1"
  } else {
    // Вычисляем из score
    passed = score >= 7.5
  }

  // Нормализация массивов
  function normalizeArray(field: any): string[] {
    if (Array.isArray(field)) {
      return field.filter((item) => typeof item === "string" && item.trim().length > 0)
    }
    if (typeof field === "string") {
      // Split по разным разделителям
      return field
        .split(/\n|•|-/)
        .map((item) => item.trim())
        .filter((item) => item.length > 0)
    }
    return []
  }

  const strengths = normalizeArray(input.strengths)
  const mistakes = normalizeArray(input.mistakes)
  const missing = normalizeArray(input.missing)

  // Нормализация строк
  const betterAnswer = typeof input.betterAnswer === "string" ? input.betterAnswer : String(input.betterAnswer || "")
  const followUpQuestion = typeof input.followUpQuestion === "string" ? input.followUpQuestion : String(input.followUpQuestion || "")

  return {
    score,
    passed,
    strengths,
    mistakes,
    missing,
    betterAnswer,
    followUpQuestion,
  }
}

export async function POST(request: Request) {
  try {
    const body: EvaluateRequest = await request.json()
    const { rankIndex, rankName, cycleCode, question, userAnswer, keyPoints } =
      body

    if (!rankIndex || !rankName || !cycleCode || !question || !userAnswer) {
      return NextResponse.json(
        { error: "Отсутствуют обязательные поля" },
        { status: 400 }
      )
    }

    if (userAnswer.length < 40) {
      return NextResponse.json(
        { error: "Ответ слишком короткий (минимум 40 символов)" },
        { status: 400 }
      )
    }

    // Read system prompt
    const systemPrompt = readFileSync(SPARRING_PROMPT_PATH, "utf-8")

    // Find cycle title
    const cycle = cyclesData.find((c) => c.code === cycleCode)
    const cycleTitle = cycle?.title || `Цикл ${cycleCode}`

    // Build user message
    const userMessage = JSON.stringify({
      rankName,
      rankIndex,
      cycleTitle,
      question,
      userAnswer,
      keyPointsFromBank: keyPoints || [],
    })

    // Call OpenRouter с response_format, fallback если не поддерживается
    let response: string
    let rawResponse: string = ""
    try {
      // Пытаемся с response_format
      response = await chatCompletion({
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userMessage },
        ],
        maxTokens: 1200,
        temperature: 0.2,
        responseFormat: { type: "json_object" },
        reasoning: { effort: "minimal" },
      })
      rawResponse = response
    } catch (error) {
      // Если ошибка 400/unsupported, пробуем без response_format
      if (
        error instanceof Error &&
        (error.message.includes("400") ||
          error.message.includes("unsupported") ||
          error.message.includes("response_format"))
      ) {
        console.error("SPARRING: response_format not supported, retrying without it")
        try {
          response = await chatCompletion({
            messages: [
              { role: "system", content: systemPrompt },
              { role: "user", content: userMessage },
            ],
            maxTokens: 1200,
            temperature: 0.2,
            reasoning: { effort: "minimal" },
          })
          rawResponse = response
        } catch (retryError) {
          // Проверяем на пустой content после retries
          if (
            retryError instanceof Error &&
            retryError.message.includes("пустой content")
          ) {
            // Извлекаем debug информацию из сообщения об ошибке
            const debugMatch = retryError.message.match(/DEBUG=({.*})/)
            const debug = debugMatch ? JSON.parse(debugMatch[1]) : null
            return NextResponse.json(
              {
                error: "Модель не успела вывести финальный ответ (пустой content)",
                debug: debug || { finish_reason: "length" },
              },
              { status: 502 }
            )
          }
          // Если и повторный вызов упал - это ошибка формата ответа
          return NextResponse.json(
            {
              error: "AI вернул неожиданный формат ответа",
              details: retryError instanceof Error ? retryError.message : String(retryError),
            },
            { status: 502 }
          )
        }
      } else {
        // Проверяем на пустой content после retries
        if (
          error instanceof Error &&
          error.message.includes("пустой content")
        ) {
          // Извлекаем debug информацию из сообщения об ошибке
          const debugMatch = error.message.match(/DEBUG=({.*})/)
          const debug = debugMatch ? JSON.parse(debugMatch[1]) : null
          return NextResponse.json(
            {
              error: "Модель не успела вывести финальный ответ (пустой content)",
              debug: debug || { finish_reason: "length" },
            },
            { status: 502 }
          )
        }
        // Ошибка от chatCompletion - возвращаем 502 с деталями
        return NextResponse.json(
          {
            error: "AI вернул неожиданный формат ответа",
            details: error instanceof Error ? error.message : String(error),
          },
          { status: 502 }
        )
      }
    }

    // Логируем raw response для дебага
    console.error("SPARRING AI RAW:", rawResponse.slice(0, 2000))

    // Parse JSON response using robust parser
    let parsedData: any
    try {
      parsedData = parseAIJSONResponse<any>(response)
    } catch (parseError) {
      console.error("SPARRING AI PARSE ERROR:", parseError)
      console.error("SPARRING AI RAW:", rawResponse.slice(0, 2000))
      return NextResponse.json(
        {
          error: "Не удалось разобрать ответ ИИ",
          debug: rawResponse.slice(0, 1000),
        },
        { status: 502 }
      )
    }

    // Нормализуем feedback
    let feedback: SparringFeedback
    try {
      feedback = normalizeSparringFeedback(parsedData)
    } catch (normalizeError) {
      console.error("SPARRING AI NORMALIZE ERROR:", normalizeError)
      console.error("SPARRING AI PARSED DATA:", JSON.stringify(parsedData).slice(0, 1000))
      return NextResponse.json(
        {
          error: "Не удалось нормализовать ответ ИИ",
          debug: JSON.stringify(parsedData).slice(0, 1000),
        },
        { status: 502 }
      )
    }

    // Валидация и финализация после нормализации
    // Округляем score до 1 знака
    feedback.score = Math.round(feedback.score * 10) / 10
    // Ограничиваем диапазон 0..10
    feedback.score = Math.max(0, Math.min(10, feedback.score))
    // Гарантируем passed = score >= 7.5
    feedback.passed = feedback.score >= 7.5
    // Ограничиваем массивы максимум 5 элементами
    feedback.strengths = feedback.strengths.slice(0, 5)
    feedback.mistakes = feedback.mistakes.slice(0, 5)
    feedback.missing = feedback.missing.slice(0, 5)

    return NextResponse.json({
      score: feedback.score,
      passed: feedback.passed,
      strengths: feedback.strengths,
      mistakes: feedback.mistakes,
      missing: feedback.missing,
      betterAnswer: feedback.betterAnswer,
      followUpQuestion: feedback.followUpQuestion,
    })
  } catch (error) {
    console.error("Error evaluating sparring answer:", error)

    if (error instanceof Error) {
      if (error.message.includes("Лимит") || error.message.includes("429")) {
        return NextResponse.json(
          { error: "Лимит/ошибка AI, попробуйте позже" },
          { status: 429 }
        )
      }
      // Ошибки от chatCompletion (формат ответа) - возвращаем 502
      if (
        error.message.includes("OpenRouter") ||
        error.message.includes("извлекаемого текста") ||
        error.message.includes("без choices") ||
        error.message.includes("невалидный JSON")
      ) {
        return NextResponse.json(
          {
            error: "AI вернул неожиданный формат ответа",
            details: error.message,
          },
          { status: 502 }
        )
      }
      return NextResponse.json(
        { error: error.message || "Ошибка при оценке ответа" },
        { status: 500 }
      )
    }

    return NextResponse.json(
      { error: "Неизвестная ошибка при оценке ответа" },
      { status: 500 }
    )
  }
}
