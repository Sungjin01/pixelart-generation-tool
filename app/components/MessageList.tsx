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
        className="max-w-xs rounded-lg border border-[#444] bg-[#111]"
        style={{ imageRendering: 'pixelated' }}
      />
      <div className="absolute top-1 right-1" ref={menuRef}>
        <button
          onClick={() => setMenuOpen((o) => !o)}
          className="w-7 h-7 flex items-center justify-center rounded bg-black/60 hover:bg-black/80 text-white text-sm"
        >
          ⋮
        </button>
        {menuOpen && (
          <div className="absolute right-0 mt-1 bg-[#2a2a2a] border border-[#444] rounded-lg shadow-xl overflow-hidden z-20 whitespace-nowrap">
            <button
              onClick={() => {
                onContinue()
                setMenuOpen(false)
              }}
              className="block w-full px-4 py-2 text-sm text-white hover:bg-[#333] text-left"
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
                      className="w-16 h-16 object-cover rounded border border-[#555]"
                    />
                  ))}
                </div>
              )}
              {msg.text && (
                <div className="bg-[#2a2a2a] text-white rounded-2xl rounded-tr-sm px-4 py-3 text-sm whitespace-pre-wrap">
                  {msg.text}
                </div>
              )}
            </div>
          ) : (
            <div className="max-w-2xl space-y-3">
              {msg.generatedImages && msg.generatedImages.length > 0 ? (
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
                <div className="text-[#aaa] text-sm italic">생성된 이미지가 없습니다.</div>
              )}
            </div>
          )}
        </div>
      ))}
      <div ref={bottomRef} />
    </div>
  )
}
