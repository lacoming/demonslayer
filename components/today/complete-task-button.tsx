"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { useRouter } from "next/navigation"

interface CompleteTaskButtonProps {
  taskId: number
}

export function CompleteTaskButton({ taskId }: CompleteTaskButtonProps) {
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  async function handleComplete() {
    setLoading(true)
    try {
      const res = await fetch(`/api/task/${taskId}/complete`, {
        method: "POST",
      })

      if (!res.ok) {
        throw new Error("Не удалось завершить задачу")
      }

      router.refresh()
    } catch (error) {
      console.error(error)
      alert("Не удалось завершить задачу")
    } finally {
      setLoading(false)
    }
  }

  return (
    <Button
      variant="breath"
      onClick={handleComplete}
      disabled={loading}
    >
      {loading ? "Завершение..." : "Завершить"}
    </Button>
  )
}
