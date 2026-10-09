import { useAppNav } from '../App'
import { t, type AppLanguage } from '../lib/i18n'
import LanguageSwitcher from '../components/LanguageSwitcher'

export default function RoleSelection({ lang = 'en' }: { lang?: AppLanguage }) {
  const { navigate, lang: globalLang, setLang } = useAppNav()
  const activeLang = globalLang || lang

  return (
    <div className="min-h-full bg-stone-50 flex flex-col">
      <div className="bg-white border-b border-stone-200">
        <div className="max-w-5xl mx-auto px-4 h-16 flex items-center justify-between">
          <button onClick={() => navigate('landing')} className="flex items-center gap-2 text-emerald-900 hover:text-emerald-700 transition-colors">
            <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="m15 18-6-6 6-6" /></svg>
            <span style={{ fontFamily: "'DM Serif Display', serif" }} className="text-2xl">AgriSense</span>
          </button>
          <LanguageSwitcher lang={activeLang} setLang={setLang} compact />
        </div>
      </div>

      <div className="flex-1 flex flex-col items-center justify-center px-4 py-12">
        <div className="text-center mb-10">
          <h1 style={{ fontFamily: "'DM Serif Display', serif" }} className="text-3xl md:text-4xl text-emerald-950 mb-3">{t('roleQuestion', activeLang)}</h1>
          <p className="text-stone-600 text-base">{t('roleSubtitle', activeLang)}</p>
        </div>

        <div className="grid md:grid-cols-2 gap-6 w-full max-w-3xl">
          <div className="bg-white border-2 border-stone-200 hover:border-emerald-600 rounded-2xl p-8 transition-all hover:shadow-lg flex flex-col justify-between">
            <div>
              <div className="w-14 h-14 bg-emerald-100/80 rounded-2xl flex items-center justify-center mb-5">
                <FarmerIcon className="w-7 h-7 text-emerald-800" />
              </div>
              <h2 className="text-xl font-bold text-stone-900 mb-2">{t('roleFarmerTitle', activeLang)}</h2>
              <p className="text-stone-600 text-sm leading-relaxed mb-6">
                {t('roleFarmerDesc', activeLang)}
              </p>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <button onClick={() => navigate('login-farmer')}
                className="border border-emerald-700 text-emerald-800 hover:bg-emerald-50 font-semibold py-3 rounded-xl transition-colors text-sm">
                {t('roleLoginBtn', activeLang)}
              </button>
              <button onClick={() => navigate('signup-farmer')}
                className="bg-emerald-800 hover:bg-emerald-900 text-white font-semibold py-3 rounded-xl transition-colors text-sm shadow-xs">
                {t('roleSignUpBtn', activeLang)}
              </button>
            </div>
          </div>

          <div className="bg-white border-2 border-stone-200 hover:border-slate-700 rounded-2xl p-8 transition-all hover:shadow-lg flex flex-col justify-between">
            <div>
              <div className="w-14 h-14 bg-slate-100 rounded-2xl flex items-center justify-center mb-5">
                <OfficerIcon className="w-7 h-7 text-slate-800" />
              </div>
              <h2 className="text-xl font-bold text-stone-900 mb-2">{t('roleOfficerTitle', activeLang)}</h2>
              <p className="text-stone-600 text-sm leading-relaxed mb-6">
                {t('roleOfficerDesc', activeLang)}
              </p>
            </div>
            <button onClick={() => navigate('login-officer')}
              className="w-full bg-slate-800 hover:bg-slate-900 text-white font-semibold py-3 rounded-xl transition-colors text-sm shadow-xs">
              {t('roleOfficerLoginBtn', activeLang)}
            </button>
          </div>
        </div>

        <p className="mt-8 text-xs text-stone-500 text-center max-w-sm">
          {t('roleProtectionNote', activeLang)}
        </p>
      </div>
    </div>
  )
}

function FarmerIcon({ className }: { className?: string }) {
  return <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 2a5 5 0 1 0 5 5c0-.3 0-.6-.05-.88" /><path d="M20 21a8 8 0 1 0-16 0" /><path d="m15 8 2 2 4-4" />
  </svg>
}

function OfficerIcon({ className }: { className?: string }) {
  return <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="2" y="3" width="20" height="14" rx="2" /><path d="M8 21h8" /><path d="M12 17v4" /><path d="M7 8h4" /><path d="M7 12h8" /><path d="M13 8h2" />
  </svg>
}
