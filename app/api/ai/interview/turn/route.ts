import { NextResponse } from "next/server"
import { chatCompletion } from "@/lib/openrouter"
import { parseAIJSONResponse } from "@/lib/ai-parser"
import { readFileSync } from "fs"
import { join } from "path"
import cyclesData from "@/content/cycles.json"
import { prisma } from "@/lib/prisma"

const INTERVIEW_PROMPT_PATH = join(
  process.cwd(),
  "prompts",
  "interview.system.txt"
)

interface InterviewTurnRequest {
  mode: "start" | "answer"
  cycleCode: number
  rankIndex: number
  history?: Array<{ role: "user" | "assistant"; content: string }>
  userAnswer?: string
}

interface InterviewResponse {
  type: "question" | "followup" | "feedback"
  message: string
  score: number | null
  notes: string[] | null
}

export async function POST(request: Request) {
  try {
    const body: InterviewTurnRequest = await request.json()
    const { mode, cycleCode, rankIndex, history = [], userAnswer } = body

    if (!mode || !cycleCode || !rankIndex) {
      return NextResponse.json(
        { error: "Отсутствуют обязательные поля" },
        { status: 400 }
      )
    }

    // Read system prompt
    const systemPrompt = readFileSync(INTERVIEW_PROMPT_PATH, "utf-8")

    // Find cycle title
    const cycle = cyclesData.find((c) => c.code === cycleCode)
    const cycleTitle = cycle?.title || `Цикл ${cycleCode}`

    // Build messages
    const messages: Array<{ role: "system" | "user" | "assistant"; content: string }> = [
      { role: "system", content: systemPrompt },
    ]

    // Add context about cycle and rank
    messages.push({
      role: "user",
      content: `Начинаем интервью по теме: ${cycleTitle}. Уровень сложности: ранг ${rankIndex}. Задавай вопросы по JavaScript, Browser, React, TypeScript и связанным темам.`,
    })

    // Add history (last 6-8 messages)
    const recentHistory = history.slice(-8)
    for (const msg of recentHistory) {
      messages.push({
        role: msg.role === "user" ? "user" : "assistant",
        content: msg.content,
      })
    }

    // Add current user answer if provided
    if (mode === "answer" && userAnswer) {
      messages.push({
        role: "user",
        content: userAnswer,
      })
    }

    // Call OpenRouter и парсим ответ
    const response = await chatCompletion({
      messages,
      maxTokens: 450,
      temperature: 0.3,
    })

    // Parse JSON response using robust parser
    let interviewResponse: InterviewResponse
    try {
      interviewResponse = parseAIJSONResponse<InterviewResponse>(response)
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

    // Validate response structure
    if (
      !["question", "followup", "feedback"].includes(interviewResponse.type) ||
      typeof interviewResponse.message !== "string"
    ) {
      return NextResponse.json(
        { error: "Некорректный формат ответа AI" },
        { status: 500 }
      )
    }

    return NextResponse.json({
      interviewerMessage: interviewResponse.message,
      type: interviewResponse.type,
      score: interviewResponse.score,
      notes: interviewResponse.notes,
    })
  } catch (error) {
    console.error("Error in interview turn:", error)

    if (error instanceof Error) {
      if (error.message.includes("Лимит") || error.message.includes("429")) {
        return NextResponse.json(
          { error: "Лимит/ошибка AI, попробуйте позже" },
          { status: 429 }
        )
      }
      return NextResponse.json(
        { error: error.message || "Ошибка при обработке хода интервью" },
        { status: 500 }
      )
    }

    return NextResponse.json(
      { error: "Неизвестная ошибка при обработке хода интервью" },
      { status: 500 }
    )
  }
}
