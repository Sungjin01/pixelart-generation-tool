'use client'

import { useState, useCallback, useRef, useEffect } from 'react'
import Sidebar from './Sidebar'
import MessageList from './MessageList'
import InputArea from './InputArea'
import { useConversations } from '../hooks/useConversations'
import { getApiKey } from './ApiKeyInput'
import type { GridSize, Message, ReferenceImage } from '../types'

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
  const apiKeyRef = useRef<string>('')

  useEffect(() => {
    apiKeyRef.current = getApiKey()
  }, [])

  const handleApiKeyChange = useCallback((key: string) => {
    apiKeyRef.current = key
  }, [])

  const handleSend = useCallback(
    async (text: string, images: ReferenceImage[], gridSize: GridSize, model: string) => {
      const userMessage: Message = {
        id: crypto.randomUUID(),
        role: 'user',
        text,
        referenceImages: images,
        gridSize,
        timestamp: Date.now(),
      }

      let conversationId = activeId
      if (!conversationId) {
        const conv = createConversation(userMessage)
        conversationId = conv.id
      } else {
        addMessage(conversationId, userMessage)
      }

      setLoading(true)
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
        const assistantMessage: Message = {
          id: crypto.randomUUID(),
          role: 'assistant',
          generatedImages: data.images ?? [],
          errorMessage: data.error,
          timestamp: Date.now(),
        }
        addMessage(conversationId, assistantMessage)
      } catch {
        const errorMessage: Message = {
          id: crypto.randomUUID(),
          role: 'assistant',
          generatedImages: [],
          errorMessage: '요청 중 오류가 발생했습니다.',
          timestamp: Date.now(),
        }
        addMessage(conversationId, errorMessage)
      } finally {
        setLoading(false)
      }
    },
    [activeId, createConversation, addMessage]
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
    <div className="flex h-screen bg-[#141414] text-white overflow-hidden">
      <Sidebar
        conversations={conversations}
        activeId={activeId}
        onSelect={(id) => { setActiveId(id); setContinueImages([]) }}
        onDelete={deleteConversation}
        onNew={handleNew}
        onApiKeyChange={handleApiKeyChange}
      />
      <div className="flex flex-col flex-1 min-w-0">
        <header className="shrink-0 px-6 py-4 border-b border-[#333] flex items-center">
          <h1 className="text-lg font-semibold tracking-tight">PixelArt Maker</h1>
        </header>
        <div className="flex flex-col flex-1 overflow-hidden">
          {activeConversation ? (
            <MessageList
              messages={activeConversation.messages}
              onContinueGeneration={handleContinueGeneration}
            />
          ) : (
            <div className="flex-1 flex items-center justify-center text-[#555] text-sm">
              새 대화를 시작하거나 사이드바에서 대화를 선택하세요.
            </div>
          )}
          <InputArea
            onSend={handleSend}
            loading={loading}
            initialImages={continueImages}
          />
        </div>
      </div>
    </div>
  )
}
