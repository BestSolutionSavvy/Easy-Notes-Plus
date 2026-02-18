interface Box {
  left: number
  top: number
  width: number
  height: number
  content: string
}

interface Pages {
  page_number: number
  slide_number: number
  note_content: string
  text_boxes: Box[]
  highlights: Box[]
}

interface Notebook {
  name: string
  subject: string
  pdf: string
  date: string
  last_page: number
  num_notebook_pages: number
  pages: Pages[]
}

export type { Notebook }
