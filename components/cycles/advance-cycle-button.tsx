"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { useRouter } from "next/navigation"
import { toast } from "sonner"

export function AdvanceCycleButton() {
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  async function handleAdvance() {
    if (!confirm("Вы уверены, что хотите перейти к следующему циклу?")) {
      return
    }

    setLoading(true)
    try {
      const res = await fetch("/api/cycle/advance", {
        method: "POST",
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || "Не удалось перейти к следующему циклу")
      }

      toast.success("Переход к следующему циклу выполнен!")
      router.refresh()
    } catch (error) {
      console.error(error)
      toast.error(
        error instanceof Error
          ? error.message
          : "Не удалось перейти к следующему циклу"
      )
    } finally {
      setLoading(false)
    }
  }

  return (
    <Button variant="breath" onClick={handleAdvance} disabled={loading}>
      {loading ? "Переход..." : "Перейти к следующему циклу"}
    </Button>
  )
}
