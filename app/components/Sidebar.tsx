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
    <aside className="w-64 shrink-0 flex flex-col h-full bg-[#1a1a1a] border-r border-[#333]">
      <ApiKeyInput onSave={onApiKeyChange} />
      <div className="p-3 border-b border-[#333]">
        <button
          onClick={onNew}
          className="w-full px-3 py-2 text-sm rounded-lg bg-[#2a2a2a] hover:bg-[#333] text-white text-left transition-colors"
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
            className={`w-full text-left px-3 py-2 rounded-lg text-sm mb-1 truncate transition-colors ${
              c.id === activeId
                ? 'bg-[#333] text-white'
                : 'text-[#aaa] hover:bg-[#252525] hover:text-white'
            }`}
          >
            {c.title}
          </button>
        ))}
      </nav>

      {contextMenu && (
        <div
          ref={menuRef}
          style={{ top: contextMenu.y, left: contextMenu.x }}
          className="fixed z-50 bg-[#2a2a2a] border border-[#444] rounded-lg shadow-xl overflow-hidden"
        >
          <button
            onClick={() => {
              onDelete(contextMenu.id)
              setContextMenu(null)
            }}
            className="block w-full px-4 py-2 text-sm text-red-400 hover:bg-[#333] text-left"
          >
            삭제
          </button>
        </div>
      )}
    </aside>
  )
}
