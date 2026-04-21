import { GoogleGenAI } from '@google/genai'
import type { NextRequest } from 'next/server'

export async function GET(request: NextRequest) {
  const apiKey = request.nextUrl.searchParams.get('apiKey')
  if (!apiKey) return Response.json({ error: 'API 키를 입력해주세요.' }, { status: 400 })

  try {
    const ai = new GoogleGenAI({ apiKey })
    const models: { name: string; displayName: string }[] = []

    for await (const model of await ai.models.list()) {
      const name = model.name ?? ''
      // 이미지 생성 가능 모델만 필터링
      // 레퍼런스 이미지를 지원하는 Gemini 멀티모달 이미지 생성 모델만 포함
      const isImageModel =
        name.startsWith('models/gemini') && (
          name.includes('image-generation') ||
          name.includes('image-preview') ||
          name.includes('flash-image') ||
          name.includes('pro-image')
        )
      if (isImageModel) {
        // SDK가 generateContent 호출 시 'models/' prefix를 자동 추가하므로 제거
        const modelId = name.replace(/^models\//, '')
        models.push({ name: modelId, displayName: model.displayName ?? modelId })
      }
    }

    return Response.json({ models })
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err)
    return Response.json({ error: msg }, { status: 500 })
  }
}
