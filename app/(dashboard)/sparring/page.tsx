"use client"

import { useState, useEffect } from "react"
import { TopBar } from "@/components/layout/top-bar"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { useProgress } from "@/hooks/use-progress"
import { toast } from "sonner"
import { gameConfig } from "@/config/game"
import { HunterMarkProgress } from "@/components/shared/hunter-mark-progress"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { format } from "date-fns"

interface SparringProgress {
  totalPoints: number
  unlockedRankIndex: number
  markPoints: number
  lastQuestionId: number | null
}

interface Question {
  id: number
  cycleCode: number
  category: string
  question: string
  keyPoints: string[]
}

interface EvaluationResult {
  score: number
  passed: boolean
  strengths: string[]
  mistakes: string[]
  missing: string[]
  betterAnswer: string
  followUpQuestion: string
}

const RANK_NAMES = [
  "Мизуното",
  "Мизуноэ",
  "Каното",
  "Каноэ",
  "Цутиното",
  "Цутиноэ",
  "Хиното",
  "Хиноэ",
  "Киното",
  "Киноэ",
  "Хашира",
]

export default function SparringPage() {
  const { progress, isLoading } = useProgress()
  const [sparringProgress, setSparringProgress] = useState<SparringProgress | null>(null)
  const [selectedRankIndex, setSelectedRankIndex] = useState<number>(1)
  const [currentQuestion, setCurrentQuestion] = useState<Question | null>(null)
  const [answer, setAnswer] = useState("")
  const [evaluationResult, setEvaluationResult] = useState<EvaluationResult | null>(null)
  const [isEvaluating, setIsEvaluating] = useState(false)
  const [isLoadingQuestion, setIsLoadingQuestion] = useState(false)

  useEffect(() => {
    loadSparringProgress()
  }, [])

  useEffect(() => {
    if (sparringProgress && progress) {
      setSelectedRankIndex(Math.min(selectedRankIndex, sparringProgress.unlockedRankIndex))
    }
  }, [sparringProgress])

  async function loadSparringProgress() {
    try {
      const res = await fetch("/api/sparring/progress")
      if (res.ok) {
        const data = await res.json()
        setSparringProgress(data)
        if (data.unlockedRankIndex) {
          setSelectedRankIndex(data.unlockedRankIndex)
        }
      }
    } catch (error) {
      console.error("Failed to load sparring progress:", error)
    }
  }

  async function loadQuestion() {
    if (!progress || !sparringProgress) return

    setIsLoadingQuestion(true)
    try {
      const res = await fetch("/api/sparring/question", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          rankIndex: selectedRankIndex,
          cycleCode: progress.currentCycleCode,
        }),
      })

      if (!res.ok) {
        const error = await res.json()
        toast.error(error.error || "Не удалось загрузить вопрос")
        return
      }

      const question = await res.json()
      setCurrentQuestion(question)
      setAnswer("")
      setEvaluationResult(null)
    } catch (error) {
      console.error("Failed to load question:", error)
      toast.error("Не удалось загрузить вопрос")
    } finally {
      setIsLoadingQuestion(false)
    }
  }

  async function evaluateAnswer() {
    if (!currentQuestion || !progress || !sparringProgress || answer.length < 40) {
      toast.error("Ответ должен содержать минимум 40 символов")
      return
    }

    setIsEvaluating(true)
    try {
      const res = await fetch("/api/ai/sparring/evaluate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          rankIndex: selectedRankIndex,
          rankName: RANK_NAMES[selectedRankIndex - 1],
          cycleCode: progress.currentCycleCode,
          question: currentQuestion.question,
          userAnswer: answer,
          keyPoints: currentQuestion.keyPoints,
        }),
      })

      if (!res.ok) {
        const error = await res.json()
        toast.error(error.error || "Лимит/ошибка AI, попробуйте позже")
        return
      }

      const result: EvaluationResult = await res.json()
      setEvaluationResult(result)

      // Save attempt
      const today = format(new Date(), "yyyy-MM-dd")
      const pointsAwarded = result.passed ? selectedRankIndex : 0

      await fetch("/api/sparring/attempt", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          date: today,
          rankIndex: selectedRankIndex,
          question: currentQuestion.question,
          userAnswer: answer,
          aiScore: result.score,
          passed: result.passed,
          pointsAwarded,
          feedbackJson: JSON.stringify(result),
        }),
      })

      // Update progress if passed
      if (result.passed) {
        const newTotalPoints = sparringProgress.totalPoints + pointsAwarded
        const newMarkPoints = sparringProgress.markPoints + pointsAwarded
        const newUnlockedRankIndex = Math.min(11, 1 + Math.floor(newTotalPoints / 1000))
        const oldStep = 1 + Math.floor(sparringProgress.markPoints / 1000)
        const newStep = 1 + Math.floor(newMarkPoints / 1000)

        setSparringProgress({
          ...sparringProgress,
          totalPoints: newTotalPoints,
          markPoints: newMarkPoints,
          unlockedRankIndex: newUnlockedRankIndex,
        })

        toast.success(`+${pointsAwarded} опыта метки`)

        if (newStep > oldStep) {
          toast.success(`Метка усилилась: ступень ${newStep}`)
        }
      } else {
        toast.error("Ответ не засчитан. Оценка ниже 7.5")
      }
    } catch (error) {
      console.error("Failed to evaluate answer:", error)
      toast.error("Ошибка при оценке ответа")
    } finally {
      setIsEvaluating(false)
    }
  }

  if (isLoading || !progress) {
    return <div>Загрузка...</div>
  }

  if (!sparringProgress) {
    return <div>Ошибка загрузки прогресса спарринга</div>
  }

  return (
    <div>
      <TopBar
        rank={progress.rank}
        totalXp={progress.totalXp}
        streak={progress.streak}
      />

      <div className="container mx-auto px-4 py-8 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Спарринг</h1>
            <p className="text-muted-foreground mt-1">
              Практикуйтесь в ответах на вопросы интервью
            </p>
          </div>
        </div>

        {/* Hunter's Mark Progress */}
        <Card>
          <CardHeader>
            <CardTitle>Метка охотника</CardTitle>
          </CardHeader>
          <CardContent>
            <HunterMarkProgress markPoints={sparringProgress.markPoints} />
          </CardContent>
        </Card>

        {/* Rank Selector */}
        <Card>
          <CardHeader>
            <CardTitle>Выбор уровня сложности</CardTitle>
            <CardDescription>
              Выберите ранг для практики. Доступны уровни до {RANK_NAMES[sparringProgress.unlockedRankIndex - 1]}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Select
              value={selectedRankIndex.toString()}
              onValueChange={(value) => setSelectedRankIndex(parseInt(value))}
            >
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {RANK_NAMES.map((name, index) => {
                  const rankIndex = index + 1
                  const isUnlocked = rankIndex <= sparringProgress.unlockedRankIndex
                  return (
                    <SelectItem
                      key={rankIndex}
                      value={rankIndex.toString()}
                      disabled={!isUnlocked}
                    >
                      {name} ({rankIndex} балл{rankIndex > 1 ? "а" : ""})
                      {!isUnlocked && " (заблокировано)"}
                    </SelectItem>
                  )
                })}
              </SelectContent>
            </Select>
          </CardContent>
        </Card>

        {/* Question Card */}
        {currentQuestion ? (
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>{currentQuestion.category}</CardTitle>
                  <CardDescription>
                    Цикл {currentQuestion.cycleCode} • {RANK_NAMES[selectedRankIndex - 1]}
                  </CardDescription>
                </div>
                <Button variant="outline" onClick={loadQuestion} disabled={isLoadingQuestion}>
                  Следующий вопрос
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <h3 className="font-semibold mb-2">Вопрос:</h3>
                <p className="text-lg">{currentQuestion.question}</p>
              </div>

              {!evaluationResult && (
                <>
                  <div>
                    <label className="text-sm font-medium mb-2 block">
                      Ваш ответ:
                    </label>
                    <Textarea
                      value={answer}
                      onChange={(e) => setAnswer(e.target.value)}
                      placeholder="Напишите ваш ответ здесь (минимум 40 символов)..."
                      rows={8}
                      disabled={isEvaluating}
                    />
                    <div className="text-sm text-muted-foreground mt-1">
                      Символов: {answer.length} / 40
                    </div>
                  </div>

                  <Button
                    variant="default"
                    onClick={evaluateAnswer}
                    disabled={answer.length < 40 || isEvaluating}
                    className="w-full"
                  >
                    {isEvaluating ? "Оценивается..." : "Отправить на оценку"}
                  </Button>
                </>
              )}

              {/* Evaluation Results */}
              {evaluationResult && (
                <div className="space-y-4 border-t pt-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="font-semibold text-lg">
                        Оценка: {evaluationResult.score.toFixed(1)} / 10
                      </h3>
                      <Badge
                        variant={evaluationResult.passed ? "default" : "destructive"}
                        className="mt-2"
                      >
                        {evaluationResult.passed ? "ЗАСЧИТАНО" : "НЕ ЗАСЧИТАНО"}
                      </Badge>
                    </div>
                  </div>

                  {evaluationResult.strengths.length > 0 && (
                    <div>
                      <h4 className="font-semibold mb-2 text-green-600">Сильные стороны:</h4>
                      <ul className="list-disc list-inside space-y-1 text-sm">
                        {evaluationResult.strengths.map((strength, i) => (
                          <li key={i}>{strength}</li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {evaluationResult.mistakes.length > 0 && (
                    <div>
                      <h4 className="font-semibold mb-2 text-red-600">Ошибки:</h4>
                      <ul className="list-disc list-inside space-y-1 text-sm">
                        {evaluationResult.mistakes.map((mistake, i) => (
                          <li key={i}>{mistake}</li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {evaluationResult.missing.length > 0 && (
                    <div>
                      <h4 className="font-semibold mb-2 text-yellow-600">Пропущено:</h4>
                      <ul className="list-disc list-inside space-y-1 text-sm">
                        {evaluationResult.missing.map((item, i) => (
                          <li key={i}>{item}</li>
                        ))}
                      </ul>
                    </div>
                  )}

                  <div>
                    <h4 className="font-semibold mb-2">Как лучше ответить:</h4>
                    <div className="bg-muted p-4 rounded-md text-sm">
                      {evaluationResult.betterAnswer}
                    </div>
                  </div>

                  <div>
                    <h4 className="font-semibold mb-2">Уточняющий вопрос:</h4>
                    <p className="text-sm text-muted-foreground">
                      {evaluationResult.followUpQuestion}
                    </p>
                  </div>

                  <Button
                    variant="default"
                    onClick={loadQuestion}
                    disabled={isLoadingQuestion}
                    className="w-full"
                  >
                    Следующий вопрос
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardContent className="py-12 text-center">
              <p className="text-muted-foreground mb-4">
                Нажмите кнопку, чтобы начать спарринг
              </p>
              <Button
                variant="default"
                onClick={loadQuestion}
                disabled={isLoadingQuestion}
              >
                {isLoadingQuestion ? "Загрузка..." : "Начать спарринг"}
              </Button>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}
