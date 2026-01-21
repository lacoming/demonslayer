ЗАДАЧА: Исправить пустые ответы OpenRouter (content="") в Sparring и Interview. Сейчас OpenRouter отвечает, но `message.content` пуст, `finish_reason="length"`, а usage показывает что completion токены ушли в reasoning. Нужно гарантировать, что модель выводит финальный JSON.

1) lib/openrouter.ts
- Добавь параметры reasoning и увеличь лимиты:
  - По умолчанию: max_tokens=1200 (или параметр, который реально уходит в body)
  - reasoning: { effort: "minimal" } (fallback: "low")
- В body запроса добавляй:
  - model
  - messages
  - max_tokens
  - temperature=0.2
  - reasoning: { effort: "minimal" }

2) Сделай retry-логику в chatCompletion():
- После получения JSON:
  - const choice = data.choices?.[0]
  - const content = choice?.message?.content
  - const finish = choice?.finish_reason
- Если typeof content === "string" && content.trim()==="" && finish==="length":
  - повторить запрос 1 раз с:
    - max_tokens = Math.max(max_tokens*2, 2000)
    - reasoning.effort = "minimal"
    - и добавить в system: "Ответ ДОЛЖЕН содержать финальный JSON, без рассуждений."
- Если снова пусто — throw с debug (usage, finish_reason, prompt/completion tokens).

3) app/api/ai/sparring/evaluate/route.ts
- При вызове chatCompletion() передавай:
  - max_tokens 1200
  - reasoning.effort minimal
- Если получен пустой content после retries:
  - return 502 с JSON:
    { error: "Модель не успела вывести финальный ответ (пустой content)", debug: { finish_reason, usage } }

4) app/api/ai/interview/turn/route.ts
- Аналогично: max_tokens 1200, reasoning minimal/low.
- Добавь такую же защиту от пустого content.

5) Укороти system prompts:
- В sparring/interview системных промптах убрать длинные списки и оставить:
  - роль
  - критерии оценки
  - строгий JSON формат
  - правило "без текста вокруг"
- Ранги/ожидания передавать в user message кратко:
  { rankIndex, rankName, expectations: "..." }

6) Acceptance:
- После фикса больше нет ошибок “ответ без извлекаемого текста”
- Sparring и Interview стабильно возвращают JSON
- При лимите length модель всё равно выдаёт текст (после retry)