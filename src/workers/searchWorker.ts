import { Index } from 'flexsearch'
import type { SearchResult } from '../utils/searchIndex'

type BuildMessage = {
  id: number
  type: 'build'
  items: SearchResult[]
}

type SearchMessage = {
  id: number
  type: 'search'
  query: string
  limit: number
}

type ClearMessage = {
  id: number
  type: 'clear'
}

type IncomingMessage = BuildMessage | SearchMessage | ClearMessage

type BuildResponse = {
  id: number
  type: 'build:done'
  count: number
}

type SearchResponse = {
  id: number
  type: 'search:done'
  results: SearchResult[]
}

type ClearResponse = {
  id: number
  type: 'clear:done'
}

type ErrorResponse = {
  id: number
  type: 'error'
  message: string
}

type OutgoingMessage = BuildResponse | SearchResponse | ClearResponse | ErrorResponse

const createIndex = () =>
  new Index({
    tokenize: 'forward',
    resolution: 9,
  })

let index = createIndex()
const items = new Map<string, SearchResult>()

const buildIndex = (nextItems: SearchResult[]): number => {
  items.clear()
  index = createIndex()

  for (const item of nextItems) {
    const key = `${item.type}:${item.id}`
    if (!items.has(key)) {
      items.set(key, item)
      const searchText = [item.title, item.subtitle, item.courseName].filter(Boolean).join(' ')
      index.add(key, searchText)
    }
  }

  return items.size
}

const searchIndex = (query: string, limit: number): SearchResult[] => {
  if (!query.trim()) return []
  const keys = index.search(query, { limit }) as string[]
  return keys.map((k) => items.get(k)).filter((x): x is SearchResult => !!x)
}

const clearIndex = () => {
  items.clear()
  index = createIndex()
}

self.onmessage = (event: MessageEvent<IncomingMessage>) => {
  const message = event.data

  try {
    if (message.type === 'build') {
      const count = buildIndex(message.items || [])
      const response: BuildResponse = { id: message.id, type: 'build:done', count }
      self.postMessage(response satisfies OutgoingMessage)
      return
    }

    if (message.type === 'search') {
      const results = searchIndex(message.query, message.limit)
      const response: SearchResponse = { id: message.id, type: 'search:done', results }
      self.postMessage(response satisfies OutgoingMessage)
      return
    }

    if (message.type === 'clear') {
      clearIndex()
      const response: ClearResponse = { id: message.id, type: 'clear:done' }
      self.postMessage(response satisfies OutgoingMessage)
    }
  } catch (error) {
    const response: ErrorResponse = {
      id: message.id,
      type: 'error',
      message: error instanceof Error ? error.message : 'Worker error',
    }
    self.postMessage(response satisfies OutgoingMessage)
  }
}
