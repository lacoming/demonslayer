# this, bind / call / apply в JavaScript

## Зачем это нужно

`this` — одна из самых **ломающих мозг** тем в JavaScript.  
Ошибки с `this` — классика продакшена и собеседований.

Эта тема нужна, чтобы:
- понимать, **откуда берётся this** в функции
- не ломать обработчики событий
- корректно писать классы и методы
- понимать, зачем нужны `bind`, `call`, `apply`
- уверенно отвечать на вопросы уровня Middle

На интервью `this` — почти гарантированный вопрос.

---

## Краткое определение

**`this`** — это контекст выполнения функции.  
Он **не определяется при объявлении функции**, а вычисляется **в момент вызова**.

Ключевая идея:
> `this` зависит от **того, как функция вызвана**, а не где она объявлена.

---

## Основные правила определения this

### 1. Глобальный контекст

```js
console.log(this); // window (в браузере), undefined в strict mode
```

В `strict mode`:
```js
"use strict";
function foo() {
  console.log(this); // undefined
}
```

---

### 2. Вызов как метод объекта

```js
const user = {
  name: "Alex",
  say() {
    console.log(this.name);
  }
};

user.say(); // Alex
```

`this` → объект **перед точкой**.

---

### 3. Потеря контекста

```js
const say = user.say;
say(); // undefined / ошибка
```

Контекст **потерян**, потому что вызов без объекта.

---

### 4. this в колбэках

```js
setTimeout(user.say, 1000); // потеря this
```

Классическая ошибка.

---

## Arrow functions и this

### У стрелочных функций НЕТ своего this

```js
const obj = {
  name: "Alex",
  say: () => {
    console.log(this.name);
  }
};

obj.say(); // undefined
```

Arrow function:
- **не имеет собственного this**
- берёт this из **внешней лексической области**

### Где стрелки полезны

```js
const obj = {
  name: "Alex",
  say() {
    setTimeout(() => {
      console.log(this.name);
    }, 1000);
  }
};

obj.say(); // Alex
```

---

## bind / call / apply

### call

Вызывает функцию **сразу**, подменяя this.

```js
function greet() {
  console.log(this.name);
}

greet.call({ name: "Alex" }); // Alex
```

---

### apply

То же самое, но аргументы передаются массивом.

```js
greet.apply({ name: "Alex" }, []);
```

---

### bind

Возвращает **новую функцию** с привязанным this.

```js
const bound = greet.bind({ name: "Alex" });
bound(); // Alex
```

Ключевая разница:
- `call` / `apply` → вызывают сразу
- `bind` → возвращает функцию

---

## Частые ловушки

### Ловушка 1 — bind в render

```js
<button onClick={this.handle.bind(this)} />
```
Создаётся новая функция при каждом рендере → плохо для производительности.

---

### Ловушка 2 — arrow вместо метода

```js
class User {
  say = () => {
    console.log(this);
  };
}
```
Работает, но:
- каждая инстанция хранит свою копию функции
- больше памяти

---

### Ловушка 3 — this в классовых методах

```js
class User {
  say() {
    console.log(this);
  }
}

const u = new User();
const fn = u.say;
fn(); // undefined
```

Решение — `bind` или arrow.

---

## Как отвечать на собеседовании

Хорошая структура ответа:

1. `this` определяется в момент вызова
2. Основные правила (глобально, метод, потеря контекста)
3. Arrow functions не имеют своего this
4. bind / call / apply — способы явной привязки
5. Типичные баги в колбэках

Если ты это проговариваешь — ты **уже не junior**.

---

## Вопросы для самопроверки

1. Когда определяется this?
2. Почему this теряется при передаче метода?
3. В чём разница между bind и call?
4. Почему arrow function не подходит как метод объекта?
5. Как исправить потерю this в setTimeout?

---

## Связанные темы

- Arrow functions
- Классы
- Event handlers
- React / Vue компоненты
