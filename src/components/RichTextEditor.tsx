import React, { useCallback, useEffect, useRef, useState } from 'react'
import { useEditor, EditorContent } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import Link from '@tiptap/extension-link'
import Underline from '@tiptap/extension-underline'
import Placeholder from '@tiptap/extension-placeholder'
import Image from '@tiptap/extension-image'
import {
  Bold,
  Italic,
  Underline as UnderlineIcon,
  Strikethrough,
  List,
  ListOrdered,
  Quote,
  Code,
  Link as LinkIcon,
  Unlink,
  Send,
  X,
  ImageIcon,
  Check,
} from 'lucide-react'

type Props = {
  placeholder?: string
  onSubmit: (html: string) => void
  onCancel?: () => void
  isSubmitting?: boolean
  autoFocus?: boolean
  draftKey?: string
}

const DRAFT_PREFIX = 'whiteboard-draft-'

// Toolbar button component - defined outside to prevent recreation
const ToolbarButton = React.memo<{
  onClick: () => void
  isActive?: boolean
  disabled?: boolean
  title: string
  children: React.ReactNode
}>(({ onClick, isActive, disabled, title, children }) => (
  <button
    type="button"
    onMouseDown={(e) => {
      e.preventDefault()
    }}
    onClick={onClick}
    disabled={disabled}
    title={title}
    className={`p-1.5 rounded transition-colors ${
      isActive
        ? 'bg-neutral-900 dark:bg-neutral-100 text-white dark:text-neutral-900'
        : 'text-neutral-600 dark:text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-800 hover:text-neutral-900 dark:hover:text-neutral-100'
    } disabled:opacity-50 disabled:cursor-not-allowed`}
  >
    {children}
  </button>
))
ToolbarButton.displayName = 'ToolbarButton'

export const RichTextEditor: React.FC<Props> = ({
  placeholder = 'Write a reply...',
  onSubmit,
  onCancel,
  isSubmitting = false,
  autoFocus = false,
  draftKey,
}) => {
  const saveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const initialContentRef = useRef<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const linkInputRef = useRef<HTMLInputElement>(null)

  // Track editor state for toolbar updates
  const [, setEditorState] = useState(0)
  // Link input state
  const [showLinkInput, setShowLinkInput] = useState(false)
  const [linkUrl, setLinkUrl] = useState('')

  // Load draft from localStorage on mount
  if (draftKey && initialContentRef.current === null) {
    try {
      const saved = localStorage.getItem(DRAFT_PREFIX + draftKey)
      initialContentRef.current = saved && saved !== '<p></p>' ? saved : ''
    } catch {
      initialContentRef.current = ''
    }
  }

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: false,
      }),
      Underline,
      Link.configure({
        openOnClick: false,
        HTMLAttributes: {
          target: '_blank',
          rel: 'noopener noreferrer',
        },
      }),
      Placeholder.configure({
        placeholder,
      }),
      Image.configure({
        inline: false,
        allowBase64: true,
        HTMLAttributes: {
          class: 'max-w-full h-auto rounded',
        },
      }),
    ],
    content: initialContentRef.current || '',
    autofocus: autoFocus,
    editorProps: {
      attributes: {
        class: 'prose prose-sm dark:prose-invert max-w-none focus:outline-none min-h-[80px] px-3 py-2',
      },
      handlePaste: (_view, event) => {
        const items = event.clipboardData?.items
        if (!items) return false

        for (const item of items) {
          if (item.type.startsWith('image/')) {
            event.preventDefault()
            const file = item.getAsFile()
            if (file) {
              insertImageFromFile(file)
            }
            return true
          }
        }
        return false
      },
      handleDrop: (_view, event) => {
        const files = event.dataTransfer?.files
        if (!files || files.length === 0) return false

        for (const file of files) {
          if (file.type.startsWith('image/')) {
            event.preventDefault()
            insertImageFromFile(file)
            return true
          }
        }
        return false
      },
    },
    onUpdate: ({ editor }) => {
      if (draftKey) {
        if (saveTimeoutRef.current) {
          clearTimeout(saveTimeoutRef.current)
        }
        saveTimeoutRef.current = setTimeout(() => {
          try {
            const html = editor.getHTML()
            if (html && html !== '<p></p>') {
              localStorage.setItem(DRAFT_PREFIX + draftKey, html)
            } else {
              localStorage.removeItem(DRAFT_PREFIX + draftKey)
            }
          } catch {
            // Ignore storage errors
          }
        }, 500)
      }
    },
    onSelectionUpdate: () => {
      setEditorState(s => s + 1)
    },
    onTransaction: () => {
      setEditorState(s => s + 1)
    },
  })

  const insertImageFromFile = useCallback((file: File) => {
    if (!editor) return

    const reader = new FileReader()
    reader.onload = (e) => {
      const base64 = e.target?.result as string
      if (base64) {
        editor.chain().focus().setImage({ src: base64 }).run()
      }
    }
    reader.readAsDataURL(file)
  }, [editor])

  useEffect(() => {
    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current)
      }
    }
  }, [])

  // Focus link input when shown
  useEffect(() => {
    if (showLinkInput && linkInputRef.current) {
      linkInputRef.current.focus()
    }
  }, [showLinkInput])

  const clearDraft = useCallback(() => {
    if (draftKey) {
      try {
        localStorage.removeItem(DRAFT_PREFIX + draftKey)
      } catch {
        // Ignore
      }
    }
  }, [draftKey])

  const handleSubmit = useCallback(() => {
    if (!editor) return
    const html = editor.getHTML()
    if (html === '<p></p>' || !html.trim()) return
    onSubmit(html)
    editor.commands.clearContent()
    clearDraft()
  }, [editor, onSubmit, clearDraft])

  const handleCancel = useCallback(() => {
    if (editor) {
      editor.commands.clearContent()
    }
    clearDraft()
    onCancel?.()
  }, [editor, onCancel, clearDraft])

  const handleLinkClick = useCallback(() => {
    if (!editor) return

    // If already a link, get the current URL
    const previousUrl = editor.getAttributes('link').href || ''
    setLinkUrl(previousUrl)
    setShowLinkInput(true)
  }, [editor])

  const applyLink = useCallback(() => {
    if (!editor) return

    if (linkUrl.trim() === '') {
      editor.chain().focus().extendMarkRange('link').unsetLink().run()
    } else {
      let url = linkUrl.trim()
      // Add https:// if no protocol specified
      if (url && !url.match(/^https?:\/\//)) {
        url = 'https://' + url
      }
      editor.chain().focus().extendMarkRange('link').setLink({ href: url }).run()
    }
    setShowLinkInput(false)
    setLinkUrl('')
  }, [editor, linkUrl])

  const cancelLink = useCallback(() => {
    setShowLinkInput(false)
    setLinkUrl('')
    editor?.chain().focus().run()
  }, [editor])

  const handleImageClick = useCallback(() => {
    fileInputRef.current?.click()
  }, [])

  const handleFileChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file && file.type.startsWith('image/')) {
      insertImageFromFile(file)
    }
    e.target.value = ''
  }, [insertImageFromFile])

  if (!editor) return null

  return (
    <div className="border border-neutral-300 dark:border-neutral-700 rounded-xl bg-white dark:bg-neutral-950 overflow-hidden shadow-sm">
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleFileChange}
        className="hidden"
      />

      {/* Toolbar */}
      <div className="flex items-center gap-0.5 px-2 py-1.5 border-b border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-900/50 flex-wrap">
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleBold().run()}
          isActive={editor.isActive('bold')}
          title="Bold (Cmd+B)"
        >
          <Bold className="w-4 h-4" />
        </ToolbarButton>

        <ToolbarButton
          onClick={() => editor.chain().focus().toggleItalic().run()}
          isActive={editor.isActive('italic')}
          title="Italic (Cmd+I)"
        >
          <Italic className="w-4 h-4" />
        </ToolbarButton>

        <ToolbarButton
          onClick={() => editor.chain().focus().toggleUnderline().run()}
          isActive={editor.isActive('underline')}
          title="Underline (Cmd+U)"
        >
          <UnderlineIcon className="w-4 h-4" />
        </ToolbarButton>

        <ToolbarButton
          onClick={() => editor.chain().focus().toggleStrike().run()}
          isActive={editor.isActive('strike')}
          title="Strikethrough"
        >
          <Strikethrough className="w-4 h-4" />
        </ToolbarButton>

        <div className="w-px h-5 bg-neutral-300 dark:bg-neutral-700 mx-1" />

        <ToolbarButton
          onClick={() => editor.chain().focus().toggleBulletList().run()}
          isActive={editor.isActive('bulletList')}
          title="Bullet List"
        >
          <List className="w-4 h-4" />
        </ToolbarButton>

        <ToolbarButton
          onClick={() => editor.chain().focus().toggleOrderedList().run()}
          isActive={editor.isActive('orderedList')}
          title="Numbered List"
        >
          <ListOrdered className="w-4 h-4" />
        </ToolbarButton>

        <div className="w-px h-5 bg-neutral-300 dark:bg-neutral-700 mx-1" />

        <ToolbarButton
          onClick={() => editor.chain().focus().toggleBlockquote().run()}
          isActive={editor.isActive('blockquote')}
          title="Quote"
        >
          <Quote className="w-4 h-4" />
        </ToolbarButton>

        <ToolbarButton
          onClick={() => editor.chain().focus().toggleCode().run()}
          isActive={editor.isActive('code')}
          title="Inline Code"
        >
          <Code className="w-4 h-4" />
        </ToolbarButton>

        <div className="w-px h-5 bg-neutral-300 dark:bg-neutral-700 mx-1" />

        <ToolbarButton
          onClick={handleLinkClick}
          isActive={editor.isActive('link') || showLinkInput}
          title="Add Link"
        >
          <LinkIcon className="w-4 h-4" />
        </ToolbarButton>

        {editor.isActive('link') && !showLinkInput && (
          <ToolbarButton
            onClick={() => editor.chain().focus().unsetLink().run()}
            title="Remove Link"
          >
            <Unlink className="w-4 h-4" />
          </ToolbarButton>
        )}

        <ToolbarButton
          onClick={handleImageClick}
          title="Add Image"
        >
          <ImageIcon className="w-4 h-4" />
        </ToolbarButton>

        {/* Spacer */}
        <div className="flex-1" />

        {/* Cancel button */}
        {onCancel && (
          <button
            type="button"
            onClick={handleCancel}
            className="flex items-center gap-1 px-2 py-1 text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-neutral-100 hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded-lg text-sm transition-colors mr-1"
            title="Cancel"
          >
            <X className="w-4 h-4" />
            <span>Cancel</span>
          </button>
        )}

        {/* Submit button */}
        <button
          type="button"
          onMouseDown={(e) => e.preventDefault()}
          onClick={handleSubmit}
          disabled={isSubmitting}
          className="flex items-center gap-1.5 px-3 py-1 bg-neutral-900 dark:bg-neutral-100 text-white dark:text-neutral-900 rounded-lg text-sm font-medium hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed transition-opacity"
        >
          <Send className="w-3.5 h-3.5" />
          <span>Reply</span>
        </button>
      </div>

      {/* Link input bar */}
      {showLinkInput && (
        <div className="flex items-center gap-2 px-3 py-2 border-b border-neutral-200 dark:border-neutral-800 bg-neutral-100 dark:bg-neutral-900">
          <LinkIcon className="w-4 h-4 text-neutral-500 shrink-0" />
          <input
            ref={linkInputRef}
            type="url"
            value={linkUrl}
            onChange={(e) => setLinkUrl(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault()
                applyLink()
              } else if (e.key === 'Escape') {
                cancelLink()
              }
            }}
            placeholder="Enter URL (e.g., https://example.com)"
            className="flex-1 px-2 py-1 text-sm bg-white dark:bg-neutral-950 border border-neutral-300 dark:border-neutral-700 rounded focus:outline-none focus:ring-1 focus:ring-neutral-500"
          />
          <button
            type="button"
            onClick={applyLink}
            className="p-1.5 rounded bg-neutral-900 dark:bg-neutral-100 text-white dark:text-neutral-900 hover:opacity-90"
            title="Apply"
          >
            <Check className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={cancelLink}
            className="p-1.5 rounded text-neutral-600 dark:text-neutral-400 hover:bg-neutral-200 dark:hover:bg-neutral-800"
            title="Cancel"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Editor content */}
      <EditorContent editor={editor} />
    </div>
  )
}
