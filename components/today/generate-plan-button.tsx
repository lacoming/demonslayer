"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { useRouter } from "next/navigation"
import { toast } from "sonner"

export function GeneratePlanButton() {
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  async function handleGenerate() {
    setLoading(true)
    try {
      const res = await fetch("/api/today/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ force: true }), // Force regeneration
      })

      if (!res.ok) {
        throw new Error("Не удалось создать план")
      }

      toast.success("План на сегодня создан!")
      router.refresh()
    } catch (error) {
      console.error(error)
      toast.error("Не удалось создать план")
    } finally {
      setLoading(false)
    }
  }

  return (
    <Button variant="breath" onClick={handleGenerate} disabled={loading}>
      {loading ? "Создание..." : "Создать/обновить план на сегодня"}
    </Button>
  )
}
