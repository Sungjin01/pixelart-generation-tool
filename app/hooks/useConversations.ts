'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import type { Conversation, Message } from '../types'

const STORAGE_KEY = 'pixelart-conversations'

function loadFromStorage(): Conversation[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    return raw ? JSON.parse(raw) : []
  } catch {
    return []
  }
}

function saveToStorage(conversations: Conversation[]) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(conversations))
  } catch {
    // storage full or unavailable
  }
}

export function useConversations() {
  const [conversations, setConversations] = useState<Conversation[]>([])
  const [activeId, setActiveId] = useState<string | null>(null)
  const conversationsRef = useRef<Conversation[]>([])

  useEffect(() => {
    const loaded = loadFromStorage()
    setConversations(loaded)
    conversationsRef.current = loaded
    if (loaded.length > 0) setActiveId(loaded[0].id)
  }, [])

  const persist = useCallback((next: Conversation[]) => {
    conversationsRef.current = next
    setConversations(next)
    saveToStorage(next)
  }, [])

  const createConversation = useCallback((firstMessage: Message): Conversation => {
    const id = crypto.randomUUID()
    const title = firstMessage.text?.slice(0, 40) ?? '새 대화'
    const conversation: Conversation = {
      id,
      title,
      messages: [firstMessage],
      createdAt: Date.now(),
      updatedAt: Date.now(),
    }
    persist([conversation, ...conversationsRef.current])
    setActiveId(id)
    return conversation
  }, [persist])

  const addMessage = useCallback((conversationId: string, message: Message) => {
    const next = conversationsRef.current.map((c) =>
      c.id === conversationId
        ? { ...c, messages: [...c.messages, message], updatedAt: Date.now() }
        : c
    )
    persist(next)
  }, [persist])

  const deleteConversation = useCallback((id: string) => {
    const next = conversationsRef.current.filter((c) => c.id !== id)
    persist(next)
    setActiveId((current) => {
      if (current !== id) return current
      return next[0]?.id ?? null
    })
  }, [persist])

  const activeConversation = conversations.find((c) => c.id === activeId) ?? null

  return {
    conversations,
    activeId,
    activeConversation,
    setActiveId,
    createConversation,
    addMessage,
    deleteConversation,
  }
}
