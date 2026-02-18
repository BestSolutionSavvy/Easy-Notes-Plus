export const loadPdf = async (pdfId: string, subject: string, pdfPath: string) => {
  try {
    const result = await window.api.loadPdf(pdfId, subject, pdfPath)

    if (!result.success) {
      throw new Error('Failed to load PDF')
    }

    // Convert array to Uint8Array and create Blob
    const bytes = new Uint8Array(result.data)
    const blob = new Blob([bytes], { type: 'application/pdf' })

    return blob
  } catch (error: any) {
    console.error('Error loading PDF:', error)
    throw error
  }
}
