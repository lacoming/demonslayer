# Observers в браузере: IntersectionObserver, ResizeObserver, MutationObserver

## Зачем это нужно

Observers — это современные API браузера для **реактивного реагирования на изменения**, без постоянных опросов (`setInterval`) и тяжёлых обработчиков.

Используются для:
- lazy-loading изображений и компонентов
- отслеживания появления элемента во viewport
- реакции на изменение размеров элементов
- наблюдения за изменениями DOM

На собеседованиях это признак **современного фронтенда**.

---

## Общая идея Observers

Observer:
- подписывается на событие изменения
- браузер сам уведомляет, **когда условие выполнено**
- меньше нагрузки и лучше производительность

---

## IntersectionObserver

### Что делает

Отслеживает **пересечение элемента с viewport или контейнером**.

Типичные кейсы:
- lazy-loading изображений
- бесконечный скролл
- анимации при появлении

---

### Пример

```js
const observer = new IntersectionObserver(
  ([entry]) => {
    if (entry.isIntersecting) {
      console.log("Элемент виден");
    }
  },
  { threshold: 0.5 }
);

observer.observe(element);
```

Ключевые поля:
- `isIntersecting`
- `intersectionRatio`

---

## ResizeObserver

### Что делает

Отслеживает **изменение размеров элемента**, а не окна.

Используется для:
- адаптивных графиков
- canvas
- сложных layout-ов

---

### Пример

```js
const ro = new ResizeObserver(entries => {
  for (const entry of entries) {
    console.log(entry.contentRect.width);
  }
});

ro.observe(element);
```

---

## MutationObserver

### Что делает

Отслеживает **изменения DOM**:
- добавление/удаление нод
- изменения атрибутов
- изменения текста

Используется для:
- интеграции сторонних скриптов
- реакций на динамический DOM

---

### Пример

```js
const mo = new MutationObserver(mutations => {
  console.log(mutations);
});

mo.observe(element, {
  childList: true,
  subtree: true
});
```

---

## Типовые ловушки

### Ловушка 1 — забыли disconnect

Observer продолжит работать и после того, как элемент не нужен.

```js
observer.disconnect();
```

---

### Ловушка 2 — MutationObserver вместо логики

MutationObserver — тяжёлый.
Используй только если нет другого API.

---

## Сравнение Observers

| API | Отслеживает |
|----|------------|
| IntersectionObserver | Видимость |
| ResizeObserver | Размер |
| MutationObserver | DOM |

---

## Как отвечать на собеседовании

1. Observers — реактивные API браузера
2. IntersectionObserver — видимость / viewport
3. ResizeObserver — размер элемента
4. MutationObserver — изменения DOM
5. Всегда disconnect

---

## Вопросы для самопроверки

1. Чем IntersectionObserver лучше scroll?
2. Когда нужен ResizeObserver?
3. Почему MutationObserver опасен?
4. Зачем disconnect?
5. Можно ли использовать Observers в SSR?

---

## Связанные темы

- Performance
- Lazy loading
- Virtualization
- SSR / CSR
