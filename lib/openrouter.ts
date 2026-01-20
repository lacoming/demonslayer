"use server"

interface ChatCompletionParams {
  messages: Array<{
    role: "system" | "user" | "assistant"
    content: string
  }>
  model?: string
  maxTokens?: number
  temperature?: number
}

interface OpenRouterResponse {
  choices?: Array<{
    message?: {
      content?: string | null
    }
  }>
  error?: {
    message: string
    type?: string
  }
}

export async function chatCompletion({
  messages,
  model,
  maxTokens = 450,
  temperature = 0.3,
}: ChatCompletionParams): Promise<string> {
  const apiKey = process.env.OPENROUTER_API_KEY
  const defaultModel = process.env.OPENROUTER_MODEL || "openai/gpt-3.5-turbo"

  if (!apiKey) {
    throw new Error(
      "OPENROUTER_API_KEY не настроен. Пожалуйста, добавьте ключ в .env файл."
    )
  }

  try {
    const requestBody = {
      model: model || defaultModel,
      messages,
      max_tokens: maxTokens,
      temperature,
    }


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
      throw new Error(`OpenRouter вернул ответ без choices. Структура ответа: ${JSON.stringify(data).substring(0, 500)}`)
    }

    // Проверяем наличие message
    const firstChoice = data.choices[0]
    if (!firstChoice || !firstChoice.message) {
      throw new Error(`OpenRouter вернул ответ без message. Структура: ${JSON.stringify(data).substring(0, 500)}`)
    }

    // Проверяем наличие и валидность content
    const content = firstChoice.message.content

    if (content === null || content === undefined) {
      throw new Error(`OpenRouter вернул ответ с null/undefined content. Структура: ${JSON.stringify(data).substring(0, 500)}`)
    }

    if (typeof content !== "string") {
      throw new Error(`OpenRouter вернул content типа ${typeof content} вместо string. Значение: ${String(content).substring(0, 200)}`)
    }

    if (content.trim().length === 0) {
      throw new Error("OpenRouter вернул пустую строку в content")
    }

    return content
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
