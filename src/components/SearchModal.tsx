/**
 * Global Search Modal
 * 
 * Cmd+K / Ctrl+K triggered search modal with keyboard navigation.
 */

import React, { useEffect, useRef, useState, useCallback } from 'react'
import { createPortal } from 'react-dom'
import { useNavigate } from '@tanstack/react-router'
import { 
  Search, 
  X, 
  BookOpen, 
  FileText, 
  Megaphone, 
  File, 
  Layers, 
  FileCode,
  Loader2,
  Sparkles
} from 'lucide-react'
import { useGlobalSearch } from '../hooks/useGlobalSearch'
import { useAppContext } from '../context/AppContext'
import { useAIPanel } from '../context/AIPanelContext'
import { coordinateSearch } from '../utils/coordinator'
import type { SearchResult, SearchResultType } from '../utils/searchIndex'

type Props = {
  isOpen: boolean
  onClose: () => void
}

// Icon for result type
function ResultIcon({ type }: { type: SearchResultType }) {
  const cls = "w-4 h-4 shrink-0"
  switch (type) {
    case 'course': return <BookOpen className={cls} />
    case 'assignment': return <FileText className={cls} />
    case 'announcement': return <Megaphone className={cls} />
    case 'file': return <File className={cls} />
    case 'module': return <Layers className={cls} />
    case 'page': return <FileCode className={cls} />
    default: return <FileText className={cls} />
  }
}

// Badge color for result type
function getTypeBadgeClass(type: SearchResultType): string {
  switch (type) {
    case 'course': return 'bg-purple-100 dark:bg-purple-900/40 text-purple-700 dark:text-purple-300'
    case 'assignment': return 'bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300'
    case 'announcement': return 'bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-300'
    case 'file': return 'bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300'
    case 'module': return 'bg-indigo-100 dark:bg-indigo-900/40 text-indigo-700 dark:text-indigo-300'
    case 'page': return 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300'
    default: return 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300'
  }
}

function getTypeLabel(type: SearchResultType): string {
  switch (type) {
    case 'course': return 'Course'
    case 'assignment': return 'Assignment'
    case 'announcement': return 'Announcement'
    case 'file': return 'File'
    case 'module': return 'Module'
    case 'page': return 'Page'
    default: return type
  }
}

export const SearchModal: React.FC<Props> = ({ isOpen, onClose }) => {
  const navigate = useNavigate()
  const app = useAppContext()
  const aiPanel = useAIPanel()
  const inputRef = useRef<HTMLInputElement>(null)
  const listRef = useRef<HTMLDivElement>(null)
  const [selectedIndex, setSelectedIndex] = useState(0)
  
  const { 
    query, 
    setQuery, 
    results: standardResults, 
    isReady, 
    isBuilding, 
    isSearching: isStandardSearching,
    clearSearch 
  } = useGlobalSearch()

  // Deep Search State
  const [isDeepSearching, setIsDeepSearching] = useState(false)
  const [deepResults, setDeepResults] = useState<SearchResult[]>([])
  const [deepSearchActive, setDeepSearchActive] = useState(false)

  // Unified results view
  const results = deepSearchActive ? deepResults : standardResults
  const isSearching = isStandardSearching || isDeepSearching

  // Reset deep search when query changes significantly
  useEffect(() => {
    if (deepSearchActive && query.trim() === '') {
      setDeepSearchActive(false)
      setDeepResults([])
    }
  }, [query, deepSearchActive])

  // Reset everything when closing
  useEffect(() => {
    if (!isOpen) {
      clearSearch()
      setDeepSearchActive(false)
      setDeepResults([])
      setSelectedIndex(0)
    } else {
      setTimeout(() => inputRef.current?.focus(), 50)
    }
  }, [isOpen, clearSearch])

  // Execute Deep Search
  const handleDeepSearch = async () => {
    if (!query.trim() || isDeepSearching) return
    
    setIsDeepSearching(true)
    setDeepSearchActive(true)
    setDeepResults([]) 

    try {
      let searchQuery = query
      let options: any = {}

      // Pass 1: Coordinate (if AI enabled)
      if (app.aiEnabled && window.ai) {
        const plan = await coordinateSearch(query, app.courses)
        searchQuery = plan.rewrittenQuery
        options = {
          courseIds: plan.filters?.courseIds,
          types: plan.filters?.types,
          minScore: 0.2
        }
      }

      // Pass 2: Execute Vector Search
      const res = await window.embedding.search(searchQuery, 15, options)
      
      if (res.ok && res.data) {
        const mapped: SearchResult[] = res.data.map(item => ({
          id: item.id,
          type: item.metadata.type as SearchResultType,
          title: item.metadata.title,
          subtitle: item.metadata.snippet,
          courseId: item.metadata.courseId,
          courseName: item.metadata.courseName,
          url: item.metadata.url,
          score: item.score
        }))
        setDeepResults(mapped)
      }
    } catch (e) {
      console.error('Deep search failed', e)
    } finally {
      setIsDeepSearching(false)
    }
  }

  // Handle Ask AI
  const handleAskAI = () => {
    onClose()
    clearSearch()
    aiPanel.open(query.trim(), 'ask-ai', true)
  }

  // Navigate to result
  const navigateToResult = useCallback((result: SearchResult) => {
    onClose()
    clearSearch()
    
    if (result.type === 'course') {
      navigate({ to: '/course/$courseId', params: { courseId: String(result.id) } })
      return
    }
    
    if (!result.courseId) return
    const courseId = String(result.courseId)
    
    switch (result.type) {
      case 'assignment':
        const assignId = result.id.includes(':') ? result.id.split(':').pop() : result.contentId
        navigate({ 
          to: '/course/$courseId', 
          params: { courseId },
          search: { tab: 'assignments', type: 'assignment', contentId: String(assignId), title: result.title }
        })
        break
      case 'announcement':
        const annId = result.id.includes(':') ? result.id.split(':').pop() : result.contentId
        navigate({ 
          to: '/course/$courseId', 
          params: { courseId },
          search: { tab: 'announcements', type: 'announcement', contentId: String(annId), title: result.title }
        })
        break
      case 'file':
        const fileId = result.id.includes(':') ? result.id.split(':').pop() : result.contentId
        navigate({ 
          to: '/course/$courseId', 
          params: { courseId },
          search: { tab: 'files', type: 'file', contentId: String(fileId), title: result.title }
        })
        break
      case 'module':
        navigate({ 
          to: '/course/$courseId', 
          params: { courseId },
          search: { tab: 'modules' }
        })
        break
      case 'page':
        const pageId = result.pageUrl || result.contentId || (result.id.includes(':') ? result.id.split(':').pop() : '')
        if (pageId) {
          navigate({ 
            to: '/course/$courseId', 
            params: { courseId },
            search: { tab: 'home', type: 'page', contentId: String(pageId), title: result.title }
          })
        }
        break
    }
  }, [navigate, onClose, clearSearch])

  // Determine special action visibility
  const showDeepSearchAction = app.embeddingsEnabled && !deepSearchActive && query.trim().length > 0 && !isDeepSearching
  const showAskAIAction = app.aiEnabled && query.trim().length > 0 && !deepSearchActive && !isDeepSearching

  // Calculate total items for navigation
  const deepSearchIndex = showDeepSearchAction ? results.length : -1
  const askAIIndex = showAskAIAction ? results.length + (showDeepSearchAction ? 1 : 0) : -1
  const maxIndex = Math.max(0, results.length + (showDeepSearchAction ? 1 : 0) + (showAskAIAction ? 1 : 0) - 1)

  // Keyboard navigation
  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault()
        setSelectedIndex(prev => Math.min(prev + 1, maxIndex))
        break
      case 'ArrowUp':
        e.preventDefault()
        setSelectedIndex(prev => Math.max(prev - 1, 0))
        break
      case 'Enter':
        e.preventDefault()
        if (selectedIndex === deepSearchIndex) {
          handleDeepSearch()
        } else if (selectedIndex === askAIIndex) {
          handleAskAI()
        } else if (results[selectedIndex]) {
          navigateToResult(results[selectedIndex])
        }
        break
      case 'Escape':
        e.preventDefault()
        onClose()
        break
      case 'Backspace':
        if (query === '') {
          onClose()
        }
        break
    }
  }, [results, selectedIndex, maxIndex, deepSearchIndex, askAIIndex, navigateToResult, onClose, handleDeepSearch, handleAskAI, query])

  // Reset selection when results change
  useEffect(() => {
    setSelectedIndex(0)
  }, [results.length, deepSearchActive])

  if (!isOpen) return null

  return createPortal(
    <div 
      className="fixed inset-0 z-[200] flex items-start justify-center pt-[15vh]"
      onClick={(e) => { if (e.target === e.currentTarget) onClose() }}
    >
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      
      <div 
        className="relative w-full max-w-xl mx-4 bg-white dark:bg-neutral-900 rounded-xl shadow-2xl ring-1 ring-black/10 dark:ring-white/10 overflow-hidden animate-in fade-in zoom-in-95 duration-150"
        role="dialog"
        aria-modal="true"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Input */}
        <div className="flex items-center gap-3 px-4 py-3 border-b border-gray-200 dark:border-neutral-800">
          {deepSearchActive ? (
            <Sparkles className="w-5 h-5 text-indigo-500 shrink-0" />
          ) : (
            <Search className="w-5 h-5 text-slate-400 shrink-0" />
          )}
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={deepSearchActive ? "Deep Search..." : (isReady ? "Search courses, assignments, files..." : "Building search index...")}
            disabled={!isReady && !isBuilding}
            className="flex-1 bg-transparent text-slate-900 dark:text-slate-100 placeholder-slate-400 dark:placeholder-neutral-500 text-base outline-none disabled:opacity-50"
          />
          {(isSearching || isBuilding) && (
            <Loader2 className="w-4 h-4 text-slate-400 animate-spin shrink-0" />
          )}
          <button onClick={onClose} className="p-1 rounded hover:bg-slate-100 dark:hover:bg-neutral-800 text-slate-500 transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>
        
        {/* Results List */}
        <div ref={listRef} className="max-h-[50vh] overflow-y-auto">
          {/* Empty State */}
          {!isSearching && query.trim() && results.length === 0 && (
            <div className="px-4 py-8 text-center text-slate-500 dark:text-neutral-400">
              <p className="text-sm font-medium">No results found</p>
              <p className="text-xs mt-1">
                {deepSearchActive ? 'Try rephrasing your query.' : 'Use Deep Search or Ask AI below.'}
              </p>
            </div>
          )}

          {/* Result Items */}
          {results.map((result, index) => (
            <button
              key={`${result.type}-${result.id}`}
              className={`w-full flex items-start gap-3 px-4 py-3 text-left transition-colors ${
                index === selectedIndex 
                  ? 'bg-[var(--app-accent-bg)]' 
                  : 'hover:bg-slate-50 dark:hover:bg-neutral-800/50'
              }`}
              onClick={(e) => {
                e.preventDefault()
                navigateToResult(result)
              }}
              onMouseEnter={() => setSelectedIndex(index)}
            >
              <div className={`mt-0.5 p-1.5 rounded-lg ${getTypeBadgeClass(result.type)}`}>
                <ResultIcon type={result.type} />
              </div>
              <div className="flex-1 min-w-0">
                <div className="font-medium text-slate-900 dark:text-slate-100 truncate">
                  {result.title}
                </div>
                <div className="flex items-center gap-2 mt-0.5">
                  <span className={`text-[10px] uppercase font-medium px-1.5 py-0.5 rounded ${getTypeBadgeClass(result.type)}`}>
                    {getTypeLabel(result.type)}
                  </span>
                  {result.courseName && (
                    <span className="text-xs text-slate-500 dark:text-neutral-400 truncate">
                      {result.courseName}
                    </span>
                  )}
                  {/* Show snippet in Deep Search mode if available */}
                  {deepSearchActive && result.subtitle && (
                    <span className="text-xs text-slate-500 dark:text-neutral-400 truncate max-w-[200px]">
                      — {result.subtitle}
                    </span>
                  )}
                </div>
              </div>
              {index === selectedIndex && (
                <kbd className="self-center px-1.5 py-0.5 rounded bg-slate-200 dark:bg-neutral-700 text-[10px] text-slate-500 dark:text-neutral-400 font-mono shrink-0">
                  ↵
                </kbd>
              )}
            </button>
          ))}

          {/* Deep Search Action Item */}
          {showDeepSearchAction && (
            <button
              className={`w-full flex items-start gap-3 px-4 py-3 text-left transition-colors border-t border-gray-100 dark:border-neutral-800 ${
                selectedIndex === deepSearchIndex
                  ? 'bg-[var(--app-accent-bg)]'
                  : 'hover:bg-slate-50 dark:hover:bg-neutral-800/50'
              }`}
              onClick={(e) => {
                e.preventDefault()
                handleDeepSearch()
              }}
              onMouseEnter={() => setSelectedIndex(deepSearchIndex)}
            >
              <div className="mt-0.5 p-1.5 rounded-lg bg-indigo-100 dark:bg-indigo-900/40 text-indigo-700 dark:text-indigo-300">
                <Search className="w-4 h-4" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="font-medium text-slate-900 dark:text-slate-100 truncate">
                  Deep Search
                </div>
                <div className="flex items-center gap-2 mt-0.5">
                  <span className="text-xs text-slate-500 dark:text-neutral-400 truncate">
                    Use semantics to find related content
                  </span>
                </div>
              </div>
              {selectedIndex === deepSearchIndex && (
                <kbd className="self-center px-1.5 py-0.5 rounded bg-slate-200 dark:bg-neutral-700 text-[10px] text-slate-500 dark:text-neutral-400 font-mono shrink-0">
                  ↵
                </kbd>
              )}
            </button>
          )}

          {/* Ask AI Action Item */}
          {showAskAIAction && (
            <button
              className={`w-full flex items-start gap-3 px-4 py-3 text-left transition-colors border-t border-gray-100 dark:border-neutral-800 ${
                selectedIndex === askAIIndex
                  ? 'bg-[var(--app-accent-bg)]'
                  : 'hover:bg-slate-50 dark:hover:bg-neutral-800/50'
              }`}
              onClick={(e) => {
                e.preventDefault()
                handleAskAI()
              }}
              onMouseEnter={() => setSelectedIndex(askAIIndex)}
            >
              <div className="mt-0.5 p-1.5 rounded-lg bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-300">
                <Sparkles className="w-4 h-4" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="font-medium text-slate-900 dark:text-slate-100 truncate">
                  Ask AI
                </div>
                <div className="flex items-center gap-2 mt-0.5">
                  <span className="text-xs text-slate-500 dark:text-neutral-400 truncate">
                    Chat with your course data
                  </span>
                </div>
              </div>
              {selectedIndex === askAIIndex && (
                <kbd className="self-center px-1.5 py-0.5 rounded bg-slate-200 dark:bg-neutral-700 text-[10px] text-slate-500 dark:text-neutral-400 font-mono shrink-0">
                  ↵
                </kbd>
              )}
            </button>
          )}
        </div>
      </div>
    </div>,
    document.body
  )
}
