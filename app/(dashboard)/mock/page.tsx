"use client"

import { useState, useEffect } from "react"
import { TopBar } from "@/components/layout/top-bar"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { useProgress } from "@/hooks/use-progress"
import { gameConfig } from "@/config/game"
import { toast } from "sonner"
import { format } from "date-fns"
import { Badge } from "@/components/ui/badge"

interface Message {
  role: "user" | "assistant"
  content: string
  score?: number
  notes?: string[]
}

export default function MockPage() {
  const { progress, isLoading } = useProgress()
  const [timer, setTimer] = useState(gameConfig.mockTimerMinutes * 60)
  const [isRunning, setIsRunning] = useState(false)
  const [messages, setMessages] = useState<Message[]>([])
  const [currentAnswer, setCurrentAnswer] = useState("")
  const [isLoadingAI, setIsLoadingAI] = useState(false)
  const [sessionStarted, setSessionStarted] = useState(false)
  const [totalScore, setTotalScore] = useState(0)
  const [questionCount, setQuestionCount] = useState(0)

  useEffect(() => {
    if (isRunning && timer > 0) {
      const interval = setInterval(() => {
        setTimer((t) => {
          if (t <= 1) {
            setIsRunning(false)
            return 0
          }
          return t - 1
        })
      }, 1000)
      return () => clearInterval(interval)
    }
  }, [isRunning, timer])

  async function startInterview() {
    if (!progress) return

    setIsRunning(true)
    setTimer(gameConfig.mockTimerMinutes * 60)
    setSessionStarted(true)
    setMessages([])
    setCurrentAnswer("")
    setTotalScore(0)
    setQuestionCount(0)

    // Start with first question
    await handleInterviewTurn("start", "")
  }

  async function handleInterviewTurn(mode: "start" | "answer", userAnswer: string) {
    if (!progress) return

    setIsLoadingAI(true)
    try {
      // Get unlocked rank index from sparring progress
      const sparringRes = await fetch("/api/sparring/progress")
      let rankIndex = 1
      if (sparringRes.ok) {
        const sparringData = await sparringRes.json()
        rankIndex = sparringData.unlockedRankIndex || 1
      }

      const res = await fetch("/api/ai/interview/turn", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mode,
          cycleCode: progress.currentCycleCode,
          rankIndex,
          history: messages.slice(-8).map((m) => ({
            role: m.role,
            content: m.content,
          })),
          userAnswer: mode === "answer" ? userAnswer : undefined,
        }),
      })

      if (!res.ok) {
        const error = await res.json()
        toast.error(error.error || "Лимит/ошибка AI, попробуйте позже")
        return
      }

      const data = await res.json()

      // Add user message if answering
      if (mode === "answer" && userAnswer) {
        setMessages((prev) => [
          ...prev,
          { role: "user", content: userAnswer },
        ])
      }

      // Add AI response
      const newMessage: Message = {
        role: "assistant",
        content: data.interviewerMessage,
        score: data.score || undefined,
        notes: data.notes || undefined,
      }

      setMessages((prev) => [...prev, newMessage])

      // Update score and question count
      if (data.type === "feedback" && data.score !== null) {
        setTotalScore((prev) => prev + data.score)
        setQuestionCount((prev) => prev + 1)
      }

      setCurrentAnswer("")
    } catch (error) {
      console.error("Failed to handle interview turn:", error)
      toast.error("Ошибка при обработке хода интервью")
    } finally {
      setIsLoadingAI(false)
    }
  }

  async function submitAnswer() {
    if (currentAnswer.trim().length < 20) {
      toast.error("Ответ слишком короткий (минимум 20 символов)")
      return
    }

    await handleInterviewTurn("answer", currentAnswer)
  }

  async function finishInterview() {
    if (!progress) return

    const durationMin = Math.floor(
      (gameConfig.mockTimerMinutes * 60 - timer) / 60
    )
    const avgScore = questionCount > 0 ? totalScore / questionCount : 0

    try {
      const res = await fetch("/api/mock", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          durationMin,
          mode: "TIMED",
          score: Math.round(avgScore),
          notes: `Задано вопросов: ${questionCount}. Средняя оценка: ${avgScore.toFixed(1)}`,
        }),
      })

      if (!res.ok) {
        throw new Error("Не удалось сохранить результаты")
      }

      toast.success("Результаты сохранены!")
      setSessionStarted(false)
      setMessages([])
      setCurrentAnswer("")
      setIsRunning(false)
    } catch (error) {
      console.error(error)
      toast.error("Не удалось сохранить результаты")
    }
  }

  function formatTime(seconds: number): string {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}:${secs.toString().padStart(2, "0")}`
  }

  if (isLoading) {
    return <div>Загрузка...</div>
  }

  if (!progress) {
    return <div>Ошибка загрузки прогресса</div>
  }

  if (!sessionStarted) {
    return (
      <div>
        <TopBar
          rank={progress.rank}
          totalXp={progress.totalXp}
          streak={progress.streak}
        />
        <div className="container mx-auto px-4 py-8">
          <Card>
            <CardHeader>
              <CardTitle>Пробное интервью</CardTitle>
              <CardDescription>
                Симуляция интервью с AI-техлидом ({gameConfig.mockTimerMinutes} минут)
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button variant="breath" onClick={startInterview} className="w-full">
                Начать пробное интервью
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    )
  }

  return (
    <div>
      <TopBar
        rank={progress.rank}
        totalXp={progress.totalXp}
        streak={progress.streak}
      />
      <div className="container mx-auto px-4 py-8 space-y-6">
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Пробное интервью</CardTitle>
              <div className="text-2xl font-mono font-bold">
                {formatTime(timer)}
              </div>
            </div>
            <CardDescription>
              Вопросов задано: {questionCount}
              {questionCount > 0 && (
                <span className="ml-2">
                  • Средняя оценка: {(totalScore / questionCount).toFixed(1)}/10
                </span>
              )}
            </CardDescription>
          </CardHeader>
        </Card>

        {/* Chat Messages */}
        <Card>
          <CardContent className="p-6">
            <div className="space-y-4 max-h-[500px] overflow-y-auto">
              {messages.length === 0 && (
                <div className="text-center text-muted-foreground py-8">
                  Ожидание первого вопроса...
                </div>
              )}
              {messages.map((message, index) => (
                <div
                  key={index}
                  className={`flex ${
                    message.role === "user" ? "justify-end" : "justify-start"
                  }`}
                >
                  <div
                    className={`max-w-[80%] rounded-lg p-4 ${
                      message.role === "user"
                        ? "bg-primary text-primary-foreground"
                        : "bg-muted"
                    }`}
                  >
                    <p className="whitespace-pre-wrap">{message.content}</p>
                    {message.score !== undefined && (
                      <div className="mt-2 pt-2 border-t border-border/50">
                        <Badge variant="outline" className="mr-2">
                          Оценка: {message.score}/10
                        </Badge>
                        {message.notes && message.notes.length > 0 && (
                          <ul className="mt-2 text-sm list-disc list-inside">
                            {message.notes.map((note, i) => (
                              <li key={i}>{note}</li>
                            ))}
                          </ul>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              ))}
              {isLoadingAI && (
                <div className="flex justify-start">
                  <div className="bg-muted rounded-lg p-4">
                    <p className="text-muted-foreground">AI думает...</p>
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Answer Input */}
        {!isLoadingAI && (
          <Card>
            <CardContent className="p-6 space-y-4">
              <Textarea
                value={currentAnswer}
                onChange={(e) => setCurrentAnswer(e.target.value)}
                placeholder="Введите ваш ответ..."
                rows={4}
                disabled={isLoadingAI}
              />
              <div className="flex gap-2">
                <Button
                  variant="default"
                  onClick={submitAnswer}
                  disabled={currentAnswer.trim().length < 20 || isLoadingAI}
                  className="flex-1"
                >
                  Отправить ответ
                </Button>
                <Button
                  variant="destructive"
                  onClick={finishInterview}
                  disabled={isLoadingAI}
                >
                  Завершить интервью
                </Button>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}
