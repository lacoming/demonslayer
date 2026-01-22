"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { type Step } from "@/lib/task-steps"
import { MarkdownView } from "@/components/shared/markdown-view"

interface TheoryStepProps {
  step: Step
}

export function TheoryStep({ step }: TheoryStepProps) {
  const [markdownContent, setMarkdownContent] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    // Если есть theoryRef, загружаем markdown через API
    if (step.theoryRef) {
      setIsLoading(true)
      setError(null)
      
      fetch(`/api/theory/${encodeURIComponent(step.theoryRef)}`)
        .then((res) => {
          if (!res.ok) {
            throw new Error(`Не удалось загрузить теорию: ${res.statusText}`)
          }
          return res.text()
        })
        .then((text) => {
          setMarkdownContent(text)
          setIsLoading(false)
        })
        .catch((err) => {
          setError(err instanceof Error ? err.message : "Ошибка загрузки теории")
          setIsLoading(false)
        })
    } else {
      // Если нет theoryRef, используем content как fallback
      setMarkdownContent(step.content || null)
    }
  }, [step.theoryRef, step.content])

  return (
    <Card>
      <CardHeader>
        <CardTitle>{step.title}</CardTitle>
      </CardHeader>
      <CardContent>
        {isLoading && <div className="text-muted-foreground">Загрузка теории...</div>}
        {error && (
          <div className="text-destructive">
            {error}
            {step.content && (
              <div className="mt-4">
                <MarkdownView content={step.content} />
              </div>
            )}
          </div>
        )}
        {!isLoading && !error && markdownContent && (
          <MarkdownView content={markdownContent} />
        )}
        {!isLoading && !error && !markdownContent && (
          <div className="text-muted-foreground">Теория не найдена</div>
        )}
      </CardContent>
    </Card>
  )
}
