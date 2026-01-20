import Link from "next/link"
import { Button } from "@/components/ui/button"

export default function NotFound() {
  return (
    <div className="flex min-h-screen items-center justify-center">
      <div className="text-center space-y-4">
        <h2 className="text-4xl font-bold">404</h2>
        <p className="text-muted-foreground">Страница не найдена</p>
        <Link href="/">
          <Button variant="breath">Вернуться на главную</Button>
        </Link>
      </div>
    </div>
  )
}
