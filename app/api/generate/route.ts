import { GoogleGenAI, ApiError } from '@google/genai'
import { readFileSync } from 'fs'
import { join } from 'path'
import type { NextRequest } from 'next/server'

function resolveStatus(err: unknown): number | undefined {
  if (err instanceof ApiError) return err.status
  if (err && typeof err === 'object') {
    const e = err as Record<string, unknown>
    if (typeof e.status === 'number') return e.status
    if (typeof e.statusCode === 'number') return e.statusCode
    // JSON 응답 바디가 message에 포함된 경우 파싱 (정규식은 오탐 위험)
    if (typeof e.message === 'string') {
      try {
        const parsed = JSON.parse(e.message)
        const code = parsed?.error?.code ?? parsed?.code
        if (typeof code === 'number') return code
      } catch { /* not JSON */ }
    }
  }
  return undefined
}

function errorResponse(err: unknown) {
  const status = resolveStatus(err)
  const message = err instanceof Error ? err.message : String(err)

  // 디버깅: 서버 로그에 실제 에러 구조 출력
  console.error('[generate] error status:', status)
  console.error('[generate] error message:', message)
  console.error('[generate] error keys:', err && typeof err === 'object' ? Object.keys(err) : typeof err)

  if (status === 429) {
    const details = (err as Record<string, unknown>)?.errorDetails as { retryDelay?: string }[] | undefined
    const delay = details?.find((d) => d.retryDelay)?.retryDelay
    const hint = delay ? ` (${delay} 후 재시도)` : ''
    return Response.json(
      { error: `요청 할당량 초과 (429)${hint}. API 키가 유효한지, 할당량이 남아있는지 확인해주세요.\n원문: ${message}` },
      { status: 429 },
    )
  }
  if (status === 401) return Response.json({ error: `API 키가 올바르지 않습니다. (401)\n원문: ${message}` }, { status: 401 })
  if (status === 403) return Response.json({ error: `이 모델은 현재 플랜에서 사용할 수 없습니다. (403)\n원문: ${message}` }, { status: 403 })
  if (status === 404) return Response.json({ error: `모델을 찾을 수 없습니다. (404)\n원문: ${message}` }, { status: 404 })
  if (status === 400) return Response.json({ error: `잘못된 요청입니다. (400)\n원문: ${message}` }, { status: 400 })
  return Response.json({ error: `오류가 발생했습니다 [${status ?? '?'}]:\n${message}` }, { status: 500 })
}

export async function POST(request: NextRequest) {
  let body: Record<string, unknown>
  try {
    body = await request.json()
  } catch {
    return Response.json({ error: '잘못된 요청 형식입니다.' }, { status: 400 })
  }

  const { prompt, gridSize, referenceImages, apiKey, model: modelName } = body as {
    prompt?: string
    gridSize?: string
    referenceImages?: { dataUrl: string; mimeType: string }[]
    apiKey?: string
    model?: string
  }

  if (!apiKey) return Response.json({ error: 'API 키를 입력해주세요.' }, { status: 400 })

  const model = modelName || 'gemini-3.1-flash-image-preview'

  let gridImageBase64: string
  try {
    const gridImagePath = join(process.cwd(), 'public', 'grids', `${gridSize}.png`)
    gridImageBase64 = readFileSync(gridImagePath).toString('base64')
  } catch {
    return Response.json({ error: `그리드 이미지를 읽을 수 없습니다: ${gridSize}.png` }, { status: 500 })
  }

  const ai = new GoogleGenAI({ apiKey })

  const imageParts: { inlineData: { data: string; mimeType: string } }[] = [
    { inlineData: { data: gridImageBase64, mimeType: 'image/png' } },
  ]
  for (const img of referenceImages ?? []) {
    const base64 = img.dataUrl.replace(/^data:[^;]+;base64,/, '')
    imageParts.push({ inlineData: { data: base64, mimeType: img.mimeType } })
  }

  const textPrompt = prompt
    ? `${prompt}\n\n주어진 레퍼런스 이미지의 화풍을 참고하여, 주어진 그리드 이미지에 정확히 맞도록 픽셀아트를 그려줘. 그리드의 각 칸이 하나의 픽셀이 되도록 그려야 해.`
    : '주어진 레퍼런스 이미지의 화풍을 참고하여, 주어진 그리드 이미지에 정확히 맞도록 픽셀아트를 그려줘. 그리드의 각 칸이 하나의 픽셀이 되도록 그려야 해.'

  try {
    const response = await ai.models.generateContent({
      model,
      contents: [{ role: 'user', parts: [...imageParts, { text: textPrompt }] }],
      config: { responseModalities: ['TEXT', 'IMAGE'] },
    })

    const images: string[] = []
    for (const part of response.candidates?.[0]?.content?.parts ?? []) {
      if (part.inlineData?.data && part.inlineData?.mimeType) {
        images.push(`data:${part.inlineData.mimeType};base64,${part.inlineData.data}`)
      }
    }
    return Response.json({ images })
  } catch (err) {
    return errorResponse(err)
  }
}
