import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

/**
 * isInFlight ref 패턴이 중복 fetch를 막는지 검증하는 단위 테스트.
 * PixelArtMaker의 handleSend 핵심 로직만 추출해 테스트한다.
 */

function makeSendGuard() {
  let isInFlight = false
  let callCount = 0

  async function handleSend(fetch: () => Promise<void>) {
    if (isInFlight) return     // 중복 차단
    isInFlight = true
    callCount++
    try {
      await fetch()
    } finally {
      isInFlight = false
    }
  }

  return { handleSend, getCallCount: () => callCount }
}

describe('API call guard (isInFlight ref pattern)', () => {
  it('단일 호출 시 fetch가 정확히 1번 실행된다', async () => {
    const { handleSend, getCallCount } = makeSendGuard()
    const fetch = vi.fn().mockResolvedValue(undefined)
    await handleSend(fetch)
    expect(getCallCount()).toBe(1)
    expect(fetch).toHaveBeenCalledTimes(1)
  })

  it('동시 중복 호출 시 fetch는 1번만 실행된다', async () => {
    const { handleSend, getCallCount } = makeSendGuard()
    let resolve!: () => void
    const slowFetch = vi.fn(() => new Promise<void>((r) => { resolve = r }))

    // 첫 번째 호출 (완료 전)
    const first = handleSend(slowFetch)
    // 두 번째 호출 (isInFlight=true이므로 즉시 반환)
    await handleSend(slowFetch)
    resolve()
    await first

    expect(getCallCount()).toBe(1)
    expect(slowFetch).toHaveBeenCalledTimes(1)
  })

  it('첫 번째 완료 후 두 번째 호출은 정상 실행된다', async () => {
    const { handleSend, getCallCount } = makeSendGuard()
    const fetch = vi.fn().mockResolvedValue(undefined)

    await handleSend(fetch)
    await handleSend(fetch)

    expect(getCallCount()).toBe(2)
    expect(fetch).toHaveBeenCalledTimes(2)
  })

  it('fetch 중 에러가 나도 isInFlight가 해제되어 다음 호출이 가능하다', async () => {
    const { handleSend, getCallCount } = makeSendGuard()
    const failFetch = vi.fn().mockRejectedValue(new Error('network error'))
    const okFetch = vi.fn().mockResolvedValue(undefined)

    await handleSend(failFetch).catch(() => {})
    await handleSend(okFetch)

    expect(getCallCount()).toBe(2)
  })
})
