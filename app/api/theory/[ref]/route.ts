import { NextResponse } from "next/server"
import { getTheoryMarkdown } from "@/lib/theory"

export async function GET(
  request: Request,
  { params }: { params: { ref: string } }
) {
  try {
    const { ref } = params

    if (!ref) {
      return NextResponse.json(
        { error: "Ссылка на теорию не указана" },
        { status: 400 }
      )
    }

    const markdown = await getTheoryMarkdown(ref)

    // Возвращаем markdown как текст с правильным content-type
    return new NextResponse(markdown, {
      headers: {
        "Content-Type": "text/markdown; charset=utf-8",
      },
    })
  } catch (error) {
    console.error("Error loading theory:", error)
    const errorMessage =
      error instanceof Error ? error.message : "Не удалось загрузить теорию"
    return NextResponse.json({ error: errorMessage }, { status: 404 })
  }
}
