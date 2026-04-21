export type GridSize = '16' | '32' | '64'

export interface ReferenceImage {
  id: string
  dataUrl: string
  mimeType: string
}

export interface Message {
  id: string
  role: 'user' | 'assistant'
  text?: string
  referenceImages?: ReferenceImage[]
  generatedImages?: string[]
  gridSize?: GridSize
  timestamp: number
}

export interface Conversation {
  id: string
  title: string
  messages: Message[]
  createdAt: number
  updatedAt: number
}
