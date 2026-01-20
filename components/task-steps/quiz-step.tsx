"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { type Step } from "@/lib/task-steps"

interface QuizStepProps {
  step: Step
  selectedOption: number | null
  onSelect: (option: number) => void
}

export function QuizStep({
  step,
  selectedOption,
  onSelect,
}: QuizStepProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>{step.title}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <h3 className="font-semibold mb-2">{step.question}</h3>
        </div>
        <div className="space-y-2">
          {step.options?.map((option, index) => (
            <label
              key={index}
              className="flex items-center space-x-2 p-3 border rounded-md cursor-pointer hover:bg-accent"
            >
              <input
                type="radio"
                name="quiz-option"
                value={index}
                checked={selectedOption === index}
                onChange={() => onSelect(index)}
                className="w-4 h-4"
              />
              <span>{option}</span>
            </label>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}
