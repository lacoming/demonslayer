import { readFile } from "fs/promises"
import { join } from "path"

/**
 * Загружает markdown-файл теории по ссылке
 * @param ref - ссылка вида "js-core/event-loop" или "browser/dom"
 * @returns содержимое markdown-файла
 * @throws Error если файл не найден
 */
export async function getTheoryMarkdown(ref: string): Promise<string> {
  // Валидация ref для безопасности (предотвращение path traversal)
  if (!ref || ref.includes("..") || ref.includes("/") === false) {
    throw new Error(`Некорректная ссылка на теорию: ${ref}`)
  }

  // Маппинг ref на путь к файлу
  // "js-core/event-loop" → content/theory/js-core/event-loop.md
  const filePath = join(process.cwd(), "content", "theory", `${ref}.md`)

  try {
    const content = await readFile(filePath, "utf-8")
    return content
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") {
      throw new Error(`Файл теории не найден: ${ref}`)
    }
    throw error
  }
}

/**
 * Получает краткую выжимку из теории (первые N символов)
 * Полезно для использования в AI контексте (sparring/interview)
 * @param ref - ссылка вида "js-core/event-loop"
 * @param maxChars - максимальное количество символов (по умолчанию 500)
 * @returns краткая выжимка теории
 */
export async function getTheorySummary(
  ref: string,
  maxChars: number = 500
): Promise<string> {
  const fullContent = await getTheoryMarkdown(ref)
  
  if (fullContent.length <= maxChars) {
    return fullContent
  }

  // Обрезаем до maxChars, стараясь не обрезать посередине слова
  let summary = fullContent.slice(0, maxChars)
  const lastSpace = summary.lastIndexOf(" ")
  const lastNewline = summary.lastIndexOf("\n")
  const cutPoint = Math.max(lastSpace, lastNewline)
  
  if (cutPoint > maxChars * 0.8) {
    // Если нашли хорошую точку обрезки (не слишком рано)
    summary = summary.slice(0, cutPoint)
  }
  
  return summary.trim() + "..."
}
