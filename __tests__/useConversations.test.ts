import { describe, it, expect, beforeEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useConversations } from '../app/hooks/useConversations'
import type { Message } from '../app/types'

function makeMessage(text = 'hello'): Message {
  return {
    id: crypto.randomUUID(),
    role: 'user',
    text,
    timestamp: Date.now(),
  }
}

beforeEach(() => {
  localStorage.clear()
})

describe('useConversations', () => {
  it('starts empty', () => {
    const { result } = renderHook(() => useConversations())
    expect(result.current.conversations).toHaveLength(0)
    expect(result.current.activeId).toBeNull()
  })

  it('createConversation adds exactly one conversation', () => {
    const { result } = renderHook(() => useConversations())
    act(() => {
      result.current.createConversation(makeMessage('first'))
    })
    expect(result.current.conversations).toHaveLength(1)
    expect(result.current.activeId).toBeTruthy()
  })

  it('calling createConversation twice adds two separate conversations', () => {
    const { result } = renderHook(() => useConversations())
    act(() => {
      result.current.createConversation(makeMessage('first'))
    })
    act(() => {
      result.current.createConversation(makeMessage('second'))
    })
    expect(result.current.conversations).toHaveLength(2)
  })

  it('addMessage appends to the correct conversation without duplicates', () => {
    const { result } = renderHook(() => useConversations())
    let convId: string
    act(() => {
      const conv = result.current.createConversation(makeMessage('start'))
      convId = conv.id
    })
    act(() => {
      result.current.addMessage(convId, makeMessage('reply'))
    })
    const conv = result.current.conversations.find((c) => c.id === convId)!
    expect(conv.messages).toHaveLength(2)
  })

  it('addMessage called twice adds exactly two messages', () => {
    const { result } = renderHook(() => useConversations())
    let convId: string
    act(() => {
      const conv = result.current.createConversation(makeMessage('start'))
      convId = conv.id
    })
    act(() => {
      result.current.addMessage(convId, makeMessage('a'))
      result.current.addMessage(convId, makeMessage('b'))
    })
    const conv = result.current.conversations.find((c) => c.id === convId)!
    // 1 initial + 2 added = 3
    expect(conv.messages).toHaveLength(3)
  })

  it('persists to localStorage', () => {
    const { result } = renderHook(() => useConversations())
    act(() => {
      result.current.createConversation(makeMessage('persisted'))
    })
    const stored = JSON.parse(localStorage.getItem('pixelart-conversations')!)
    expect(stored).toHaveLength(1)
    expect(stored[0].messages[0].text).toBe('persisted')
  })

  it('deleteConversation removes the conversation', () => {
    const { result } = renderHook(() => useConversations())
    let convId: string
    act(() => {
      const conv = result.current.createConversation(makeMessage())
      convId = conv.id
    })
    act(() => {
      result.current.deleteConversation(convId)
    })
    expect(result.current.conversations).toHaveLength(0)
    expect(result.current.activeId).toBeNull()
  })
})
