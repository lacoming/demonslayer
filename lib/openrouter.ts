"use server"

interface ChatCompletionParams {
  messages: Array<{
    role: "system" | "user" | "assistant"
    content: string
  }>
  model?: string
  maxTokens?: number
  temperature?: number
  responseFormat?: { type: "json_object" }
  reasoning?: { effort: "minimal" | "low" | "medium" | "high" }
}

interface OpenRouterResponse {
  choices?: Array<{
    message?: {
      content?: string | Array<any> | null
      reasoning?: string
      tool_calls?: any[]
    }
    finish_reason?: string
  }>
  usage?: {
    prompt_tokens?: number
    completion_tokens?: number
    total_tokens?: number
  }
  error?: {
    message: string
    type?: string
  }
}

function extractTextFromContent(content: unknown): string | null {
  // Если content - строка, возвращаем как есть
  if (typeof content === "string") {
    return content
  }

  // Если content - массив, собираем текст из элементов
  if (Array.isArray(content)) {
    const texts: string[] = []
    for (const el of content) {
      if (el?.type === "text" && typeof el.text === "string") {
        texts.push(el.text)
      } else if (typeof el.text === "string") {
        texts.push(el.text)
      } else if (typeof el.content === "string") {
        texts.push(el.content)
      }
    }
    const result = texts.join("\n")
    if (result.trim().length > 0) {
      return result
    }
  }

  // Если content - объект, ищем поля text или content
  if (content && typeof content === "object" && !Array.isArray(content)) {
    if (typeof (content as any).text === "string") {
      return (content as any).text
    }
    if (typeof (content as any).content === "string") {
      return (content as any).content
    }
  }

  return null
}

function extractAssistantText(data: any): { text: string | null; debug: any } {
  const firstChoice = data?.choices?.[0]
  const msg = firstChoice?.message

  // Пытаемся извлечь текст из content
  let textFromContent = extractTextFromContent(msg?.content)

  // Если текст извлечен и не пустой после trim - возвращаем
  if (textFromContent && textFromContent.trim().length > 0) {
    return { text: textFromContent, debug: null }
  }

  // Fallback: используем reasoning если есть
  if (typeof msg?.reasoning === "string" && msg.reasoning.trim().length > 0) {
    return { text: msg.reasoning, debug: null }
  }

  // Формируем debug информацию
  const debug = {
    hasChoices: !!data?.choices,
    choiceKeys: Object.keys(firstChoice || {}),
    messageKeys: Object.keys(msg || {}),
    contentType: typeof msg?.content,
    isContentArray: Array.isArray(msg?.content),
    contentPreview:
      typeof msg?.content === "string"
        ? msg.content.slice(0, 200)
        : Array.isArray(msg?.content)
          ? JSON.stringify(msg.content.slice(0, 2))
          : typeof msg?.content === "object" && msg?.content !== null
            ? JSON.stringify(msg.content).slice(0, 200)
            : String(msg?.content),
    finishReason: firstChoice?.finish_reason,
  }

  return { text: null, debug }
}

export async function chatCompletion({
  messages,
  model,
  maxTokens = 1200,
  temperature = 0.2,
  responseFormat,
  reasoning,
}: ChatCompletionParams): Promise<string> {
  const apiKey = process.env.OPENROUTER_API_KEY
  const defaultModel = process.env.OPENROUTER_MODEL || "openai/gpt-3.5-turbo"

  if (!apiKey) {
    throw new Error(
      "OPENROUTER_API_KEY не настроен. Пожалуйста, добавьте ключ в .env файл."
    )
  }

  // Внутренняя функция для выполнения запроса
  const makeRequest = async (
    requestMaxTokens: number,
    requestReasoning?: { effort: "minimal" | "low" | "medium" | "high" },
    requestMessages?: Array<{ role: "system" | "user" | "assistant"; content: string }>
  ): Promise<{ data: OpenRouterResponse; responseText: string }> => {
    const requestBody: any = {
      model: model || defaultModel,
      messages: requestMessages || messages,
      max_tokens: requestMaxTokens,
      temperature,
    }

    if (responseFormat) {
      requestBody.response_format = responseFormat
    }

    // Добавляем reasoning параметр
    const reasoningEffort = requestReasoning?.effort || reasoning?.effort || "minimal"
    requestBody.reasoning = { effort: reasoningEffort }

    const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
        "HTTP-Referer": "http://localhost:3000",
        "X-Title": "Demon Slayer Career Sprint",
      },
      body: JSON.stringify(requestBody),
    })

    // Читаем response body как текст (можно прочитать только один раз!)
    const responseText = await response.text()
    
    // Проверяем статус ответа
    if (!response.ok) {
      let errorMessage = `HTTP ${response.status}: ${response.statusText}`
      
      if (responseText) {
        try {
          const errorData = JSON.parse(responseText)
          errorMessage = errorData.error?.message || errorData.message || errorMessage
        } catch (e) {
          // Если не JSON, используем текст как есть
          errorMessage = responseText.substring(0, 500)
        }
      }
      
      if (response.status === 429) {
        throw new Error("Лимит запросов к AI превышен. Попробуйте позже.")
      }

      throw new Error(`Ошибка OpenRouter: ${errorMessage}`)
    }
    
    if (!responseText || responseText.trim().length === 0) {
      throw new Error("OpenRouter вернул пустой response body")
    }

    // Парсим JSON ответ
    let data: OpenRouterResponse
    try {
      data = JSON.parse(responseText)
    } catch (e) {
      console.error("Failed to parse OpenRouter response as JSON. Raw response:", responseText.substring(0, 2000))
      throw new Error(`OpenRouter вернул невалидный JSON: ${e instanceof Error ? e.message : String(e)}`)
    }

    // Проверяем на ошибку в ответе
    if (data.error) {
      throw new Error(data.error.message || "Ошибка от OpenRouter")
    }

    // Проверяем наличие choices
    if (!data.choices || data.choices.length === 0) {
      const debug = {
        hasChoices: false,
        dataKeys: Object.keys(data || {}),
        dataPreview: JSON.stringify(data).slice(0, 500),
      }
      throw new Error(
        `OpenRouter вернул ответ без choices. DEBUG=${JSON.stringify(debug).slice(0, 1500)}`
      )
    }

    return { data, responseText }
  }

  try {
    // Первый запрос
    let { data, responseText } = await makeRequest(maxTokens, reasoning)

    // Извлекаем текст из ответа
    const choice = data.choices?.[0]
    const content = extractTextFromContent(choice?.message?.content)
    const finishReason = choice?.finish_reason

    // Проверяем на пустой content с finish_reason="length"
    if (
      typeof content === "string" &&
      content.trim() === "" &&
      finishReason === "length"
    ) {
      // Retry с увеличенными параметрами
      console.warn(
        `OpenRouter: пустой content с finish_reason="length", retry с увеличенными параметрами`
      )

      // Увеличиваем max_tokens
      const retryMaxTokens = Math.max(maxTokens * 2, 2000)
      const retryReasoning = { effort: "minimal" as const }

      // Добавляем инструкцию в system message
      const retryMessages = messages.map((msg) => {
        if (msg.role === "system") {
          return {
            ...msg,
            content: `${msg.content}\n\nКРИТИЧЕСКИ ВАЖНО: Ответ ДОЛЖЕН содержать финальный JSON, без рассуждений.`,
          }
        }
        return msg
      })

      // Повторный запрос
      const retryResult = await makeRequest(retryMaxTokens, retryReasoning, retryMessages)
      data = retryResult.data
      responseText = retryResult.responseText

      // Проверяем результат retry
      const retryChoice = data.choices?.[0]
      const retryContent = extractTextFromContent(retryChoice?.message?.content)
      const retryFinishReason = retryChoice?.finish_reason

      if (
        typeof retryContent === "string" &&
        retryContent.trim() === ""
      ) {
        // После retry всё ещё пусто - выбрасываем ошибку с debug
        const debug = {
          finish_reason: retryFinishReason,
          usage: data.usage,
          prompt_tokens: data.usage?.prompt_tokens,
          completion_tokens: data.usage?.completion_tokens,
          total_tokens: data.usage?.total_tokens,
        }
        throw new Error(
          `OpenRouter вернул пустой content после retry. DEBUG=${JSON.stringify(debug)}`
        )
      }

      // Успешно получили контент после retry
      if (retryContent && retryContent.trim().length > 0) {
        return retryContent
      }
    }

    // Обычная обработка ответа
    const { text, debug } = extractAssistantText(data)

    if (text === null || text.trim().length === 0) {
      throw new Error(
        `OpenRouter вернул ответ без извлекаемого текста. DEBUG=${JSON.stringify(debug).slice(0, 1500)}`
      )
    }

    return text
  } catch (error) {
    // Если это уже наша ошибка - пробрасываем дальше
    if (error instanceof Error) {
      throw error
    }
    // Иначе оборачиваем в общую ошибку
    console.error("Unexpected error in chatCompletion:", error)
    throw new Error("Неизвестная ошибка при обращении к OpenRouter")
  }
}
