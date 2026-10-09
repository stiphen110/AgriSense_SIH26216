import { useState } from 'react'
import { useAppNav } from '../App'
import { t, AppLanguage } from '../lib/i18n'

const HERO_IMG = 'https://images.unsplash.com/photo-1774695475379-88e1351e4922?w=1400&h=700&fit=crop&auto=format'
const FIELD_IMG = 'https://images.unsplash.com/photo-1743065528943-438a6a981631?w=600&h=400&fit=crop&auto=format'

export default function Landing({ lang: parentLang, setLang: parentSetLang }: { lang?: AppLanguage; setLang?: (l: AppLanguage) => void }) {
  const { navigate } = useAppNav()
  const [localLang, setLocalLang] = useState<AppLanguage>('en')
  const lang = parentLang ?? localLang
  const setLang = parentSetLang ?? setLocalLang

  return (
    <div className="min-h-full bg-stone-50 overflow-x-hidden">
      {/* Navigation Shell */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-white/95 backdrop-blur-xs border-b border-stone-200">
        <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-emerald-800 text-white flex items-center justify-center shadow-xs">
              <LeafIcon className="w-5 h-5 text-white" />
            </div>
            <span style={{ fontFamily: "'DM Serif Display', serif" }} className="text-2xl font-normal text-emerald-950 tracking-tight">AgriSense</span>
          </div>

          <div className="flex items-center gap-3">
            {/* Global Language Selector */}
            <div className="flex items-center bg-stone-100 p-1 rounded-lg border border-stone-200/80 text-xs font-semibold">
              <button
                onClick={() => setLang('en')}
                className={`px-2.5 py-1 rounded-md transition-all ${lang === 'en' ? 'bg-white text-emerald-950 shadow-xs' : 'text-stone-600 hover:text-stone-900'}`}
              >
                EN
              </button>
              <button
                onClick={() => setLang('hi')}
                className={`px-2.5 py-1 rounded-md transition-all ${lang === 'hi' ? 'bg-white text-emerald-950 shadow-xs' : 'text-stone-600 hover:text-stone-900'}`}
              >
                हिंदी
              </button>
              <button
                onClick={() => setLang('gu')}
                className={`px-2.5 py-1 rounded-md transition-all ${lang === 'gu' ? 'bg-white text-emerald-950 shadow-xs' : 'text-stone-600 hover:text-stone-900'}`}
              >
                ગુજરાતી
              </button>
            </div>

            <button
              onClick={() => navigate('role-selection')}
              className="text-sm font-semibold text-emerald-800 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200/80 px-4 py-2 rounded-lg transition-all"
            >
              {t('btnSignIn', lang)}
            </button>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative min-h-[88vh] flex items-center pt-16">
        <div
          className="absolute inset-0 bg-emerald-950"
          style={{
            backgroundImage: `url('${HERO_IMG}')`,
            backgroundSize: 'cover',
            backgroundPosition: 'center',
          }}
        >
          <div className="absolute inset-0 bg-gradient-to-r from-emerald-950/90 via-emerald-950/75 to-emerald-950/60" />
        </div>
        <div className="relative z-10 max-w-6xl mx-auto px-4 py-20 md:py-28 grid md:grid-cols-2 gap-10 items-center">
          <div>
            <div className="inline-flex items-center gap-2 bg-emerald-900/60 border border-emerald-700/50 text-emerald-200 text-xs font-semibold px-3.5 py-1.5 rounded-full mb-6 shadow-xs">
              <span className="w-2 h-2 bg-emerald-400 rounded-full inline-block animate-pulse" />
              {t('landingBadge', lang)}
            </div>
            <h1
              style={{ fontFamily: "'DM Serif Display', serif" }}
              className="text-4xl md:text-5xl lg:text-6xl font-normal text-white leading-tight mb-6"
            >
              {t('landingTitle', lang)}
            </h1>
            <p className="text-emerald-100/90 text-lg leading-relaxed mb-8 max-w-lg font-normal">
              {t('landingSubtitle', lang)}
            </p>
            <div className="flex flex-wrap gap-3.5">
              <button
                onClick={() => navigate('role-selection')}
                className="bg-emerald-700 hover:bg-emerald-800 text-white font-semibold px-6 py-3.5 rounded-xl transition-all shadow-md focus:ring-2 focus:ring-emerald-400"
              >
                {t('btnStartCheck', lang)}
              </button>
              <button
                onClick={() => navigate('role-selection')}
                className="bg-white/10 hover:bg-white/20 border border-white/30 text-white font-semibold px-6 py-3.5 rounded-xl transition-all"
              >
                {t('btnExploreMap', lang)}
              </button>
            </div>
          </div>
          <div className="hidden md:block">
            {/* Hero Widget Floating Card */}
            <div className="bg-white/95 backdrop-blur-md border border-stone-200/90 rounded-2xl p-6 shadow-2xl shadow-emerald-950/25 text-stone-900 transform transition-all duration-300 hover:scale-[1.01]">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-9 h-9 bg-emerald-800 rounded-lg flex items-center justify-center text-white shadow-xs">
                  <ScanIcon className="w-5 h-5" />
                </div>
                <div>
                  <div className="text-emerald-950 font-bold text-sm">Health Assessment Active</div>
                  <div className="text-stone-500 text-xs">Sanand, Gujarat</div>
                </div>
                <div className="ml-auto text-xs font-semibold bg-emerald-100 text-emerald-800 px-2.5 py-1 rounded-md">87% match</div>
              </div>
              
              {/* Checkmark Checklist with SVG Icons and Animations */}
              <div className="bg-stone-50/80 border border-stone-200/80 rounded-xl p-4 space-y-2.5 mb-4">
                {[
                  { text: 'Image quality verified', status: 'check' },
                  { text: 'Crop identified: Rice', status: 'check' },
                  { text: 'Symptom analysis complete', status: 'check' },
                  { text: 'Possible Leaf Blast detected', status: 'warn' },
                ].map((s, i) => (
                  <div
                    key={i}
                    className={`flex items-center gap-2.5 text-sm scale-in ${
                      s.status === 'warn'
                        ? 'text-amber-900 font-semibold bg-amber-50 p-2.5 rounded-lg border border-amber-200/80'
                        : 'text-stone-700'
                    }`}
                    style={{ animationDelay: `${i * 0.08}s` }}
                  >
                    {s.status === 'check' ? (
                      <CheckCircleIcon className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                    ) : (
                      <AlertTriangleIcon className="w-4 h-4 text-amber-600 flex-shrink-0" />
                    )}
                    <span>{s.text}</span>
                  </div>
                ))}
              </div>

              {/* Gradient Risk Level Bar */}
              <div className="bg-emerald-50/80 border border-emerald-200/80 rounded-xl p-3.5">
                <div className="text-emerald-900 text-xs font-bold uppercase tracking-wider mb-1.5 flex justify-between items-center">
                  <span>Risk Level</span>
                  <span className="text-amber-800 font-bold text-xs bg-amber-100/90 px-2 py-0.5 rounded">High Risk</span>
                </div>
                <div className="flex items-center gap-3 mt-2">
                  <div className="h-3 flex-1 bg-stone-200/80 rounded-full overflow-hidden p-0.5 border border-stone-300/40">
                    <div className="h-full w-3/4 bg-gradient-to-r from-emerald-500 via-amber-500 to-red-500 rounded-full transition-all duration-700" />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Capabilities */}
      <section className="py-20 bg-white">
        <div className="max-w-6xl mx-auto px-4">
          <div className="text-center mb-14">
            <h2 style={{ fontFamily: "'DM Serif Display', serif" }} className="text-3xl md:text-4xl text-emerald-950 mb-3">
              {t('capabilitiesTitle', lang)}
            </h2>
            <p className="text-stone-600 max-w-xl mx-auto text-base">
              {t('capabilitiesSubtitle', lang)}
            </p>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {[
              {
                icon: <ScanIcon className="w-6 h-6" />, title: t('feature1Title', lang),
                desc: t('feature1Desc', lang),
                color: 'emerald',
              },
              {
                icon: <ChartIcon className="w-6 h-6" />, title: t('feature2Title', lang),
                desc: t('feature2Desc', lang),
                color: 'amber',
              },
              {
                icon: <BookIcon className="w-6 h-6" />, title: t('feature3Title', lang),
                desc: t('feature3Desc', lang),
                color: 'teal',
              },
              {
                icon: <MapIcon className="w-6 h-6" />, title: t('feature4Title', lang),
                desc: t('feature4Desc', lang),
                color: 'stone',
              },
            ].map((c, i) => (
              <div key={i} className="bg-stone-50/60 border border-stone-200/90 rounded-2xl p-6 hover:shadow-md transition-all hover:bg-white">
                <div className={`w-12 h-12 rounded-xl flex items-center justify-center mb-4 ${
                  c.color === 'emerald' ? 'bg-emerald-100 text-emerald-800' :
                  c.color === 'amber' ? 'bg-amber-100 text-amber-800' :
                  c.color === 'teal' ? 'bg-teal-100 text-teal-800' :
                  'bg-stone-200 text-stone-800'
                }`}>
                  {c.icon}
                </div>
                <h3 className="font-bold text-stone-900 text-lg mb-2">{c.title}</h3>
                <p className="text-stone-600 text-sm leading-relaxed">{c.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Field image strip */}
      <section className="relative h-52 md:h-64 overflow-hidden">
        <img src={FIELD_IMG} alt="Agricultural fields" className="w-full h-full object-cover" />
        <div className="absolute inset-0 bg-emerald-950/70 flex items-center justify-center backdrop-blur-xs">
          <p className="text-white text-xl md:text-2xl font-semibold tracking-wide text-center px-4 max-w-2xl leading-snug">
            {t('builtForBanner', lang)}
          </p>
        </div>
      </section>

      {/* Stats */}
      <section className="py-16 bg-emerald-900 text-white">
        <div className="max-w-5xl mx-auto px-4 grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
          {[
            { value: '1,284', label: t('statsFieldReports', lang) },
            { value: '892', label: t('statsConfirmedCases', lang) },
            { value: '24', label: t('statsRiskZones', lang) },
            { value: '8', label: t('statsDistrictsCovered', lang) },
          ].map((s, i) => (
            <div key={i}>
              <div style={{ fontFamily: "'DM Serif Display', serif" }} className="text-3xl md:text-5xl text-emerald-200 mb-1">{s.value}</div>
              <div className="text-emerald-300 text-sm font-medium">{s.label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="py-20 bg-white text-center">
        <div className="max-w-lg mx-auto px-4">
          <h2 style={{ fontFamily: "'DM Serif Display', serif" }} className="text-3xl md:text-4xl text-emerald-950 mb-4">
            {t('ctaTitle', lang)}
          </h2>
          <p className="text-stone-600 mb-8 text-base">{t('ctaSubtitle', lang)}</p>
          <button
            onClick={() => navigate('role-selection')}
            className="bg-emerald-800 hover:bg-emerald-900 text-white font-semibold px-8 py-3.5 rounded-xl text-lg transition-all shadow-md"
          >
            {t('btnGetStarted', lang)}
          </button>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-emerald-950 text-emerald-400 py-10 border-t border-emerald-900">
        <div className="max-w-6xl mx-auto px-4 flex flex-col md:flex-row items-center justify-between gap-4 text-sm">
          <div className="flex items-center gap-2.5">
            <LeafIcon className="w-5 h-5 text-emerald-400" />
            <span style={{ fontFamily: "'DM Serif Display', serif" }} className="text-emerald-100 text-xl">AgriSense</span>
          </div>
          <p className="text-emerald-400/80 text-xs text-center max-w-xl">
            {t('footerDisclaimer', lang)}
          </p>
        </div>
      </footer>
    </div>
  )
}

function LeafIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M11 20A7 7 0 0 1 9.8 6.1C15.5 5 17 4.48 19 2c1 2 2 4.18 2 8 0 5.5-4.78 10-10 10Z" />
      <path d="M2 21c0-3 1.85-5.36 5.08-6C9.5 14.52 12 13 13 12" />
    </svg>
  )
}

function ScanIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 7V5a2 2 0 0 1 2-2h2" /><path d="M17 3h2a2 2 0 0 1 2 2v2" />
      <path d="M21 17v2a2 2 0 0 1-2 2h-2" /><path d="M7 21H5a2 2 0 0 1-2-2v-2" />
      <line x1="3" y1="12" x2="21" y2="12" />
    </svg>
  )
}

function ChartIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="18" y1="20" x2="18" y2="10" /><line x1="12" y1="20" x2="12" y2="4" />
      <line x1="6" y1="20" x2="6" y2="14" /><line x1="2" y1="20" x2="22" y2="20" />
    </svg>
  )
}

function BookIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z" /><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z" />
    </svg>
  )
}

function MapIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polygon points="3 6 9 3 15 6 21 3 21 18 3 21" />
      <line x1="9" y1="3" x2="9" y2="18" /><line x1="15" y1="6" x2="15" y2="21" />
    </svg>
  )
}

function CheckCircleIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
      <polyline points="22 4 12 14.01 9 11.01" />
    </svg>
  )
}

function AlertTriangleIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z" />
      <line x1="12" y1="9" x2="12" y2="13" />
      <line x1="12" y1="17" x2="12.01" y2="17" />
    </svg>
  )
}
