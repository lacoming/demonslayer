# requestAnimationFrame и requestIdleCallback

## Зачем это нужно

Эти API позволяют браузеру **самому выбрать лучший момент** для выполнения кода:
- `requestAnimationFrame` — для визуальных обновлений
- `requestIdleCallback` — для фоновой, некритичной работы

Использование этих API повышает:
- плавность анимаций
- отзывчивость UI
- производительность

На собеседованиях это признак понимания **рендер-пайплайна браузера**.

---

## requestAnimationFrame (rAF)

### Что делает

`requestAnimationFrame` планирует выполнение колбэка **перед следующим repaint** браузера.

Ключевая идея:
> rAF синхронизирует код с частотой обновления экрана.

---

### Пример

```js
function animate() {
  update();
  draw();
  requestAnimationFrame(animate);
}

requestAnimationFrame(animate);
```

Особенности:
- вызывается ~60 раз в секунду (зависит от дисплея)
- паузится во вкладке в фоне
- идеально подходит для анимаций

---

### Когда использовать rAF

- анимации
- drag & drop
- визуальные счётчики
- canvas / WebGL

---

## requestIdleCallback (rIC)

### Что делает

`requestIdleCallback` вызывает колбэк, **когда браузер простаивает** и есть свободное время между кадрами.

```js
requestIdleCallback((deadline) => {
  while (deadline.timeRemaining() > 0) {
    doWork();
  }
});
```

Объект `deadline`:
- `timeRemaining()` — сколько времени можно работать
- `didTimeout` — был ли вызов по таймауту

---

### Когда использовать rIC

- аналитика
- предзагрузка данных
- логирование
- кэширование
- некритичные вычисления

❗ Не подходит для UI.

---

## rAF vs rIC

| API | Для чего |
|---|---|
| requestAnimationFrame | Анимации и визуал |
| requestIdleCallback | Фоновая работа |
| setTimeout | Нет гарантий по времени |
| setInterval | Не синхронизирован с рендером |

---

## Типовые ловушки

### Ловушка 1 — анимация через setInterval

```js
setInterval(draw, 16);
```

❌ Возможны пропуски кадров.

---

### Ловушка 2 — важная логика в rIC

Если браузер загружен — `requestIdleCallback` может **не вызваться долго**.

---

## SSR и поддержка

- `requestAnimationFrame` — только в браузере
- `requestIdleCallback` — только в браузере
- В SSR нужно проверять `typeof window !== "undefined"`

---

## Как отвечать на собеседовании

1. rAF — для анимаций, перед repaint
2. rIC — для фоновых задач в idle-время
3. rAF синхронизирован с экраном
4. rIC может не вызываться долго
5. Это лучше, чем таймеры

---

## Вопросы для самопроверки

1. Почему rAF лучше setInterval для анимаций?
2. Что такое idle time?
3. Почему rIC нельзя использовать для UI?
4. Что происходит во вкладке в фоне?
5. Можно ли использовать эти API в SSR?

---

## Связанные темы

- Browser rendering pipeline
- Performance
- Event Loop
- Web APIs
