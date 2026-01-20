"use client"

import { useState, useEffect } from "react"

interface Progress {
  totalXp: number
  rank: string
  streak: number
  currentCycleCode: number
}

export function useProgress() {
  const [progress, setProgress] = useState<Progress | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    async function fetchProgress() {
      try {
        const res = await fetch("/api/progress")
        if (res.ok) {
          const data = await res.json()
          setProgress(data)
        }
      } catch (error) {
        console.error("Failed to fetch progress:", error)
      } finally {
        setIsLoading(false)
      }
    }

    fetchProgress()
  }, [])

  return { progress, isLoading }
}
