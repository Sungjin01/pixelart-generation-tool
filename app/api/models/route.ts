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
      const isImageModel =
        name.includes('imagen') ||
        name.includes('image-generation') ||
        name.includes('image-preview') ||
        name.includes('flash-exp') ||
        (model.supportedActions ?? []).some((a: string) =>
          a.includes('generateImages') || a.includes('generateContent')
        )
      if (isImageModel) {
        models.push({ name, displayName: model.displayName ?? name })
      }
    }

    return Response.json({ models })
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err)
    return Response.json({ error: msg }, { status: 500 })
  }
}
