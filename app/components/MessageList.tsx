'use client'

import { useRef, useEffect, useState } from 'react'
import type { Message, ReferenceImage } from '../types'

interface Props {
  messages: Message[]
  onContinueGeneration: (image: string) => void
}

function GeneratedImage({ src, onContinue }: { src: string; onContinue: () => void }) {
  const [menuOpen, setMenuOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  return (
    <div className="relative inline-block">
      <img
        src={src}
        alt="Generated pixel art"
        className="max-w-xs rounded-lg"
        style={{ imageRendering: 'pixelated', border: '1px solid var(--border-subtle)', background: 'var(--bg-element)' }}
      />
      <div className="absolute top-1 right-1" ref={menuRef}>
        <button
          onClick={() => setMenuOpen((o) => !o)}
          className="w-7 h-7 flex items-center justify-center rounded text-sm"
          style={{ background: 'rgba(0,0,0,0.5)', color: '#fff' }}
        >
          ⋮
        </button>
        {menuOpen && (
          <div
            className="absolute right-0 mt-1 rounded-lg shadow-xl overflow-hidden z-20 whitespace-nowrap"
            style={{ background: 'var(--bg-element)', border: '1px solid var(--border-subtle)' }}
          >
            <button
              onClick={() => { onContinue(); setMenuOpen(false) }}
              className="block w-full px-4 py-2 text-sm text-left"
              style={{ color: 'var(--text-primary)' }}
              onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--bg-hover)')}
              onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
            >
              이어서 생성하기
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

export default function MessageList({ messages, onContinueGeneration }: Props) {
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  return (
    <div className="flex-1 overflow-y-auto px-4 py-6 space-y-6">
      {messages.map((msg) => (
        <div key={msg.id} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
          {msg.role === 'user' ? (
            <div className="max-w-lg">
              {msg.referenceImages && msg.referenceImages.length > 0 && (
                <div className="flex flex-wrap gap-2 justify-end mb-2">
                  {msg.referenceImages.map((img: ReferenceImage) => (
                    <img
                      key={img.id}
                      src={img.dataUrl}
                      alt="reference"
                      className="w-16 h-16 object-cover rounded"
                      style={{ border: '1px solid var(--border-subtle)' }}
                    />
                  ))}
                </div>
              )}
              {msg.text && (
                <div
                  className="rounded-2xl rounded-tr-sm px-4 py-3 text-sm whitespace-pre-wrap"
                  style={{ background: 'var(--bubble-user)', color: 'var(--text-primary)' }}
                >
                  {msg.text}
                </div>
              )}
            </div>
          ) : (
            <div className="max-w-2xl space-y-3">
              {msg.errorMessage ? (
                <div
                  className="text-sm rounded-lg px-4 py-3"
                  style={{
                    background: 'var(--bubble-error-bg)',
                    border: '1px solid var(--bubble-error-border)',
                    color: 'var(--bubble-error-text)',
                  }}
                >
                  {msg.errorMessage}
                </div>
              ) : msg.generatedImages && msg.generatedImages.length > 0 ? (
                <div className="flex flex-wrap gap-3">
                  {msg.generatedImages.map((src, i) => (
                    <GeneratedImage
                      key={i}
                      src={src}
                      onContinue={() => onContinueGeneration(src)}
                    />
                  ))}
                </div>
              ) : (
                <div className="text-sm italic" style={{ color: 'var(--text-secondary)' }}>
                  생성된 이미지가 없습니다.
                </div>
              )}
            </div>
          )}
        </div>
      ))}
      <div ref={bottomRef} />
    </div>
  )
}
