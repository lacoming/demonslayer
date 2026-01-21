/**
 * Утилита для парсинга JSON ответов от AI
 * Обрабатывает различные форматы: чистый JSON, JSON в markdown блоках, неполный JSON
 */

/**
 * Извлекает JSON объект из текста, учитывая вложенные структуры
 */
function extractJSON(text: string): string | null {
  // Находим первую открывающую скобку
  let startIdx = text.indexOf('{')
  if (startIdx === -1) return null

  let braceCount = 0
  let inString = false
  let escapeNext = false

  for (let i = startIdx; i < text.length; i++) {
    const char = text[i]

    if (escapeNext) {
      escapeNext = false
      continue
    }

    if (char === '\\') {
      escapeNext = true
      continue
    }

    if (char === '"' && !escapeNext) {
      inString = !inString
      continue
    }

    if (!inString) {
      if (char === '{') braceCount++
      if (char === '}') {
        braceCount--
        if (braceCount === 0) {
          return text.substring(startIdx, i + 1)
        }
      }
    }
  }

  // Если не нашли закрывающую скобку, пытаемся исправить
  if (braceCount > 0) {
    const partial = text.substring(startIdx)
    let fixed = partial
    const openBraces = (partial.match(/\{/g) || []).length
    const closeBraces = (partial.match(/\}/g) || []).length
    const openBrackets = (partial.match(/\[/g) || []).length
    const closeBrackets = (partial.match(/\]/g) || []).length

    // Удаляем незавершенные строки/массивы в конце
    fixed = fixed.replace(/,\s*"[^"]*$/, '') // Незавершенная строка
    fixed = fixed.replace(/,\s*\[[^\]]*$/, '') // Незавершенный массив

    // Закрываем массивы сначала
    fixed += ']'.repeat(Math.max(0, openBrackets - closeBrackets))
    // Затем закрываем объекты
    fixed += '}'.repeat(Math.max(0, openBraces - closeBraces))

    return fixed
  }

  return null
}

/**
 * Парсит JSON ответ от AI с множественными стратегиями fallback
 */
export function parseAIJSONResponse<T = any>(response: string): T {
  // Логируем raw response при первой ошибке парсинга
  let firstError: any = null

  // Strategy 1: Прямой парсинг
  try {
    return JSON.parse(response.trim())
  } catch (e) {
    firstError = e
    // Strategy 2: Удаление markdown блоков и лишнего текста
    try {
      let cleaned = response
        .replace(/```json\s*/gi, "")
        .replace(/```\s*/g, "")
        .replace(/^[^{]*/, "") // Удаляем текст до первой {
        .replace(/[^}]*$/, "") // Удаляем текст после последней }
        .trim()

      // Если после очистки ничего не осталось, пробуем извлечь
      if (!cleaned || cleaned.length === 0) {
        throw new Error("Empty after cleaning")
      }

      return JSON.parse(cleaned)
    } catch (e2) {
      // Strategy 3: Умное извлечение JSON
      try {
        const jsonStr = extractJSON(response)
        if (jsonStr) {
          return JSON.parse(jsonStr)
        } else {
          throw new Error("No JSON object found")
        }
      } catch (e3) {
        // Логируем raw response при первой серьезной ошибке
        if (!firstError) {
          console.error("AI PARSER: First parse error, raw response (first 2000 chars):", response.substring(0, 2000))
        }
        // Strategy 4: Попытка исправить распространенные проблемы
        try {
          let fixed = response
            .replace(/```json\s*/gi, "")
            .replace(/```\s*/g, "")
            .replace(/^[^{]*/, "")
            .trim()

          // Если ответ обрезан, пытаемся закрыть структуры
          if (!fixed.endsWith('}')) {
            const openBraces = (fixed.match(/\{/g) || []).length
            const closeBraces = (fixed.match(/\}/g) || []).length
            const openBrackets = (fixed.match(/\[/g) || []).length
            const closeBrackets = (fixed.match(/\]/g) || []).length

            // Удаляем незавершенные элементы
            fixed = fixed.replace(/,\s*"[^"]*$/, '')
            fixed = fixed.replace(/,\s*\[[^\]]*$/, '')

            // Закрываем структуры
            fixed += ']'.repeat(Math.max(0, openBrackets - closeBrackets))
            fixed += '}'.repeat(Math.max(0, openBraces - closeBraces))
          } else {
            // Удаляем текст после последней }
            fixed = fixed.replace(/}[^}]*$/, '}')
          }

          // Исправляем trailing commas
          fixed = fixed.replace(/,(\s*[}\]])/g, "$1")

          return JSON.parse(fixed)
        } catch (e4) {
          // Strategy 5: Последняя попытка с минимальными исправлениями
          try {
            const jsonStr = extractJSON(response)
            if (jsonStr) {
              let fixed = jsonStr
                // Исправляем trailing commas
                .replace(/,(\s*[}\]])/g, "$1")
                // Исправляем незавершенные строки
                .replace(/:\s*"([^"]*)$/gm, ': ""')
                // Исправляем незавершенные массивы
                .replace(/:\s*\[([^\]]*)$/gm, ': []')

              return JSON.parse(fixed)
            } else {
              throw new Error("Could not extract JSON")
            }
          } catch (e5) {
            // Все стратегии провалились - логируем для отладки
            console.error("All parsing strategies failed:")
            console.error("Raw response length:", response.length)
            console.error("Raw response (first 2000 chars):", response.substring(0, 2000))
            console.error("Raw response (last 500 chars):", response.substring(Math.max(0, response.length - 500)))
            console.error("Parse errors:", { e, e2, e3, e4, e5 })

            throw new Error(
              `Не удалось распарсить ответ AI. Длина ответа: ${response.length} символов. ` +
              `Первые 200 символов: ${response.substring(0, 200)}`
            )
          }
        }
      }
    }
  }
}
