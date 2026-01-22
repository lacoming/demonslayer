# AbortController в JavaScript

## Зачем это нужно

`AbortController` используется для **отмены асинхронных операций**, чаще всего:
- HTTP-запросов (`fetch`)
- таймеров и долгих задач
- логики, зависящей от жизненного цикла компонента (React / Vue / Nuxt)

Без отмены запросов возникают:
- утечки памяти
- гонки состояний (race conditions)
- обновление state после размонтирования компонента

На собеседованиях `AbortController` — маркер **практического опыта**.

---

## Краткое определение

**AbortController** — это объект, который позволяет:
- создать сигнал отмены (`signal`)
- передать его в асинхронную операцию
- отменить операцию вызовом `abort()`

Ключевая идея:
> Мы явно сообщаем операции, что она больше не нужна.

---

## Базовое использование с fetch

```js
const controller = new AbortController();
const signal = controller.signal;

fetch("/api/data", { signal })
  .then(res => res.json())
  .then(console.log)
  .catch(err => {
    if (err.name === "AbortError") {
      console.log("Запрос отменён");
    } else {
      console.error(err);
    }
  });

controller.abort();
```

---

## Что происходит при abort

1. `controller.abort()` вызывается
2. `signal.aborted` становится `true`
3. `fetch` отклоняет Promise с ошибкой `AbortError`
4. Управление попадает в `catch`

Важно:
- это **нормальный сценарий**, а не ошибка логики
- `AbortError` нужно обрабатывать отдельно

---

## AbortController в UI-фреймворках

### React

```js
useEffect(() => {
  const controller = new AbortController();

  fetchData(controller.signal);

  return () => {
    controller.abort();
  };
}, []);
```

Отмена при размонтировании компонента.

---

### Nuxt / SSR

- отмена запросов при смене страницы
- предотвращение обновления неактуальных данных
- особенно важно при CSR-переходах

---

## AbortSignal

`signal` — это объект:
- который передаётся в операции
- по которому можно проверять отмену

```js
if (signal.aborted) {
  return;
}
```

Можно подписываться на событие:

```js
signal.addEventListener("abort", () => {
  console.log("Отменено");
});
```

---

## Типовые ловушки

### Ловушка 1 — забыли abort

```js
useEffect(() => {
  fetchData();
}, []);
```

Запрос продолжит жить после размонтирования компонента.

---

### Ловушка 2 — считать abort ошибкой

`AbortError` — это **ожидаемое поведение**, а не баг.

---

### Ловушка 3 — повторное использование controller

После `abort()` controller **нельзя использовать повторно**.
Нужен новый экземпляр.

---

## Когда использовать AbortController

- запросы, зависящие от UI
- поисковые поля (typeahead)
- переключение страниц
- отмена устаревших запросов

Не нужен:
- для коротких одноразовых операций
- если результат всегда нужен

---

## Как отвечать на собеседовании

1. AbortController нужен для отмены async-операций
2. Используется с fetch через signal
3. abort() → Promise отклоняется с AbortError
4. В UI — отмена при размонтировании
5. Это предотвращает race conditions и утечки

---

## Вопросы для самопроверки

1. Что делает AbortController?
2. Что происходит с fetch при abort?
3. Почему AbortError — не ошибка?
4. Где в React нужно вызывать abort?
5. Можно ли переиспользовать controller?

---

## Связанные темы

- fetch API
- Promise и async/await
- Race conditions
- Жизненный цикл компонентов
