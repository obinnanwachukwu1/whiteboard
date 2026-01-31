declare module 'unpdf' {
  export type ExtractTextOptions = {
    mergePages?: boolean
  }

  export type ExtractTextResult = {
    text: string | string[]
    totalPages?: number
  }

  export function extractText(
    data: Uint8Array,
    options?: ExtractTextOptions,
  ): Promise<ExtractTextResult>
}
