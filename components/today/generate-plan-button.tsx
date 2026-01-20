"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { useRouter } from "next/navigation"

export function GeneratePlanButton() {
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  async function handleGenerate() {
    setLoading(true)
    try {
      const res = await fetch("/api/today/generate", {
        method: "POST",
      })

      if (!res.ok) {
        throw new Error("Не удалось создать план")
      }

      router.refresh()
    } catch (error) {
      console.error(error)
      alert("Failed to generate plan")
    } finally {
      setLoading(false)
    }
  }

  return (
    <Button variant="breath" onClick={handleGenerate} disabled={loading}>
      {loading ? "Создание..." : "Создать план на сегодня"}
    </Button>
  )
}
