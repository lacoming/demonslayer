"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Textarea } from "@/components/ui/textarea"
import { type Step } from "@/lib/task-steps"
import { gameConfig } from "@/config/game"

interface CodeAnswerStepProps {
  step: Step
  answer: string
  onAnswerChange: (answer: string) => void
}

export function CodeAnswerStep({
  step,
  answer,
  onAnswerChange,
}: CodeAnswerStepProps) {
  const requiredTokens = step.requiredTokens || gameConfig.codeAnswerTokens
  const hasToken =
    requiredTokens.length > 0 &&
    requiredTokens.some((token) => answer.includes(token))

  return (
    <Card>
      <CardHeader>
        <CardTitle>{step.title}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <h3 className="font-semibold mb-2">{step.prompt}</h3>
        </div>
        <div>
          <Textarea
            value={answer}
            onChange={(e) => onAnswerChange(e.target.value)}
            placeholder="Введите ваш код здесь..."
            rows={12}
            className="resize-none font-mono text-sm"
          />
          {requiredTokens.length > 0 && (
            <div className="mt-2 text-sm text-muted-foreground">
              Требуемые токены: {requiredTokens.join(", ")}
              {hasToken && (
                <span className="ml-2 text-green-600">✓ Найдено</span>
              )}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
