"use client"

import { useState, useEffect } from "react"
import { TopBar } from "@/components/layout/top-bar"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { useProgress } from "@/hooks/use-progress"
import questionsData from "@/content/questions.json"
import { gameConfig } from "@/config/game"

export default function MockPage() {
  const { progress, isLoading } = useProgress()
  const [timer, setTimer] = useState(gameConfig.mockTimerMinutes * 60)
  const [isRunning, setIsRunning] = useState(false)
  const [questions, setQuestions] = useState<any[]>([])
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0)
  const [answers, setAnswers] = useState<Record<number, string>>({})
  const [showResults, setShowResults] = useState(false)
  const [score, setScore] = useState(5)
  const [notes, setNotes] = useState("")
  const [pastRounds, setPastRounds] = useState<any[]>([])

  useEffect(() => {
    if (isRunning && timer > 0) {
      const interval = setInterval(() => {
        setTimer((t) => {
          if (t <= 1) {
            setIsRunning(false)
            setShowResults(true)
            return 0
          }
          return t - 1
        })
      }, 1000)
      return () => clearInterval(interval)
    }
  }, [isRunning, timer])

  useEffect(() => {
    loadPastRounds()
  }, [])

  function startMock() {
    if (!progress) return

    // Select 4-6 random questions from current cycle
    const cycleQuestions = questionsData.filter(
      (q) => q.cycleCode === progress.currentCycleCode
    )

    if (cycleQuestions.length === 0) {
      alert("Нет доступных вопросов для текущего цикла")
      return
    }

    const shuffled = [...cycleQuestions].sort(() => Math.random() - 0.5)
    const selected = shuffled.slice(0, Math.min(6, cycleQuestions.length))

    setQuestions(selected)
    setCurrentQuestionIndex(0)
    setAnswers({})
    setTimer(gameConfig.mockTimerMinutes * 60)
    setIsRunning(true)
    setShowResults(false)
    setScore(5)
    setNotes("")
  }

  function formatTime(seconds: number): string {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}:${secs.toString().padStart(2, "0")}`
  }

  async function submitResults() {
    try {
      const durationMin = Math.floor(
        (gameConfig.mockTimerMinutes * 60 - timer) / 60
      )

      const res = await fetch("/api/mock", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          durationMin,
          mode: "TIMED",
          score,
          notes,
        }),
      })

      if (!res.ok) {
        throw new Error("Failed to save results")
      }

      loadPastRounds()
      setShowResults(false)
      setQuestions([])
    } catch (error) {
      console.error(error)
      alert("Не удалось сохранить результаты")
    }
  }

  async function loadPastRounds() {
    try {
      const res = await fetch("/api/mock")
      if (res.ok) {
        const data = await res.json()
        setPastRounds(data.rounds || [])
      }
    } catch (error) {
      console.error("Failed to load past rounds:", error)
    }
  }

  if (isLoading) {
    return <div>Loading...</div>
  }

  if (!progress) {
    return <div>Error loading progress</div>
  }

  if (questions.length === 0 && !showResults) {
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
                Практикуйтесь с интервью с таймером ({gameConfig.mockTimerMinutes} минут)
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button variant="breath" onClick={startMock} className="w-full">
                Начать пробное интервью
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    )
  }

  if (showResults) {
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
              <CardTitle>Интервью завершено</CardTitle>
              <CardDescription>Оцените свою работу</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="text-sm font-medium mb-2 block">
                  Self Score (0-10):
                </label>
                <input
                  type="range"
                  min="0"
                  max="10"
                  value={score}
                  onChange={(e) => setScore(parseInt(e.target.value))}
                  className="w-full"
                />
                <div className="text-center mt-1">{score}/10</div>
              </div>

              <div>
                <label className="text-sm font-medium mb-2 block">Заметки:</label>
                <Textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Что прошло хорошо? Что улучшить?"
                  rows={4}
                />
              </div>

              <Button variant="breath" onClick={submitResults} className="w-full">
                Save Results
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    )
  }

  const currentQuestion = questions[currentQuestionIndex]

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
              Вопрос {currentQuestionIndex + 1} из {questions.length}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <h3 className="font-semibold mb-2">{currentQuestion.question}</h3>
              <p className="text-sm text-muted-foreground">
                {currentQuestion.category} - Цикл {currentQuestion.cycleCode}
              </p>
            </div>

            <div>
              <label className="text-sm font-medium mb-2 block">
                Ваш ответ:
              </label>
              <Textarea
                value={answers[currentQuestionIndex] || ""}
                onChange={(e) =>
                  setAnswers({ ...answers, [currentQuestionIndex]: e.target.value })
                }
                placeholder="Напишите ваш ответ здесь..."
                rows={8}
              />
            </div>

            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={() =>
                  setCurrentQuestionIndex(Math.max(0, currentQuestionIndex - 1))
                }
                disabled={currentQuestionIndex === 0}
              >
                Previous
              </Button>
              <Button
                variant="outline"
                onClick={() =>
                  setCurrentQuestionIndex(
                    Math.min(questions.length - 1, currentQuestionIndex + 1)
                  )
                }
                disabled={currentQuestionIndex === questions.length - 1}
              >
                Next
              </Button>
            </div>
          </CardContent>
        </Card>

        {pastRounds.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Прошлые раунды</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {pastRounds.slice(0, 5).map((round) => (
                  <div
                    key={round.id}
                    className="flex justify-between items-center p-2 bg-muted rounded"
                  >
                    <div>
                      <div className="font-medium">
                        {round.date} - Оценка: {round.score}/10
                      </div>
                      <div className="text-sm text-muted-foreground">
                        {round.durationMin} мин - {round.mode === "TIMED" ? "С таймером" : "Без таймера"}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}
