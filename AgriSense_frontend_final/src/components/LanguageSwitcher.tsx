import type { AppLanguage } from '../lib/i18n'

export default function LanguageSwitcher({ lang, setLang, compact = false }: { lang: AppLanguage; setLang: (lang: AppLanguage) => void; compact?: boolean }) {
  const options: { value: AppLanguage; label: string }[] = [
    { value: 'en', label: 'EN' },
    { value: 'hi', label: 'हिंदी' },
    { value: 'gu', label: 'ગુજરાતી' },
  ]
  return (
    <select
      aria-label="Language"
      value={lang}
      onChange={(e) => setLang(e.target.value as AppLanguage)}
      className={compact
        ? 'text-xs font-semibold border border-stone-200 rounded-lg px-2 py-1.5 bg-white text-stone-700 focus:outline-none focus:ring-1 focus:ring-emerald-600'
        : 'text-xs font-semibold border border-blue-200 rounded px-2 py-1 bg-white text-blue-900 focus:outline-none focus:ring-1 focus:ring-blue-500'}
    >
      {options.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
    </select>
  )
}
