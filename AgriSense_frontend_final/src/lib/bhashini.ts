import { API_BASE_URL } from './agrisense'

export type BhashiniLanguage = 'en' | 'hi' | 'gu' | 'mr' | 'pa' | 'ta' | 'te'

export type BhashiniSpeechResponse = {
  status: string
  source_language: BhashiniLanguage
  target_language: BhashiniLanguage
  translated_text: string
  audio_base64: string | null
}

/**
 * Calls the AgriSense backend Bhashini endpoint.
 * The Bhashini API key stays on the backend; the browser only receives
 * translated text and base64-encoded audio.
 */
export async function speakWithBhashini(
  text: string,
  targetLanguage: BhashiniLanguage,
  sourceLanguage: BhashiniLanguage = 'en',
  gender: 'male' | 'female' = 'female',
): Promise<BhashiniSpeechResponse> {
  if (!text.trim()) {
    throw new Error('Text cannot be empty.')
  }

  const form = new FormData()
  form.append('text', text)
  form.append('source_language', sourceLanguage)
  form.append('target_language', targetLanguage)
  form.append('gender', gender)

  const response = await fetch(`${API_BASE_URL}/bhashini/speak`, {
    method: 'POST',
    body: form,
  })

  let body: any = null
  try {
    body = await response.json()
  } catch {
    // Keep the HTTP error below if the backend did not return JSON.
  }

  if (!response.ok) {
    throw new Error(body?.detail || `Bhashini speech request failed (${response.status})`)
  }

  if (!body?.audio_base64) {
    throw new Error('Bhashini returned no audio.')
  }

  return body as BhashiniSpeechResponse
}

/** Convert Bhashini's base64 WAV payload into a browser-playable Blob URL. */

export async function translateWithBhashini(
  text: string,
  targetLanguage: BhashiniLanguage,
  sourceLanguage: BhashiniLanguage = 'en',
): Promise<string> {
  if (!text.trim()) throw new Error('Text cannot be empty.')
  if (sourceLanguage === targetLanguage) return text

  const form = new FormData()
  form.append('text', text)
  form.append('source_language', sourceLanguage)
  form.append('target_language', targetLanguage)

  const response = await fetch(`${API_BASE_URL}/bhashini/translate`, {
    method: 'POST',
    body: form,
  })
  let body: any = null
  try { body = await response.json() } catch {}
  if (!response.ok) {
    throw new Error(body?.detail || `Bhashini translation failed (${response.status})`)
  }
  if (!body?.translated_text) throw new Error('Bhashini returned no translated text.')
  return body.translated_text as string
}

export function audioUrlFromBase64(audioBase64: string, mimeType = 'audio/wav'): string {
  const cleanBase64 = audioBase64.includes(',')
    ? audioBase64.split(',').pop() || ''
    : audioBase64

  const binary = window.atob(cleanBase64)
  const bytes = new Uint8Array(binary.length)

  for (let i = 0; i < binary.length; i += 1) {
    bytes[i] = binary.charCodeAt(i)
  }

  return URL.createObjectURL(new Blob([bytes], { type: mimeType }))
}
