// Simple in-memory cache for PDF bytes
class PdfCache {
  private cache = new Map<string, ArrayBuffer>()
  private maxSize = 50 // Maximum number of PDFs to cache
  private accessOrder = new Set<string>() // Track access order for LRU eviction

  get(fileId: string | number): ArrayBuffer | null {
    const key = String(fileId)
    const data = this.cache.get(key)
    
    if (data) {
      // Update access order for LRU
      this.accessOrder.delete(key)
      this.accessOrder.add(key)
      console.log(`PDF cache HIT for file ${fileId}`)
      return data
    }
    
    console.log(`PDF cache MISS for file ${fileId}`)
    return null
  }

  set(fileId: string | number, data: ArrayBuffer): void {
    const key = String(fileId)
    
    // If cache is at max size, remove least recently used item
    if (this.cache.size >= this.maxSize && !this.cache.has(key)) {
      const lruKey = this.accessOrder.values().next().value
      if (lruKey) {
        this.cache.delete(lruKey)
        this.accessOrder.delete(lruKey)
        console.log(`PDF cache EVICTED ${lruKey} (LRU)`)
      }
    }
    
    this.cache.set(key, data)
    this.accessOrder.delete(key)
    this.accessOrder.add(key)
    
    console.log(`PDF cache STORED file ${fileId} (cache size: ${this.cache.size})`)
  }

  clear(): void {
    this.cache.clear()
    this.accessOrder.clear()
    console.log('PDF cache CLEARED')
  }

  getSize(): number {
    return this.cache.size
  }

  getKeys(): string[] {
    return Array.from(this.cache.keys())
  }
}

// Export a singleton instance
export const pdfCache = new PdfCache()