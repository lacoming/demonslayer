"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Trophy, Sparkles } from "lucide-react"

export function VictoryScreen() {
  const [showVictory, setShowVictory] = useState(false)

  if (!showVictory) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Trophy className="h-6 w-6 text-yellow-500" />
            Готов к битве
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground mb-4">
            Вы доказали свою ценность. Пришло время столкнуться с Музаном
            и заявить о своей победе.
          </p>
          <Button variant="breath" onClick={() => setShowVictory(true)} className="w-full">
            Победить Музана
          </Button>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="border-2 border-yellow-500">
      <CardContent className="py-12 text-center space-y-6">
        <div className="flex justify-center">
          <Trophy className="h-24 w-24 text-yellow-500" />
        </div>
        <div>
          <h2 className="text-4xl font-bold mb-2 bg-gradient-to-r from-yellow-400 to-orange-500 bg-clip-text text-transparent">
            Цель достигнута
          </h2>
          <p className="text-xl text-muted-foreground mt-2">
            Вы победили Музана
          </p>
        </div>
        <div className="space-y-2">
          <p className="text-lg">
            Благодаря преданности, постоянству и мастерству в своём деле, вы
            достигли конечной цели.
          </p>
          <p className="text-muted-foreground">
            Ваше путешествие как истребителя демонов завершено. Вы стоите как Хашира,
            готовый встретить любой вызов.
          </p>
        </div>
        <div className="flex items-center justify-center gap-2 text-yellow-500">
          <Sparkles className="h-5 w-5" />
          <span className="font-semibold">Поздравляем!</span>
          <Sparkles className="h-5 w-5" />
        </div>
      </CardContent>
    </Card>
  )
}
