import glossaryData from "@/content/glossary.ru.json"

export type GlossaryEntry = {
  title: string
  description: string
  aliases?: string[]
}

type GlossaryData = {
  [key: string]: GlossaryEntry
}

let glossaryMap: Map<string, GlossaryEntry> | null = null

/**
 * Создает и возвращает Map для быстрого поиска терминов
 * Ключи: нормализованные строки (lowercase) для основного термина и всех алиасов
 */
export function getGlossaryMap(): Map<string, GlossaryEntry> {
  if (glossaryMap) {
    return glossaryMap
  }

  glossaryMap = new Map()
  const data = glossaryData as GlossaryData

  for (const [key, entry] of Object.entries(data)) {
    const normalizedKey = key.toLowerCase()
    // Добавляем основной термин
    glossaryMap.set(normalizedKey, entry)

    // Добавляем алиасы
    if (entry.aliases && Array.isArray(entry.aliases)) {
      for (const alias of entry.aliases) {
        glossaryMap.set(alias.toLowerCase(), entry)
      }
    }
  }

  return glossaryMap
}

/**
 * Находит термин в глоссарии по нормализованной строке
 */
export function findTerm(term: string): GlossaryEntry | null {
  const map = getGlossaryMap()
  const normalized = term.toLowerCase()
  return map.get(normalized) || null
}

/**
 * Возвращает все термины, отсортированные по длине (от длинных к коротким)
 * Это нужно для корректного матчинга: сначала ищем длинные фразы, потом короткие
 * Включает все термины (основные + алиасы) для поиска
 */
export function getAllTermsSortedByLengthDesc(): Array<{
  term: string
  entry: GlossaryEntry
}> {
  const map = getGlossaryMap()
  const terms: Array<{ term: string; entry: GlossaryEntry }> = []

  // Собираем все термины из Map (включая алиасы)
  for (const [term, entry] of map.entries()) {
    terms.push({ term, entry })
  }

  // Сортируем по длине (desc)
  return terms.sort((a, b) => b.term.length - a.term.length)
}
