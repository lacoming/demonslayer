# Event Propagation: capturing, bubbling, delegation

## Зачем это нужно

Механизм распространения событий — основа всей работы с DOM-событиями.
Непонимание этой темы приводит к:
- неожиданным багам
- «магическому» поведению обработчиков
- неправильной оптимизации

На собеседованиях это **базовый, но обязательный** вопрос для Middle.

---

## Что такое Event Propagation

**Event Propagation** — это процесс, при котором событие:
- проходит через DOM-дерево
- обрабатывается разными элементами

Событие **не возникает сразу в одном месте** — оно проходит этапы.

---

## Три фазы события

Любое DOM-событие проходит **3 фазы**:

1. **Capturing (погружение)**
2. **Target (цель)**
3. **Bubbling (всплытие)**

```text
window
  ↓ (capturing)
document
  ↓
body
  ↓
button ← target
  ↑
body
  ↑ (bubbling)
document
  ↑
window
```

---

## Capturing phase

- Событие идёт **сверху вниз**
- По умолчанию обработчики **не срабатывают** на этой фазе

```js
element.addEventListener("click", handler, true);
```

Третий аргумент `true` → capturing.

Используется редко, но важно понимать.

---

## Bubbling phase

- Событие идёт **снизу вверх**
- Это **дефолтное поведение**

```js
element.addEventListener("click", handler);
```

Большинство обработчиков работают именно здесь.

---

## Event Target

`event.target` — элемент, на котором событие **фактически произошло**.

```js
button.addEventListener("click", (event) => {
  console.log(event.target);
});
```

Важно:
- `target` ≠ `currentTarget`

---

## stopPropagation

```js
event.stopPropagation();
```

Останавливает дальнейшее распространение события.

❗ Не отменяет действие по умолчанию.

---

## preventDefault

```js
event.preventDefault();
```

Отменяет **дефолтное поведение** браузера:
- переход по ссылке
- отправку формы

Не влияет на propagation.

---

## Event Delegation (делегирование)

### Ключевая идея

Вместо множества обработчиков — **один на родителе**.

```js
ul.addEventListener("click", (event) => {
  if (event.target.tagName === "LI") {
    console.log(event.target.textContent);
  }
});
```

Почему работает:
- благодаря bubbling

---

## Зачем использовать делегирование

- меньше обработчиков
- лучше производительность
- работает с динамическими элементами

---

## Типовые ловушки

### Ловушка 1 — путаница target и currentTarget

- `target` — где кликнули
- `currentTarget` — где висит обработчик

---

### Ловушка 2 — stopPropagation «наугад»

Ломает логику других компонентов.

---

## Как отвечать на собеседовании

1. Событие проходит capturing → target → bubbling
2. По умолчанию используется bubbling
3. Capturing включается через третий аргумент
4. Делегирование работает благодаря bubbling
5. stopPropagation ≠ preventDefault

---

## Вопросы для самопроверки

1. Какие фазы есть у события?
2. Чем target отличается от currentTarget?
3. Зачем нужен capturing?
4. Почему делегирование эффективно?
5. В чём разница stopPropagation и preventDefault?

---

## Связанные темы

- DOM events
- Web APIs
- Performance
