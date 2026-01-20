"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { useRouter } from "next/navigation"
import { toast } from "sonner"

interface StartTaskButtonProps {
  taskId: number
}

export function StartTaskButton({ taskId }: StartTaskButtonProps) {
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  async function handleStart() {
    setLoading(true)
    try {
      const res = await fetch("/api/task-sessions/start", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ dailyTaskId: taskId }),
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || "Не удалось начать задание")
      }

      const data = await res.json()
      router.push(`/today/tasks/${taskId}`)
    } catch (error) {
      console.error(error)
      toast.error(
        error instanceof Error ? error.message : "Не удалось начать задание"
      )
    } finally {
      setLoading(false)
    }
  }

  return (
    <Button
      variant="default"
      onClick={handleStart}
      disabled={loading}
      className="bg-green-600 hover:bg-green-700"
    >
      {loading ? "Загрузка..." : "Начать"}
    </Button>
  )
}
