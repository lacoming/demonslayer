"use client"

import { useState } from "react"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Button } from "@/components/ui/button"
import { type GlossaryEntry } from "@/lib/glossary"
import { cn } from "@/lib/utils"

interface GlossaryPopoverProps {
  triggerText: string
  entry: GlossaryEntry
}

export function GlossaryPopover({ triggerText, entry }: GlossaryPopoverProps) {
  const [open, setOpen] = useState(false)

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <span
          className={cn(
            "underline decoration-dotted underline-offset-2",
            "cursor-pointer",
            "hover:text-primary hover:decoration-solid",
            "transition-colors",
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 rounded-sm"
          )}
          onClick={(e) => {
            e.preventDefault()
            setOpen(true)
          }}
        >
          {triggerText}
        </span>
      </PopoverTrigger>
      <PopoverContent className="w-80 max-w-sm" align="start">
        <div className="space-y-3">
          <h4 className="font-semibold text-lg leading-none">{entry.title}</h4>
          <div className="text-sm text-muted-foreground whitespace-pre-line">
            {entry.description}
          </div>
          <Button
            onClick={() => setOpen(false)}
            className="w-full"
            size="sm"
          >
            Понял!
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  )
}
