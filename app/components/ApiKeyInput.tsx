'use client'

import { useState } from 'react'

const KEY_STORAGE = 'gemini-api-key'

export function getApiKey(): string {
  try { return localStorage.getItem(KEY_STORAGE) ?? '' } catch { return '' }
}

interface Props {
  onSave: (key: string) => void
}

export default function ApiKeyInput({ onSave }: Props) {
  const [key, setKey] = useState(() => { try { return localStorage.getItem(KEY_STORAGE) ?? '' } catch { return '' } })
  const [visible, setVisible] = useState(false)
  const [saved, setSaved] = useState(true)

  function handleSave() {
    try { localStorage.setItem(KEY_STORAGE, key) } catch { /* ignore */ }
    onSave(key)
    setSaved(true)
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Enter') handleSave()
  }

  return (
    <div className="p-3" style={{ borderBottom: '1px solid var(--border)' }}>
      <p className="text-xs mb-1.5" style={{ color: 'var(--text-muted)' }}>Gemini API Key</p>
      <div className="flex gap-1">
        <div className="relative flex-1">
          <input
            type={visible ? 'text' : 'password'}
            value={key}
            onChange={(e) => { setKey(e.target.value); setSaved(false) }}
            onKeyDown={handleKeyDown}
            placeholder="AIza..."
            className="w-full rounded-lg px-2 py-1.5 text-xs outline-none pr-7"
            style={{
              background: 'var(--bg-element)',
              border: '1px solid var(--border-subtle)',
              color: 'var(--text-primary)',
            }}
          />
          <button
            onClick={() => setVisible((v) => !v)}
            className="absolute right-1.5 top-1/2 -translate-y-1/2 text-xs"
            style={{ color: 'var(--text-muted)' }}
            tabIndex={-1}
          >
            {visible ? '🙈' : '👁'}
          </button>
        </div>
        <button
          onClick={handleSave}
          disabled={saved}
          className="px-2.5 py-1.5 text-xs rounded-lg transition-colors shrink-0 disabled:opacity-40 disabled:cursor-default"
          style={{ background: 'var(--bg-hover)', color: 'var(--text-primary)' }}
        >
          저장
        </button>
      </div>
    </div>
  )
}
