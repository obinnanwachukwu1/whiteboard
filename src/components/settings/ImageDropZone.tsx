import React, { useState, useCallback } from 'react'
import { Upload, X, Image as ImageIcon, Loader2 } from 'lucide-react'

interface ImageDropZoneProps {
  imageUrl: string | undefined
  onImageSelect: (url: string) => void
  onImageRemove: () => void
  disabled?: boolean
}

export function ImageDropZone({
  imageUrl,
  onImageSelect,
  onImageRemove,
  disabled = false,
}: ImageDropZoneProps) {
  const [isDragging, setIsDragging] = useState(false)
  const [isUploading, setIsUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handlePickFile = useCallback(async () => {
    if (disabled || isUploading) return
    setError(null)

    try {
      // Use Electron's file picker
      const result = await window.theme?.pickBackgroundImage?.()

      if (!result?.ok) {
        if (result?.error) {
          setError(result.error)
        }
        return
      }

      if (!result.data) return // User cancelled

      setIsUploading(true)

      // Upload the selected file
      const uploadResult = await window.theme?.uploadBackgroundImage?.(result.data.path)

      if (!uploadResult?.ok) {
        setError(uploadResult?.error || 'Failed to upload image')
        return
      }

      if (uploadResult.data?.url) {
        onImageSelect(uploadResult.data.url)
      }
    } catch (e: any) {
      setError(e?.message || 'Failed to upload image')
    } finally {
      setIsUploading(false)
    }
  }, [disabled, isUploading, onImageSelect])

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    if (!disabled && !isUploading) {
      setIsDragging(true)
    }
  }, [disabled, isUploading])

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
  }, [])

  const handleDrop = useCallback(async (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)

    if (disabled || isUploading) return
    setError(null)

    const files = e.dataTransfer.files
    if (files.length === 0) return

    const file = files[0]

    // Check file type
    const validTypes = ['image/jpeg', 'image/png', 'image/webp']
    if (!validTypes.includes(file.type)) {
      setError('Invalid file type. Use JPG, PNG, or WebP')
      return
    }

    // Check file size (10MB max)
    if (file.size > 10 * 1024 * 1024) {
      setError('File too large. Maximum size is 10MB')
      return
    }

    // Note: In Electron, drag-drop gives us file paths
    // @ts-ignore - path exists on dropped files in Electron
    const filePath = file.path
    if (!filePath) {
      setError('Could not read file path')
      return
    }

    setIsUploading(true)

    try {
      const uploadResult = await window.theme?.uploadBackgroundImage?.(filePath)

      if (!uploadResult?.ok) {
        setError(uploadResult?.error || 'Failed to upload image')
        return
      }

      if (uploadResult.data?.url) {
        onImageSelect(uploadResult.data.url)
      }
    } catch (e: any) {
      setError(e?.message || 'Failed to upload image')
    } finally {
      setIsUploading(false)
    }
  }, [disabled, isUploading, onImageSelect])

  const handleRemove = useCallback(async () => {
    if (!imageUrl || disabled) return

    try {
      // Delete the image file
      await window.theme?.deleteBackgroundImage?.(imageUrl)
    } catch (e) {
      console.error('Failed to delete background image:', e)
    }

    onImageRemove()
  }, [imageUrl, disabled, onImageRemove])

  // If we have an image, show preview
  if (imageUrl) {
    return (
      <div className="relative group">
        <div className="relative w-full h-32 rounded-lg overflow-hidden ring-1 ring-gray-200 dark:ring-neutral-700">
          <img
            src={imageUrl}
            alt="Background preview"
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-colors flex items-center justify-center">
            <button
              onClick={handleRemove}
              disabled={disabled}
              className="opacity-0 group-hover:opacity-100 transition-opacity p-2 rounded-full bg-red-500 text-white hover:bg-red-600 disabled:opacity-50"
              title="Remove image"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
        <p className="mt-1 text-xs text-slate-500 dark:text-neutral-400 text-center">
          Click the X to remove
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-2">
      <button
        onClick={handlePickFile}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        disabled={disabled || isUploading}
        className={`
          w-full h-32 rounded-lg border-2 border-dashed transition-colors
          flex flex-col items-center justify-center gap-2
          ${isDragging
            ? 'border-blue-500 bg-blue-50 dark:bg-blue-950/30'
            : 'border-gray-300 dark:border-neutral-600 hover:border-gray-400 dark:hover:border-neutral-500'
          }
          ${disabled || isUploading ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
        `}
      >
        {isUploading ? (
          <>
            <Loader2 className="w-6 h-6 text-slate-400 animate-spin" />
            <span className="text-sm text-slate-500 dark:text-neutral-400">
              Uploading...
            </span>
          </>
        ) : (
          <>
            {isDragging ? (
              <ImageIcon className="w-6 h-6 text-blue-500" />
            ) : (
              <Upload className="w-6 h-6 text-slate-400" />
            )}
            <span className="text-sm text-slate-500 dark:text-neutral-400">
              {isDragging ? 'Drop image here' : 'Click or drag to upload'}
            </span>
            <span className="text-xs text-slate-400 dark:text-neutral-500">
              JPG, PNG, WebP (max 10MB)
            </span>
          </>
        )}
      </button>

      {error && (
        <p className="text-xs text-red-500 dark:text-red-400 text-center">
          {error}
        </p>
      )}
    </div>
  )
}
