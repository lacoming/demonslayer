Нужно починить подсветку терминов глоссария в MarkdownView: сейчас термины не выделяются вообще (нет подчёркивания, нет popover). Кириллица + фразы должны работать стабильно.

1) Диагностика (обязательно):
- В MarkdownView добавь временный debug (только в dev):
  console.log("[glossary] terms:", terms.length, "sample:", terms.slice(0,5))
- Если terms.length === 0 — покажи в UI маленькое предупреждение (dev only): "Glossary пуст"

2) Загрузка глоссария:
- Убедись, что глоссарий загружается без fs.
- Делай импорт JSON напрямую:
  import glossary from "@/content/glossary.ru.json"
- Нормализуй: ключи + aliases в lowercase.
- Сформируй массив termEntries: [{ key, title, description, aliases[] }]
- Собери список всех match-строк (ключ + aliases) и отсортируй по длине DESC (чтобы "лексическая область видимости" матчилось раньше "область видимости").

3) ReactMarkdown интеграция:
- Нельзя надёжно перехватывать "text node" как отдельный компонент.
- Сделай decorateChildren(children) и применяй её в рендерах:
  p, li, h1..h6, blockquote
- НЕ применяй в code/pre/a.

4) Matching без regex lookbehind и без \b:
- Реализуй функцию splitByTerms(text):
  - lower = text.toLowerCase()
  - проход по терминам (сначала длинные)
  - ищи indexOf(termLower) в lower
  - проверяй границы:
    leftOk = idx==0 || !isWordChar(text[idx-1])
    rightOk = idx+len==text.length || !isWordChar(text[idx+len])
  - isWordChar(char):
    return /[\p{L}\p{N}_]/u.test(char)
  - если границы ок, режь на [before][match][after], match → GlossaryPopover
- Ограничь максимум 30 замен на страницу.

5) UI подсветки:
- Trigger термина должен иметь классы:
  underline decoration-dotted cursor-pointer
- Popover работает по клику, внутри кнопка "Понял!" закрывает.

6) Acceptance:
- В теории scopes-closures.md должны подсвечиваться:
  "замыкание", "лексическая область видимости", "область видимости", "мемоизация" (если есть в glossary)
- Внутри code blocks подсветки НЕТ.
- Если glossary пуст или терминов нет — видно debug в консоли.

Сделай изменения и покажи diff затронутых файлов.