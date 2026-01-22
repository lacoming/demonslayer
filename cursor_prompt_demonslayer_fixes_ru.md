Задача: подключить весь уже добавленный контент (теория + вопросы) так, чтобы новые задания начали появляться на сайте автоматически через daily plan.

Контекст проекта:
- Daily plan генерируется в lib/game.ts -> generateDailyPlan()
- Источник шаблонов задач: content/taskTemplates.json
- Теория лежит в content/theory/** и подгружается через /api/theory/[ref] (ref вида "js-core/event-loop")
- Запуск задания ищет шаблон по совпадению title + type в app/api/task-sessions/start/route.ts
- Для перехода цикла нужны minDailyPlans=3 и minInterviews=6 (config/game.ts)

Текущее состояние (важно):
- В content/theory/js-core уже есть файлы:
  abort-controller.md, async-await.md, currying.md, event-loop.md, map-set.md, methods-reduce.md,
  object-cloning.md, observers.md, promises.md, prototypes.md, raf-ric.md, recursion.md,
  scopes-closures.md, this-bind-call-apply.md
- В content/theory/browser уже есть файлы:
  rendering.md, layout-paint-composite.md, critical-rendering-path.md, performance-metrics.md, performance-tools.md
- В content/questions.json есть банк вопросов (36) с полями: cycleCode, category, question, keyPoints
- В content/taskTemplates.json сейчас только 1 шаблон -> из-за этого новых задач почти нет

Что нужно сделать:

1) Сгенерировать KNOWLEDGE-шаблоны под ВСЕ md-файлы теории:
   - Для каждого файла в content/theory/js-core/*.md создать шаблон:
     {
       id: "knowledge-js-core-<slug>",
       type: "KNOWLEDGE",
       cycleCode: 1,
       topicTitle: "<человеческое название темы>",
       title: "Изучить: <человеческое название темы>",
       prompt: "…кратко о цели",
       xp: 20..35 (можно 25),
       steps: [
         { type:"theory", title:"Теория", theoryRef:"js-core/<slug>" },
         { type:"text_answer", title:"Объясните своими словами", question:"…", minChars:80, keywords:[…] }
       ]
     }

   - Для каждого файла в content/theory/browser/*.md создать шаблон:
     {
       id: "knowledge-browser-<slug>",
       type: "KNOWLEDGE",
       cycleCode: 7 (цикл Performance в cycles.json),
       topicTitle: "<название>",
       title: "Изучить: <название>",
       prompt: "...",
       xp: 20..35,
       steps: [
         { type:"theory", title:"Теория", theoryRef:"browser/<slug>" },
         { type:"text_answer", title:"Краткий конспект", question:"…", minChars:80, keywords:[…] }
       ]
     }

   Важно:
   - theoryRef должен быть строго "js-core/<slug>" или "browser/<slug>" без ".md"
   - title должен быть уникальным (потому что start-route ищет шаблон по title + type)

2) Добавить INTERVIEW-шаблоны, иначе нельзя перейти цикл:
   - На основе content/questions.json:
     взять все вопросы с cycleCode=1 и создать минимум 10 шаблонов:
     {
       id: "interview-1-<n>",
       type: "INTERVIEW",
       cycleCode: 1,
       title: "Интервью: <короткое название>",
       prompt: "<сам вопрос>",
       xp: 25..40,
       steps: [
         { type:"text_answer", title:"Ответ (как на собеседовании)", question:"<вопрос>", minChars:120, keywords:<из keyPoints выделить ключевые слова> }
       ]
     }

   Аналогично для cycleCode=7 (Performance) — можно 6 шаблонов, чтобы потом цикл тоже проходился.

3) Добавить DRILL_JS и DRILL_TS (общие, без cycleCode или с null):
   - DRILL_JS: 10 шаблонов
     тип "DRILL_JS", cycleCode: null
     steps: 1-2 шага code_answer с requiredTokens (например: setTimeout, Promise.resolve, queueMicrotask, map/filter/reduce)
   - DRILL_TS: 10 шаблонов
     тип "DRILL_TS", cycleCode: null
     steps: code_answer с requiredTokens (например: interface, type, keyof, typeof, generics, extends)

   Цель: чтобы generateDailyPlan всегда мог выбрать 1 DRILL_JS и 1 DRILL_TS.

4) Обновить content/cycles.json:
   - Для cycleCode=1 (JavaScript Core) заменить/расширить themes так, чтобы туда вошли все темы из js-core:
     Замыкания, Event Loop, Promises, Async/Await, Прототипы, this/bind/call/apply,
     AbortController, reduce и методы массивов, Клонирование объектов,
     Map/Set/WeakMap/WeakSet, Observers, rAF/rIC, Рекурсия, Каррирование

   - Для cycleCode=7 (Performance) расширить themes, добавив browser-темы:
     Rendering pipeline, Layout/Paint/Composite, CRP, Метрики, Инструменты, Web APIs, Event propagation

5) Проверка:
   - После генерации content/taskTemplates.json:
     - перезапустить dev server
     - удалить план на сегодня из БД (если уже создан) или нажать “Сгенерировать план”
     - убедиться, что в “Сегодня” появляются:
       1 KNOWLEDGE (по текущему циклу),
       1 DRILL_JS,
       1 DRILL_TS,
       2 INTERVIEW (по текущему циклу)
   - Открыть любую KNOWLEDGE задачу -> шаг theory должен подтянуть markdown через /api/theory/<ref> без ошибки “Файл теории не найден”
   - Убедиться, что INTERVIEW задачи закрываются через task-session и становятся DONE (иначе цикл не продвинется)

Выполни изменения аккуратно:
- не ломай существующий шаблон knowledge-1, но лучше привести его к общей схеме id/slug.
- content/taskTemplates.json должен быть валидным JSON-массивом.
- Все тексты и названия — на русском.
- В конце выведи краткий отчёт: сколько шаблонов добавлено по типам и по циклам.