"use client"

import { useState, useEffect } from "react"
import { TopBar } from "@/components/layout/top-bar"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import questionsData from "@/content/questions.json"
import { useProgress } from "@/hooks/use-progress"

export default function SparringPage() {
  const { progress, isLoading } = useProgress()
  const [currentQuestion, setCurrentQuestion] = useState<any>(null)
  const [answer, setAnswer] = useState("")
  const [showKeyPoints, setShowKeyPoints] = useState(false)

  useEffect(() => {
    if (progress && !currentQuestion) {
      loadRandomQuestion()
    }
  }, [progress])

  function loadRandomQuestion() {
    if (!progress) return

    const cycleQuestions = questionsData.filter(
      (q) => q.cycleCode === progress.currentCycleCode
    )

    if (cycleQuestions.length === 0) {
      alert("Нет доступных вопросов для текущего цикла")
      return
    }

    const random = Math.floor(Math.random() * cycleQuestions.length)
    setCurrentQuestion(cycleQuestions[random])
    setAnswer("")
    setShowKeyPoints(false)
  }

  if (isLoading) {
    return <div>Загрузка...</div>
  }

  if (!progress) {
    return <div>Ошибка загрузки прогресса</div>
  }

  return (
    <div>
      <TopBar
        rank={progress.rank}
        totalXp={progress.totalXp}
        streak={progress.streak}
      />

      <div className="container mx-auto px-4 py-8 space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Sparring Practice</h1>
          <p className="text-muted-foreground mt-1">
            Practice answering interview questions from your current cycle
          </p>
        </div>

        {currentQuestion ? (
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>{currentQuestion.category}</CardTitle>
                  <CardDescription>
                    Цикл {currentQuestion.cycleCode}
                  </CardDescription>
                </div>
                <Button variant="outline" onClick={loadRandomQuestion}>
                  Next Question
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <h3 className="font-semibold mb-2">Вопрос:</h3>
                <p className="text-lg">{currentQuestion.question}</p>
              </div>

              <div>
                <label className="text-sm font-medium mb-2 block">
                  Ваш ответ:
                </label>
                <Textarea
                  value={answer}
                  onChange={(e) => setAnswer(e.target.value)}
                  placeholder="Напишите ваш ответ здесь..."
                  rows={6}
                />
              </div>

              <div className="flex gap-2">
                <Button
                  variant="outline"
                  onClick={() => setShowKeyPoints(!showKeyPoints)}
                >
                  {showKeyPoints ? "Скрыть" : "Показать"} ключевые пункты
                </Button>
                <Button variant="breath" onClick={loadRandomQuestion}>
                  Следующий вопрос
                </Button>
              </div>

              {showKeyPoints && (
                <div className="border-t pt-4">
                  <h4 className="font-semibold mb-2">Key Points:</h4>
                  <ul className="list-disc list-inside space-y-1 text-sm">
                    {currentQuestion.keyPoints.map((point: string, i: number) => (
                      <li key={i}>{point}</li>
                    ))}
                  </ul>
                </div>
              )}
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardContent className="py-12 text-center">
              <p className="text-muted-foreground mb-4">
                Нет доступных вопросов. Нажмите, чтобы загрузить вопрос.
              </p>
              <Button variant="breath" onClick={loadRandomQuestion}>
                Загрузить вопрос
              </Button>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}
