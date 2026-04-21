import '@testing-library/jest-dom'

// localStorage mock
const store: Record<string, string> = {}
Object.defineProperty(globalThis, 'localStorage', {
  value: {
    getItem: (k: string) => store[k] ?? null,
    setItem: (k: string, v: string) => { store[k] = v },
    removeItem: (k: string) => { delete store[k] },
    clear: () => { for (const k in store) delete store[k] },
  },
  writable: true,
})

// crypto.randomUUID mock
Object.defineProperty(globalThis, 'crypto', {
  value: { randomUUID: () => Math.random().toString(36).slice(2) },
  writable: true,
})
