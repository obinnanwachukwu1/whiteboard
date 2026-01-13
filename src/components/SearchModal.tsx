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
  Command
} from 'lucide-react'
import { useGlobalSearch } from '../hooks/useGlobalSearch'
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
  const inputRef = useRef<HTMLInputElement>(null)
  const listRef = useRef<HTMLDivElement>(null)
  const [selectedIndex, setSelectedIndex] = useState(0)
  
  const { 
    query, 
    setQuery, 
    results, 
    isReady, 
    isBuilding, 
    isSearching,
    clearSearch 
  } = useGlobalSearch()

  // Focus input when modal opens
  useEffect(() => {
    if (isOpen) {
      // Small delay to ensure modal is rendered
      const timer = setTimeout(() => {
        inputRef.current?.focus()
      }, 50)
      return () => clearTimeout(timer)
    } else {
      clearSearch()
      setSelectedIndex(0)
    }
  }, [isOpen, clearSearch])

  // Reset selection when results change
  useEffect(() => {
    setSelectedIndex(0)
  }, [results])

  // Navigate to result
  const navigateToResult = useCallback((result: SearchResult) => {
    // Always close modal and clear search first
    onClose()
    clearSearch()
    
    // Then navigate based on type
    if (result.type === 'course') {
      navigate({ to: '/course/$courseId', params: { courseId: String(result.id) } })
      return
    }
    
    // All other types require courseId
    if (!result.courseId) {
      console.warn('Search result missing courseId:', result)
      return
    }
    
    const courseId = String(result.courseId)
    
    switch (result.type) {
      case 'assignment':
        navigate({ 
          to: '/course/$courseId', 
          params: { courseId },
          search: { tab: 'assignments', type: 'assignment', contentId: String(result.contentId), title: result.title }
        })
        break
      case 'announcement':
        navigate({ 
          to: '/course/$courseId', 
          params: { courseId },
          search: { tab: 'announcements', type: 'announcement', contentId: String(result.contentId), title: result.title }
        })
        break
      case 'file':
        navigate({ 
          to: '/course/$courseId', 
          params: { courseId },
          search: { tab: 'files', type: 'file', contentId: String(result.contentId), title: result.title }
        })
        break
      case 'module':
        // Just open modules tab
        navigate({ 
          to: '/course/$courseId', 
          params: { courseId },
          search: { tab: 'modules' }
        })
        break
      case 'page':
        // For pages, use pageUrl as contentId (it's the slug), or fall back to contentId
        const pageContentId = result.pageUrl || result.contentId
        if (pageContentId) {
          navigate({ 
            to: '/course/$courseId', 
            params: { courseId },
            search: { tab: 'home', type: 'page', contentId: String(pageContentId), title: result.title }
          })
        } else {
          // Just open modules tab if no specific page
          navigate({ 
            to: '/course/$courseId', 
            params: { courseId },
            search: { tab: 'modules' }
          })
        }
        break
    }
  }, [navigate, onClose, clearSearch])

  // Keyboard navigation
  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault()
        setSelectedIndex(prev => Math.min(prev + 1, results.length - 1))
        break
      case 'ArrowUp':
        e.preventDefault()
        setSelectedIndex(prev => Math.max(prev - 1, 0))
        break
      case 'Enter':
        e.preventDefault()
        if (results[selectedIndex]) {
          navigateToResult(results[selectedIndex])
        }
        break
      case 'Escape':
        e.preventDefault()
        onClose()
        break
    }
  }, [results, selectedIndex, navigateToResult, onClose])

  // Scroll selected item into view
  useEffect(() => {
    if (listRef.current && results.length > 0) {
      const selectedEl = listRef.current.children[selectedIndex] as HTMLElement | undefined
      selectedEl?.scrollIntoView({ block: 'nearest' })
    }
  }, [selectedIndex, results.length])

  if (!isOpen) return null

  return createPortal(
    <div 
      className="fixed inset-0 z-[200] flex items-start justify-center pt-[15vh]"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose()
      }}
    >
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      
      {/* Modal */}
      <div 
        className="relative w-full max-w-xl mx-4 bg-white dark:bg-neutral-900 rounded-xl shadow-2xl ring-1 ring-black/10 dark:ring-white/10 overflow-hidden animate-in fade-in zoom-in-95 duration-150"
        role="dialog"
        aria-modal="true"
        aria-label="Global search"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Search input */}
        <div className="flex items-center gap-3 px-4 py-3 border-b border-gray-200 dark:border-neutral-800">
          <Search className="w-5 h-5 text-slate-400 shrink-0" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={isReady ? "Search courses, assignments, files..." : "Building search index..."}
            disabled={!isReady && !isBuilding}
            className="flex-1 bg-transparent text-slate-900 dark:text-slate-100 placeholder-slate-400 dark:placeholder-neutral-500 text-base outline-none disabled:opacity-50"
          />
          {(isSearching || isBuilding) && (
            <Loader2 className="w-4 h-4 text-slate-400 animate-spin shrink-0" />
          )}
          <button
            onClick={onClose}
            className="p-1 rounded hover:bg-slate-100 dark:hover:bg-neutral-800 text-slate-500 transition-colors"
            aria-label="Close search"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
        
        {/* Results */}
        <div ref={listRef} className="max-h-[50vh] overflow-y-auto">
          {!query.trim() && (
            <div className="px-4 py-8 text-center text-slate-500 dark:text-neutral-400">
              <div className="flex items-center justify-center gap-1 text-sm mb-2">
                <Command className="w-4 h-4" />
                <span>+</span>
                <kbd className="px-1.5 py-0.5 rounded bg-slate-100 dark:bg-neutral-800 text-xs font-mono">K</kbd>
                <span className="ml-1">to search anywhere</span>
              </div>
              <p className="text-xs">Type to search across all your courses</p>
            </div>
          )}
          
          {query.trim() && results.length === 0 && !isSearching && (
            <div className="px-4 py-8 text-center text-slate-500 dark:text-neutral-400">
              <p className="text-sm">No results found for "{query}"</p>
              <p className="text-xs mt-1">Try a different search term</p>
            </div>
          )}
          
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
                e.stopPropagation()
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
                  {result.subtitle && !result.courseName && (
                    <span className="text-xs text-slate-500 dark:text-neutral-400 truncate">
                      {result.subtitle}
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
        </div>
        
        {/* Footer */}
        <div className="px-4 py-2 border-t border-gray-200 dark:border-neutral-800 flex items-center justify-between text-xs text-slate-500 dark:text-neutral-400">
          <div className="flex items-center gap-3">
            <span className="flex items-center gap-1">
              <kbd className="px-1 py-0.5 rounded bg-slate-100 dark:bg-neutral-800 font-mono">↑↓</kbd>
              navigate
            </span>
            <span className="flex items-center gap-1">
              <kbd className="px-1 py-0.5 rounded bg-slate-100 dark:bg-neutral-800 font-mono">↵</kbd>
              open
            </span>
            <span className="flex items-center gap-1">
              <kbd className="px-1 py-0.5 rounded bg-slate-100 dark:bg-neutral-800 font-mono">esc</kbd>
              close
            </span>
          </div>
          {isReady && (
            <span>{results.length > 0 ? `${results.length} results` : ''}</span>
          )}
        </div>
      </div>
    </div>,
    document.body
  )
}
