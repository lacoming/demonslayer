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

    // Call OpenRouter и парсим ответ
    const response = await chatCompletion({
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userMessage },
      ],
      maxTokens: 450,
      temperature: 0.3,
    })

    // Parse JSON response using robust parser
    let feedback: SparringFeedback
    try {
      feedback = parseAIJSONResponse<SparringFeedback>(response)
    } catch (parseError) {
      console.error("Failed to parse AI response. Raw response:", response)
      console.error("Parse error:", parseError)
      return NextResponse.json(
        { 
          error: parseError instanceof Error ? parseError.message : "Ошибка парсинга ответа AI"
        },
        { status: 500 }
      )
    }

    // Validate and normalize feedback structure
    if (typeof feedback.score !== "number") {
      console.error("Invalid score type:", typeof feedback.score, feedback.score)
      return NextResponse.json(
        { error: "Некорректный формат ответа AI: score должен быть числом" },
        { status: 500 }
      )
    }
    
    // Ensure arrays exist and are arrays
    if (!Array.isArray(feedback.strengths)) {
      feedback.strengths = []
    }
    if (!Array.isArray(feedback.mistakes)) {
      feedback.mistakes = []
    }
    if (!Array.isArray(feedback.missing)) {
      feedback.missing = []
    }
    
    // Ensure strings exist
    if (typeof feedback.betterAnswer !== "string") {
      feedback.betterAnswer = String(feedback.betterAnswer || "")
    }
    if (typeof feedback.followUpQuestion !== "string") {
      feedback.followUpQuestion = String(feedback.followUpQuestion || "")
    }
    
    // Ensure passed is boolean
    if (typeof feedback.passed !== "boolean") {
      // Derive from score if not provided
      feedback.passed = feedback.score >= 7.5
    }
    
    // Clamp score to 0-10 range
    feedback.score = Math.max(0, Math.min(10, feedback.score))

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
