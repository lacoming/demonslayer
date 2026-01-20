"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { useRouter } from "next/navigation"

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

      router.refresh()
    } catch (error: any) {
      console.error(error)
      alert(error.message || "Failed to advance cycle")
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
