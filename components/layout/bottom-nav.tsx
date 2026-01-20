"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { cn } from "@/lib/utils"
import {
  LayoutDashboard,
  Calendar,
  BookOpen,
  Swords,
  Settings,
} from "lucide-react"

const navItems = [
  { href: "/", label: "Панель", icon: LayoutDashboard },
  { href: "/today", label: "Сегодня", icon: Calendar },
  { href: "/cycles", label: "Циклы", icon: BookOpen },
  { href: "/sparring", label: "Спарринг", icon: Swords },
  { href: "/settings", label: "Настройки", icon: Settings },
]

export function BottomNav() {
  const pathname = usePathname()

  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 border-t bg-card z-50">
      <div className="flex justify-around">
        {navItems.map((item) => {
          const Icon = item.icon
          const isActive = pathname === item.href
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex flex-col items-center justify-center px-4 py-2 text-xs",
                isActive
                  ? "text-primary"
                  : "text-muted-foreground"
              )}
            >
              <Icon className="h-5 w-5 mb-1" />
              <span>{item.label}</span>
            </Link>
          )
        })}
      </div>
    </nav>
  )
}
