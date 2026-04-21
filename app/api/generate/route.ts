import { GoogleGenerativeAI } from '@google/generative-ai'
import { readFileSync } from 'fs'
import { join } from 'path'
import type { NextRequest } from 'next/server'

export async function POST(request: NextRequest) {
  const { prompt, gridSize, referenceImages, apiKey } = await request.json()

  if (!apiKey) {
    return Response.json({ error: 'API 키를 입력해주세요.' }, { status: 400 })
  }

  const gridImagePath = join(process.cwd(), 'public', 'grids', `${gridSize}.png`)
  const gridImageData = readFileSync(gridImagePath)
  const gridImageBase64 = gridImageData.toString('base64')

  const genAI = new GoogleGenerativeAI(apiKey)
  const model = genAI.getGenerativeModel({ model: 'gemini-3.1-flash-image-preview' })

  const imageParts: { inlineData: { data: string; mimeType: string } }[] = [
    { inlineData: { data: gridImageBase64, mimeType: 'image/png' } },
  ]

  if (referenceImages && referenceImages.length > 0) {
    for (const img of referenceImages) {
      const base64 = img.dataUrl.replace(/^data:[^;]+;base64,/, '')
      imageParts.push({ inlineData: { data: base64, mimeType: img.mimeType } })
    }
  }

  const textPrompt = prompt
    ? `${prompt}\n\n주어진 레퍼런스 이미지의 화풍을 참고하여, 주어진 그리드 이미지에 정확히 맞도록 픽셀아트를 그려줘. 그리드의 각 칸이 하나의 픽셀이 되도록 그려야 해.`
    : '주어진 레퍼런스 이미지의 화풍을 참고하여, 주어진 그리드 이미지에 정확히 맞도록 픽셀아트를 그려줘. 그리드의 각 칸이 하나의 픽셀이 되도록 그려야 해.'

  let result
  try {
    result = await model.generateContent([...imageParts, textPrompt])
  } catch (err: unknown) {
    const e = err as { status?: number; statusText?: string; errorDetails?: { retryDelay?: string }[] }
    if (e?.status === 429) {
      const retryDelay = e.errorDetails?.find((d) => d.retryDelay)?.retryDelay
      const msg = retryDelay
        ? `요청이 너무 많습니다. ${retryDelay} 후 다시 시도해주세요.`
        : '요청이 너무 많습니다. 잠시 후 다시 시도해주세요.'
      return Response.json({ error: msg }, { status: 429 })
    }
    if (e?.status === 400) {
      return Response.json({ error: 'API 키가 올바르지 않습니다.' }, { status: 400 })
    }
    if (e?.status === 403) {
      return Response.json({ error: 'API 키 권한이 없습니다.' }, { status: 403 })
    }
    return Response.json({ error: '이미지 생성 중 오류가 발생했습니다.' }, { status: 500 })
  }

  const response = result.response

  const generatedImages: string[] = []
  for (const candidate of response.candidates ?? []) {
    for (const part of candidate.content.parts) {
      if (part.inlineData) {
        generatedImages.push(`data:${part.inlineData.mimeType};base64,${part.inlineData.data}`)
      }
    }
  }

  return Response.json({ images: generatedImages })
}