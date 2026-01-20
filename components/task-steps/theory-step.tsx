"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { type Step } from "@/lib/task-steps"
import { MarkdownView } from "@/components/shared/markdown-view"

interface TheoryStepProps {
  step: Step
}

export function TheoryStep({ step }: TheoryStepProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>{step.title}</CardTitle>
      </CardHeader>
      <CardContent>
        {step.content && <MarkdownView content={step.content} />}
      </CardContent>
    </Card>
  )
}
