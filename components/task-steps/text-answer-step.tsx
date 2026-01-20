"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Textarea } from "@/components/ui/textarea"
import { type Step } from "@/lib/task-steps"

interface TextAnswerStepProps {
  step: Step
  answer: string
  onAnswerChange: (answer: string) => void
}

export function TextAnswerStep({
  step,
  answer,
  onAnswerChange,
}: TextAnswerStepProps) {
  const minChars = step.minChars || 80
  const charCount = answer.length
  const isValid = charCount >= minChars

  return (
    <Card>
      <CardHeader>
        <CardTitle>{step.title}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <h3 className="font-semibold mb-2">{step.question}</h3>
        </div>
        <div>
          <Textarea
            value={answer}
            onChange={(e) => onAnswerChange(e.target.value)}
            placeholder="Введите ваш ответ здесь..."
            rows={8}
            className="resize-none"
          />
          <div className="mt-2 text-sm text-muted-foreground">
            Символов: {charCount} / {minChars} (минимум)
            {step.keywords && step.keywords.length > 0 && (
              <div className="mt-1">
                Ключевые слова: {step.keywords.join(", ")}
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
