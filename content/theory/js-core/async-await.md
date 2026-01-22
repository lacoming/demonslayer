# async / await в JavaScript

## Зачем это нужно

`async / await` — это **синтаксический сахар над Promise**, который позволяет писать асинхронный код так, будто он синхронный.

Он нужен, чтобы:
- упростить чтение и сопровождение асинхронного кода
- избавиться от длинных цепочек `then`
- писать линейную бизнес-логику (особенно в API, SSR, React/Nuxt)
- корректно работать с ошибками через `try / catch`

На собеседованиях `async / await` — обязательная тема, потому что она проверяет:
**понимание Promise, Event Loop и обработки ошибок**.

---

## Краткое определение

- `async` — ключевое слово, которое делает функцию **асинхронной**  
- `await` — приостанавливает выполнение `async`-функции до завершения Promise

Ключевая идея:
> `async / await` **не блокирует поток**, а просто приостанавливает выполнение функции, освобождая call stack.

---

## Что делает async функция

### async всегда возвращает Promise

```js
async function foo() {
  return 42;
}

foo(); // Promise<42>
```

Даже если ты явно не возвращаешь Promise — он создаётся автоматически.

Если внутри `async` выбросить ошибку:

```js
async function foo() {
  throw new Error("boom");
}

foo(); // Promise rejected
```

---

## Как работает await

`await`:
- принимает **Promise**
- ждёт его завершения
- возвращает **результат fulfilled**
- при rejected — бросает ошибку

```js
const data = await fetch("/api"); // ждём Promise
```

Важно:
- `await` можно использовать **только внутри async функции**
- `await` **не блокирует** основной поток

---

## Модель выполнения (очень важно)

```js
async function test() {
  console.log(1);
  await Promise.resolve();
  console.log(2);
}

console.log(0);
test();
console.log(3);
```

Порядок:
```
0
1
3
2
```

Почему:
- код до `await` выполняется синхронно
- `await` разбивает функцию на части
- продолжение попадает в **очередь микрозадач**

---

## Обработка ошибок

### try / catch

```js
async function load() {
  try {
    const res = await fetch("/api");
    const data = await res.json();
    return data;
  } catch (err) {
    console.error(err);
  }
}
```

Любой `rejected Promise` внутри `await` → `catch`.

### Ошибка без catch

```js
async function load() {
  await Promise.reject("fail");
}

load(); // UnhandledPromiseRejection
```

На собеседованиях любят спрашивать:
> Почему try/catch работает с await, но не ловит ошибки вне async?

---

## Параллельность vs последовательность

### ❌ Последовательно (медленно)

```js
const a = await fetch("/a");
const b = await fetch("/b");
```

### ✅ Параллельно (правильно)

```js
const [a, b] = await Promise.all([
  fetch("/a"),
  fetch("/b")
]);
```

`await` **не делает код параллельным автоматически**.

---

## Типовые ловушки

### Ловушка 1 — забыли await

```js
const data = fetch("/api");
console.log(data); // Promise, а не результат
```

### Ловушка 2 — await в цикле

```js
for (const url of urls) {
  await fetch(url); // выполняется последовательно
}
```

Если можно — используй `Promise.all`.

### Ловушка 3 — async в Array.map

```js
const result = array.map(async x => x * 2);
console.log(result); // массив Promise
```

Правильно:
```js
await Promise.all(array.map(async x => x * 2));
```

---

## Связь с SSR и фреймворками

### React / Next.js
- `async` серверные компоненты
- загрузка данных до рендера
- обработка ошибок через error boundaries

### Nuxt
- `async setup`
- `useAsyncData`
- управление жизненным циклом данных

`async / await` — фундамент SSR.

---

## Как отвечать на собеседовании

Хороший ответ:

1. `async` — всегда возвращает Promise
2. `await` ждёт Promise и превращает rejected в throw
3. Код до `await` — синхронный
4. Продолжение — микрозадача
5. Для параллельности нужен `Promise.all`

Если это прозвучало — ты выглядишь уверенным middle.

---

## Вопросы для самопроверки

1. Что возвращает async функция?
2. Что происходит при ошибке внутри await?
3. Почему await не блокирует поток?
4. Чем await отличается от then?
5. Как правильно делать параллельные запросы?

---

## Связанные темы

- Promise
- Event Loop
- Обработка ошибок
- SSR (Nuxt / Next.js)
