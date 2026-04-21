import { GoogleGenerativeAI } from '@google/generative-ai'
import { readFileSync } from 'fs'
import { join } from 'path'
import type { NextRequest } from 'next/server'

export async function POST(request: NextRequest) {
  const { prompt, gridSize, referenceImages } = await request.json()

  const apiKey = process.env.GEMINI_API_KEY
  if (!apiKey) {
    return Response.json({ error: 'GEMINI_API_KEY not set' }, { status: 500 })
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

  const result = await model.generateContent([...imageParts, textPrompt])
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