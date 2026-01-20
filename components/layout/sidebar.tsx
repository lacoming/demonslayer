"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { cn } from "@/lib/utils"
import {
  LayoutDashboard,
  Calendar,
  BookOpen,
  Swords,
  Clock,
  Trophy,
  Settings,
} from "lucide-react"

const navItems = [
  { href: "/", label: "Панель управления", icon: LayoutDashboard },
  { href: "/today", label: "Сегодня", icon: Calendar },
  { href: "/cycles", label: "Циклы", icon: BookOpen },
  { href: "/sparring", label: "Спарринг", icon: Swords },
  { href: "/mock", label: "Пробное интервью", icon: Clock },
  { href: "/final-battle", label: "Финальная битва", icon: Trophy },
  { href: "/settings", label: "Настройки", icon: Settings },
]

export function Sidebar() {
  const pathname = usePathname()

  return (
    <aside className="hidden md:flex md:w-64 md:flex-col md:fixed md:inset-y-0 md:left-0 border-r bg-card">
      <div className="flex flex-col flex-1 pt-6">
        <div className="px-6 mb-8">
          <h1 className="text-2xl font-bold bg-gradient-to-r from-blue-400 to-blue-600 bg-clip-text text-transparent">
            Demon Slayer
          </h1>
          <p className="text-sm text-muted-foreground mt-1">Карьерный спринт</p>
        </div>
        <nav className="flex-1 px-3 space-y-1">
          {navItems.map((item) => {
            const Icon = item.icon
            const isActive = pathname === item.href
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex items-center px-3 py-2 text-sm font-medium rounded-md transition-colors",
                  isActive
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                )}
              >
                <Icon className="mr-3 h-5 w-5" />
                {item.label}
              </Link>
            )
          })}
        </nav>
      </div>
    </aside>
  )
}
