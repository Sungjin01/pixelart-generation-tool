'use client'

import { useState, useRef, useCallback, useEffect } from 'react'
import type { GridSize, ReferenceImage } from '../types'

const MODEL_STORAGE = 'gemini-model'
const DEFAULT_MODEL = 'gemini-2.0-flash-preview-image-generation'
const MODELS = [
  { value: 'gemini-2.0-flash-preview-image-generation', label: 'Flash 2.0 Preview' },
  { value: 'gemini-3.1-flash-image-preview', label: 'Flash 3.1 Preview' },
  { value: 'gemini-2.0-flash-exp', label: 'Flash 2.0 Exp' },
]

function loadModel(): string {
  try { return localStorage.getItem(MODEL_STORAGE) ?? DEFAULT_MODEL } catch { return DEFAULT_MODEL }
}

export function getModel(): string {
  return loadModel()
}

interface Props {
  onSend: (text: string, images: ReferenceImage[], gridSize: GridSize, model: string) => void
  loading: boolean
  initialImages?: ReferenceImage[]
}

export default function InputArea({ onSend, loading, initialImages }: Props) {
  const [text, setText] = useState('')
  const [gridSize, setGridSize] = useState<GridSize>('32')
  const [model, setModel] = useState(loadModel)
  const [images, setImages] = useState<ReferenceImage[]>([])
  const fileInputRef = useRef<HTMLInputElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    if (initialImages && initialImages.length > 0) {
      setImages((prev) => [...prev, ...initialImages])
      textareaRef.current?.focus()
    }
  }, [initialImages])

  function handleModelChange(value: string) {
    setModel(value)
    try { localStorage.setItem(MODEL_STORAGE, value) } catch { /* ignore */ }
  }

  const addImageFromFile = useCallback((file: File) => {
    const reader = new FileReader()
    reader.onload = (e) => {
      const dataUrl = e.target?.result as string
      setImages((prev) => [
        ...prev,
        { id: crypto.randomUUID(), dataUrl, mimeType: file.type },
      ])
    }
    reader.readAsDataURL(file)
  }, [])

  const handlePaste = useCallback((e: React.ClipboardEvent) => {
    const items = Array.from(e.clipboardData.items)
    for (const item of items) {
      if (item.type.startsWith('image/')) {
        const file = item.getAsFile()
        if (file) addImageFromFile(file)
      }
    }
  }, [addImageFromFile])

  const handleFileChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? [])
    files.forEach(addImageFromFile)
    e.target.value = ''
  }, [addImageFromFile])

  const removeImage = useCallback((id: string) => {
    setImages((prev) => prev.filter((img) => img.id !== id))
  }, [])

  const submit = useCallback(() => {
    if (!loading && (text.trim() || images.length > 0)) {
      onSend(text.trim(), images, gridSize, model)
      setText('')
      setImages([])
    }
  }, [loading, text, images, gridSize, model, onSend])

  const handleKeyDown = useCallback((e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      submit()
    }
  }, [submit])

  return (
    <div className="border-t border-[#333] p-4">
      <div className="max-w-3xl mx-auto">
        <div className="bg-[#1e1e1e] border border-[#444] rounded-2xl overflow-hidden">
          {images.length > 0 && (
            <div className="flex flex-wrap gap-2 p-3 pb-0">
              {images.map((img) => (
                <div key={img.id} className="relative">
                  <img
                    src={img.dataUrl}
                    alt="reference"
                    className="w-14 h-14 object-cover rounded border border-[#555]"
                  />
                  <button
                    onClick={() => removeImage(img.id)}
                    className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 rounded-full text-white text-xs flex items-center justify-center leading-none"
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>
          )}
          <textarea
            ref={textareaRef}
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={handleKeyDown}
            onPaste={handlePaste}
            placeholder="픽셀아트 설명을 입력하세요... (Enter로 전송, Shift+Enter로 줄바꿈)"
            rows={3}
            className="w-full bg-transparent text-white text-sm px-4 pt-3 pb-2 resize-none outline-none placeholder-[#666]"
          />
          <div className="flex items-center justify-between px-3 pb-3">
            <div className="flex items-center gap-2">
              <select
                value={gridSize}
                onChange={(e) => setGridSize(e.target.value as GridSize)}
                className="bg-[#2a2a2a] text-[#aaa] text-sm rounded-lg px-2 py-1 border border-[#444] outline-none cursor-pointer hover:border-[#666]"
              >
                <option value="16">16×16</option>
                <option value="32">32×32</option>
                <option value="64">64×64</option>
              </select>
              <select
                value={model}
                onChange={(e) => handleModelChange(e.target.value)}
                className="bg-[#2a2a2a] text-[#aaa] text-sm rounded-lg px-2 py-1 border border-[#444] outline-none cursor-pointer hover:border-[#666]"
              >
                {MODELS.map((m) => (
                  <option key={m.value} value={m.value}>{m.label}</option>
                ))}
              </select>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => fileInputRef.current?.click()}
                className="w-8 h-8 flex items-center justify-center rounded-lg text-[#aaa] hover:bg-[#333] hover:text-white transition-colors text-lg"
                title="레퍼런스 이미지 추가"
              >
                🖼
              </button>
              <button
                onClick={submit}
                disabled={loading || (!text.trim() && images.length === 0)}
                className="px-4 py-1.5 bg-white text-black text-sm font-medium rounded-lg disabled:opacity-40 hover:bg-gray-200 transition-colors"
              >
                {loading ? '생성 중...' : '전송'}
              </button>
            </div>
          </div>
        </div>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          multiple
          className="hidden"
          onChange={handleFileChange}
        />
      </div>
    </div>
  )
}
