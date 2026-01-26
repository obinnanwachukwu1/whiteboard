declare module 'form-data' {
  class FormData {
    append(name: string, value: any, options?: any): void
    getHeaders(): Record<string, string>
  }

  export default FormData
}
