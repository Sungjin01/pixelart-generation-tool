import { GoogleGenAI, ApiError } from '@google/genai'
import { readFileSync } from 'fs'
import { join } from 'path'
import type { NextRequest } from 'next/server'

const IMAGEN_MODELS = new Set([
  'imagen-3.0-generate-002',
  'imagen-4.0-generate-001',
])

function resolveStatus(err: unknown): number | undefined {
  if (err instanceof ApiError) return err.status
  if (err && typeof err === 'object') {
    const e = err as Record<string, unknown>
    // APIError 계열 (RateLimitError 등) 및 기타 HTTP 에러
    if (typeof e.status === 'number') return e.status
    if (typeof e.statusCode === 'number') return e.statusCode
    // 메시지에서 상태 코드 파싱 (마지막 수단)
    if (typeof e.message === 'string') {
      const m = e.message.match(/\b(400|401|403|404|429|500)\b/)
      if (m) return Number(m[1])
    }
  }
  return undefined
}

function errorResponse(err: unknown) {
  const status = resolveStatus(err)
  const message = err instanceof Error ? err.message : String(err)

  if (status === 429) {
    const details = (err as Record<string, unknown>)?.errorDetails as { retryDelay?: string }[] | undefined
    const delay = details?.find((d) => d.retryDelay)?.retryDelay
    return Response.json(
      { error: delay ? `요청이 너무 많습니다. ${delay} 후 다시 시도해주세요.` : '요청이 너무 많습니다. 잠시 후 다시 시도해주세요.' },
      { status: 429 },
    )
  }
  if (status === 401) return Response.json({ error: 'API 키가 올바르지 않습니다.' }, { status: 401 })
  if (status === 403) return Response.json({ error: `이 모델은 현재 플랜에서 사용할 수 없습니다. (${message})` }, { status: 403 })
  if (status === 404) return Response.json({ error: `모델을 찾을 수 없습니다. 모델명을 확인해주세요. (${message})` }, { status: 404 })
  if (status === 400) return Response.json({ error: `잘못된 요청입니다: ${message}` }, { status: 400 })
  return Response.json({ error: `오류가 발생했습니다 [${status ?? '?'}]: ${message}` }, { status: 500 })
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

  const model = modelName || 'gemini-2.0-flash-preview-image-generation'

  let gridImageBase64: string
  try {
    const gridImagePath = join(process.cwd(), 'public', 'grids', `${gridSize}.png`)
    gridImageBase64 = readFileSync(gridImagePath).toString('base64')
  } catch {
    return Response.json({ error: `그리드 이미지를 읽을 수 없습니다: ${gridSize}.png` }, { status: 500 })
  }

  const ai = new GoogleGenAI({ apiKey })

  // Imagen 모델 (generateImages API, 레퍼런스 이미지 미지원)
  if (IMAGEN_MODELS.has(model)) {
    const textPrompt = prompt
      ? `${prompt}. 주어진 그리드에 맞는 ${gridSize}x${gridSize} 픽셀아트 스타일로, 정사각형 픽셀이 선명하게 보이도록 그려줘. 배경은 투명하게.`
      : `${gridSize}x${gridSize} 픽셀아트. 정사각형 픽셀이 선명하게 보이도록, 배경은 투명하게.`

    try {
      const res = await ai.models.generateImages({
        model,
        prompt: textPrompt,
        config: { numberOfImages: 1, aspectRatio: '1:1' },
      })
      const images = (res.generatedImages ?? [])
        .filter((g) => g.image?.imageBytes)
        .map((g) => `data:${g.image!.mimeType ?? 'image/png'};base64,${g.image!.imageBytes}`)
      return Response.json({ images })
    } catch (err) {
      return errorResponse(err)
    }
  }

  // Gemini 모델 (generateContent, 레퍼런스 이미지 지원)
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
