'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import type { Conversation } from '../types'
import ApiKeyInput from './ApiKeyInput'

interface Props {
  conversations: Conversation[]
  activeId: string | null
  onSelect: (id: string) => void
  onDelete: (id: string) => void
  onNew: () => void
  onApiKeyChange: (key: string) => void
}

export default function Sidebar({ conversations, activeId, onSelect, onDelete, onNew, onApiKeyChange }: Props) {
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number; id: string } | null>(null)
  const menuRef = useRef<HTMLDivElement>(null)

  const handleContextMenu = useCallback((e: React.MouseEvent, id: string) => {
    e.preventDefault()
    setContextMenu({ x: e.clientX, y: e.clientY, id })
  }, [])

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setContextMenu(null)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  return (
    <aside
      className="w-64 shrink-0 flex flex-col h-full"
      style={{ background: 'var(--bg-sidebar)' }}
    >
      <ApiKeyInput onSave={onApiKeyChange} />
      <div className="p-3" style={{ borderBottom: '1px solid var(--border)' }}>
        <button
          onClick={onNew}
          className="w-full px-3 py-2 text-sm rounded-lg text-left transition-colors"
          style={{ background: 'var(--bg-element)', color: 'var(--text-primary)' }}
          onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--bg-hover)')}
          onMouseLeave={(e) => (e.currentTarget.style.background = 'var(--bg-element)')}
        >
          + 새 대화
        </button>
      </div>
      <nav className="flex-1 overflow-y-auto p-2">
        {conversations.map((c) => (
          <button
            key={c.id}
            onClick={() => onSelect(c.id)}
            onContextMenu={(e) => handleContextMenu(e, c.id)}
            className="w-full text-left px-3 py-2 rounded-lg text-sm mb-1 truncate transition-colors"
            style={
              c.id === activeId
                ? { background: 'var(--bg-hover)', color: 'var(--text-primary)' }
                : { background: 'transparent', color: 'var(--text-secondary)' }
            }
            onMouseEnter={(e) => {
              if (c.id !== activeId) {
                e.currentTarget.style.background = 'var(--bg-element)'
                e.currentTarget.style.color = 'var(--text-primary)'
              }
            }}
            onMouseLeave={(e) => {
              if (c.id !== activeId) {
                e.currentTarget.style.background = 'transparent'
                e.currentTarget.style.color = 'var(--text-secondary)'
              }
            }}
          >
            {c.title}
          </button>
        ))}
      </nav>

      {contextMenu && (
        <div
          ref={menuRef}
          style={{ top: contextMenu.y, left: contextMenu.x, background: 'var(--bg-element)', border: '1px solid var(--border-subtle)' }}
          className="fixed z-50 rounded-lg shadow-xl overflow-hidden"
        >
          <button
            onClick={() => {
              onDelete(contextMenu.id)
              setContextMenu(null)
            }}
            className="block w-full px-4 py-2 text-sm text-left text-red-500"
            style={{ color: 'rgb(239 68 68)' }}
            onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--bg-hover)')}
            onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
          >
            삭제
          </button>
        </div>
      )}
    </aside>
  )
}
