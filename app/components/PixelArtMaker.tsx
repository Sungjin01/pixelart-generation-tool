'use client'

import { useState, useCallback, useRef, useEffect } from 'react'
import Sidebar from './Sidebar'
import MessageList from './MessageList'
import InputArea from './InputArea'
import { useConversations } from '../hooks/useConversations'
import { getApiKey } from './ApiKeyInput'
import type { GridSize, Message, ReferenceImage } from '../types'

type Theme = 'dark' | 'light'

export default function PixelArtMaker() {
  const {
    conversations,
    activeId,
    activeConversation,
    setActiveId,
    createConversation,
    addMessage,
    deleteConversation,
  } = useConversations()

  const [loading, setLoading] = useState(false)
  const [continueImages, setContinueImages] = useState<ReferenceImage[]>([])
  const [theme, setTheme] = useState<Theme>('dark')
  const [apiKey, setApiKey] = useState('')
  const apiKeyRef = useRef<string>('')
  const isInFlight = useRef(false)
  const activeIdRef = useRef<string | null>(null)

  useEffect(() => {
    const key = getApiKey()
    apiKeyRef.current = key
    setApiKey(key)
    const saved = (localStorage.getItem('theme') ?? 'dark') as Theme
    setTheme(saved)
    document.documentElement.setAttribute('data-theme', saved)
  }, [])

  const toggleTheme = useCallback(() => {
    setTheme((t) => {
      const next: Theme = t === 'dark' ? 'light' : 'dark'
      localStorage.setItem('theme', next)
      document.documentElement.setAttribute('data-theme', next)
      return next
    })
  }, [])

  const handleApiKeyChange = useCallback((key: string) => {
    apiKeyRef.current = key
    setApiKey(key)
  }, [])

  // activeIdRef는 클로저 stale 없이 항상 최신 activeId를 읽기 위함
  useEffect(() => {
    activeIdRef.current = activeId
  }, [activeId])

  const handleSend = useCallback(
    async (text: string, images: ReferenceImage[], gridSize: GridSize, model: string) => {
      // ref로 동기 체크 → state 업데이트 타이밍과 무관하게 중복 호출 차단
      if (isInFlight.current) return
      isInFlight.current = true
      setLoading(true)

      const userMessage: Message = {
        id: crypto.randomUUID(),
        role: 'user',
        text,
        referenceImages: images,
        gridSize,
        timestamp: Date.now(),
      }

      let conversationId = activeIdRef.current
      if (!conversationId) {
        const conv = createConversation(userMessage)
        conversationId = conv.id
      } else {
        addMessage(conversationId, userMessage)
      }

      setContinueImages([])

      try {
        const res = await fetch('/api/generate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            prompt: text,
            gridSize,
            referenceImages: images,
            apiKey: apiKeyRef.current,
            model,
          }),
        })
        const data = await res.json()
        addMessage(conversationId, {
          id: crypto.randomUUID(),
          role: 'assistant',
          generatedImages: data.images ?? [],
          errorMessage: data.error,
          timestamp: Date.now(),
        })
      } catch {
        addMessage(conversationId, {
          id: crypto.randomUUID(),
          role: 'assistant',
          generatedImages: [],
          errorMessage: '요청 중 오류가 발생했습니다.',
          timestamp: Date.now(),
        })
      } finally {
        isInFlight.current = false
        setLoading(false)
      }
    },
    [createConversation, addMessage]
  )

  const handleContinueGeneration = useCallback((imageSrc: string) => {
    const refImage: ReferenceImage = {
      id: crypto.randomUUID(),
      dataUrl: imageSrc,
      mimeType: imageSrc.match(/^data:([^;]+)/)?.[1] ?? 'image/png',
    }
    setContinueImages([refImage])
  }, [])

  const handleNew = useCallback(() => {
    setActiveId(null)
    setContinueImages([])
  }, [setActiveId])

  return (
    <div
      className="flex h-screen overflow-hidden"
      style={{ background: 'var(--bg-base)', color: 'var(--text-primary)' }}
    >
      <Sidebar
        conversations={conversations}
        activeId={activeId}
        onSelect={(id) => { setActiveId(id); setContinueImages([]) }}
        onDelete={deleteConversation}
        onNew={handleNew}
        onApiKeyChange={handleApiKeyChange}
      />
      <div className="flex flex-col flex-1 min-w-0">
        <header
          className="shrink-0 px-6 py-4 flex items-center justify-between"
          style={{ borderBottom: '1px solid var(--border)' }}
        >
          <h1 className="text-lg font-semibold tracking-tight">PixelArt Maker</h1>
          <button
            onClick={toggleTheme}
            className="px-3 py-1 rounded-lg text-xs font-medium transition-colors"
            style={{ background: 'var(--bg-element)', color: 'var(--text-secondary)', border: '1px solid var(--border-subtle)' }}
          >
            {theme === 'dark' ? 'Light' : 'Dark'}
          </button>
        </header>
        <div className="flex flex-col flex-1 overflow-hidden">
          {activeConversation ? (
            <MessageList
              messages={activeConversation.messages}
              onContinueGeneration={handleContinueGeneration}
            />
          ) : (
            <div className="flex-1 flex items-center justify-center text-sm" style={{ color: 'var(--text-muted)' }}>
              새 대화를 시작하거나 사이드바에서 대화를 선택하세요.
            </div>
          )}
          <InputArea
            onSend={handleSend}
            loading={loading}
            initialImages={continueImages}
            apiKey={apiKey}
          />
        </div>
      </div>
    </div>
  )
}
