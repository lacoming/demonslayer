"use client"

import ReactMarkdown from "react-markdown"
import remarkGfm from "remark-gfm"
import { GlossaryPopover } from "@/components/GlossaryPopover"
import glossaryData from "@/content/glossary.ru.json"
import { type GlossaryEntry } from "@/lib/glossary"
import React, { useMemo, ReactNode, isValidElement, cloneElement } from "react"

interface MarkdownViewProps {
  content: string
}

type GlossaryData = {
  [key: string]: GlossaryEntry
}

type MatchString = {
  text: string
  entry: GlossaryEntry
}

/**
 * Проверяет, является ли символ частью слова (буква, цифра, подчёркивание)
 */
function isWordChar(char: string): boolean {
  return /[\p{L}\p{N}_]/u.test(char)
}

/**
 * Разбивает текст на части, заменяя термины на GlossaryPopover
 */
function splitByTerms(text: string, matchStrings: MatchString[]): ReactNode[] {
  const MAX_REPLACEMENTS = 30
  const lower = text.toLowerCase()
  const matches: Array<{
    index: number
    length: number
    entry: GlossaryEntry
    originalText: string
  }> = []
  let replacementsCount = 0

  // Проходим по терминам (уже отсортированы по длине DESC)
  for (const { text: termText, entry } of matchStrings) {
    if (replacementsCount >= MAX_REPLACEMENTS) break

    const termLower = termText.toLowerCase()
    let searchIndex = 0

    while (searchIndex < lower.length && replacementsCount < MAX_REPLACEMENTS) {
      const idx = lower.indexOf(termLower, searchIndex)
      if (idx === -1) break

      // Проверяем границы слова
      const leftOk = idx === 0 || !isWordChar(text[idx - 1])
      const rightOk = idx + termText.length === text.length || !isWordChar(text[idx + termText.length])

      if (leftOk && rightOk) {
        // Проверяем, что совпадение не перекрывается с уже найденными
        const overlap = matches.some(
          (m) =>
            (idx >= m.index && idx < m.index + m.length) ||
            (idx + termText.length > m.index && idx + termText.length <= m.index + m.length)
        )

        if (!overlap) {
          matches.push({
            index: idx,
            length: termText.length,
            entry,
            originalText: text.substring(idx, idx + termText.length),
          })
          replacementsCount++
        }
      }

      searchIndex = idx + 1
    }
  }

  // Сортируем совпадения по индексу (от начала к концу)
  matches.sort((a, b) => a.index - b.index)

  // Разбиваем текст на части
  const result: ReactNode[] = []
  let lastIndex = 0

  for (const match of matches) {
    // Добавляем текст до совпадения
    if (match.index > lastIndex) {
      const textBefore = text.substring(lastIndex, match.index)
      if (textBefore) {
        result.push(textBefore)
      }
    }

    // Добавляем GlossaryPopover для совпадения
    result.push(
      <GlossaryPopover
        key={`glossary-${match.index}`}
        triggerText={match.originalText}
        entry={match.entry}
      />
    )

    lastIndex = match.index + match.length
  }

  // Добавляем оставшийся текст
  if (lastIndex < text.length) {
    const textAfter = text.substring(lastIndex)
    if (textAfter) {
      result.push(textAfter)
    }
  }

  return result.length > 0 ? result : [text]
}

/**
 * Рекурсивно обрабатывает React children, заменяя строки на GlossaryPopover
 */
function decorateChildren(children: ReactNode, matchStrings: MatchString[]): ReactNode {
  if (children == null) {
    return children
  }

  if (typeof children === "string") {
    return splitByTerms(children, matchStrings)
  }

  if (Array.isArray(children)) {
    return children.map((child, idx) => (
      <React.Fragment key={idx}>{decorateChildren(child, matchStrings)}</React.Fragment>
    ))
  }

  if (isValidElement(children)) {
    // Не обрабатываем code, pre, a
    const typeName = typeof children.type === "string" ? children.type : null
    if (typeName === "code" || typeName === "pre" || typeName === "a") {
      return children
    }

    // Рекурсивно обрабатываем children
    const decoratedChildren = decorateChildren(children.props?.children, matchStrings)
    return cloneElement(children, { ...children.props, children: decoratedChildren })
  }

  return children
}

export function MarkdownView({ content }: MarkdownViewProps) {
  // Загружаем и нормализуем глоссарий
  const matchStrings = useMemo(() => {
    const data = glossaryData as GlossaryData
    const allMatchStrings: MatchString[] = []

    // Собираем все match-строки (ключ + aliases)
    for (const [key, entry] of Object.entries(data)) {
      const normalizedKey = key.toLowerCase()
      allMatchStrings.push({ text: normalizedKey, entry })
      
      // Добавляем aliases
      if (entry.aliases && Array.isArray(entry.aliases)) {
        for (const alias of entry.aliases) {
          allMatchStrings.push({ text: alias.toLowerCase(), entry })
        }
      }
    }

    // Сортируем по длине DESC (чтобы длинные фразы матчились раньше)
    allMatchStrings.sort((a, b) => b.text.length - a.text.length)

    // Debug (только в dev)
    if (process.env.NODE_ENV === "development") {
      console.log("[glossary] terms:", allMatchStrings.length, "sample:", allMatchStrings.slice(0, 5))
    }

    return allMatchStrings
  }, [])

  // Debug предупреждение (только в dev)
  const isEmpty = matchStrings.length === 0
  const showWarning = process.env.NODE_ENV === "development" && isEmpty

  return (
    <div className="prose prose-invert max-w-none dark:prose-invert">
      {showWarning && (
        <div className="mb-4 p-2 text-xs text-yellow-500 bg-yellow-500/10 border border-yellow-500/20 rounded">
          Glossary пуст
        </div>
      )}
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          p: ({ children, ...props }) => (
            <p {...props}>{decorateChildren(children, matchStrings)}</p>
          ),
          li: ({ children, ...props }) => (
            <li {...props}>{decorateChildren(children, matchStrings)}</li>
          ),
          h1: ({ children, ...props }) => (
            <h1 {...props}>{decorateChildren(children, matchStrings)}</h1>
          ),
          h2: ({ children, ...props }) => (
            <h2 {...props}>{decorateChildren(children, matchStrings)}</h2>
          ),
          h3: ({ children, ...props }) => (
            <h3 {...props}>{decorateChildren(children, matchStrings)}</h3>
          ),
          h4: ({ children, ...props }) => (
            <h4 {...props}>{decorateChildren(children, matchStrings)}</h4>
          ),
          h5: ({ children, ...props }) => (
            <h5 {...props}>{decorateChildren(children, matchStrings)}</h5>
          ),
          h6: ({ children, ...props }) => (
            <h6 {...props}>{decorateChildren(children, matchStrings)}</h6>
          ),
          blockquote: ({ children, ...props }) => (
            <blockquote {...props}>{decorateChildren(children, matchStrings)}</blockquote>
          ),
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  )
}
