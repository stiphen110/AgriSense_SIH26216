import { useState, useEffect, useCallback } from 'react'
import type { AppLanguage } from './i18n'

const LANG_MAP: Record<AppLanguage, string> = {
  en: 'en-US',
  hi: 'hi-IN',
  gu: 'gu-IN',
}

export function useAudioAdvisory(lang: AppLanguage = 'en') {
  const [isPlaying, setIsPlaying] = useState<boolean>(false)
  const [currentText, setCurrentText] = useState<string | null>(null)

  const stop = useCallback(() => {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.cancel()
    }
    setIsPlaying(false)
    setCurrentText(null)
  }, [])

  const speak = useCallback(
    (textToSpeak: string) => {
      if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
        console.warn('Web Speech API (speechSynthesis) is not supported in this browser.')
        return
      }

      // If currently playing the same text, toggle stop
      if (isPlaying && currentText === textToSpeak) {
        stop()
        return
      }

      // Stop any existing speech
      window.speechSynthesis.cancel()

      const targetLang = LANG_MAP[lang] || 'en-US'
      const utterance = new SpeechSynthesisUtterance(textToSpeak)
      utterance.lang = targetLang
      utterance.rate = 0.9 // Slightly calmer rate for clear agricultural advisory reading

      // Try finding a matching native voice for hi-IN / gu-IN / en-US
      const voices = window.speechSynthesis.getVoices()
      if (voices.length > 0) {
        const matchingVoice = voices.find(
          (v) => v.lang === targetLang || v.lang.startsWith(lang)
        )
        if (matchingVoice) {
          utterance.voice = matchingVoice
        }
      }

      utterance.onstart = () => {
        setIsPlaying(true)
        setCurrentText(textToSpeak)
      }

      utterance.onend = () => {
        setIsPlaying(false)
        setCurrentText(null)
      }

      utterance.onerror = (e) => {
        console.error('SpeechSynthesis error:', e)
        setIsPlaying(false)
        setCurrentText(null)
      }

      window.speechSynthesis.speak(utterance)
    },
    [lang, isPlaying, currentText, stop]
  )

  useEffect(() => {
    return () => {
      if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
        window.speechSynthesis.cancel()
      }
    }
  }, [])

  return {
    speak,
    stop,
    isPlaying,
    currentText,
  }
}
