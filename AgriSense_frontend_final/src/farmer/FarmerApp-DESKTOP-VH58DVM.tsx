import { useState, useEffect, useCallback, useRef } from 'react'
import { useAppNav } from '../App'
import { supabase } from '../lib/supabase'
import { audioUrlFromBase64, speakWithBhashini, translateWithBhashini, type BhashiniLanguage } from '../lib/bhashini'
import { t } from '../lib/i18n'
import { tx } from '../lib/uiText'
import { EdgeTelemetryDashboard } from '../components/EdgeTelemetryDashboard'
import { EdgeModeToggle } from '../components/EdgeModeToggle'
import { useAudioAdvisory } from '../lib/useAudioAdvisory'
import {
  getFarmerContext,
  createAiFollowup,
  createOfficerCase,
  getActiveAiFollowup,
  getFollowupScans,
  saveAiFollowupScan,
  updateAiFollowup,
  progressionFromScores,
} from '../lib/agrisense'

type FarmerPage =
  | 'home' | 'scan-mode' | 'crop-selection' | 'image-upload' | 'pest-upload' | 'ai-analysis'
  | 'diagnosis-result' | 'ipm-advisory' | 'expert-consultation'
  | 'report-case' | 'risk' | 'alerts' | 'alert-details'
  | 'my-reports' | 'report-details' | 'ai-followup' | 'profile' | 'notifications'

type Language = 'en' | 'hi' | 'gu'

const NAV_LABELS: Record<Language, { home: string; scan: string; risk: string; alerts: string; reports: string; profile: string }> = {
  en: { home: 'Home', scan: 'Scan', risk: 'Risk', alerts: 'Alerts', reports: 'My Reports', profile: 'Profile' },
  hi: { home: 'होम', scan: 'स्कैन', risk: 'जोखिम', alerts: 'अलर्ट', reports: 'मेरी रिपोर्ट', profile: 'प्रोफ़ाइल' },
  gu: { home: 'હોમ', scan: 'સ્કેન', risk: 'જોખમ', alerts: 'એલર્ટ', reports: 'મારી રિપોર્ટ', profile: 'પ્રોફ' },
}

export const TRANSLATION_LANGUAGES = [
  { code: 'en', label: 'English' },
  { code: 'hi', label: 'Hindi (हिंदी)' },
  { code: 'gu', label: 'Gujarati (ગુજરાતી)' },
  { code: 'mr', label: 'Marathi (मराठी)' },
  { code: 'pa', label: 'Punjabi (ਪੰਜਾਬੀ)' },
  { code: 'ta', label: 'Tamil (தமிழ்)' },
  { code: 'te', label: 'Telugu (తెలుగు)' },
]


const RICE_IMG = 'https://images.unsplash.com/photo-1561504935-4e7d4516a2d1?w=400&h=300&fit=crop&auto=format'

function getActiveTab(page: FarmerPage): string {
  if (['scan-mode', 'crop-selection', 'image-upload', 'pest-upload', 'ai-analysis', 'diagnosis-result', 'ipm-advisory', 'expert-consultation', 'report-case', 'ai-followup'].includes(page)) return 'scan'
  if (page === 'risk') return 'risk'
  if (['alerts', 'alert-details'].includes(page)) return 'alerts'
  if (['my-reports', 'report-details'].includes(page)) return 'reports'
  if (page === 'profile') return 'profile'
  return 'home'
}

export default function FarmerApp({ initialLang = 'en' }: { initialLang?: Language }) {
  const { navigate: globalNav, lang, setLang } = useAppNav()
  const [page, setPage] = useState<FarmerPage>('home')
  const [langOpen, setLangOpen] = useState(false)
  const [notifOpen, setNotifOpen] = useState(false)
  const [selectedCrop, setSelectedCrop] = useState('Rice')
  const [scanMode, setScanMode] = useState<'disease' | 'pest' | 'both'>('disease')
  const [bothPhase, setBothPhase] = useState<'pest' | 'disease'>('disease')
  const [pestImageUploaded, setPestImageUploaded] = useState(false)
  const [pestFile, setPestFile] = useState<File | null>(null)
  const [pestImagePreview, setPestImagePreview] = useState<string | null>(null)
  const [imageUploaded, setImageUploaded] = useState(false)
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [imagePreview, setImagePreview] = useState<string | null>(null)
  const [analysisResult, setAnalysisResult] = useState<any>(null)
  const [analysisError, setAnalysisError] = useState('')
  const [analysisStep, setAnalysisStep] = useState(0)
  const [analysisComplete, setAnalysisComplete] = useState(false)
  const [reportSubmitted, setReportSubmitted] = useState(false)
  const [expertSubmitted, setExpertSubmitted] = useState(false)
  const [selectedAlertIdx, setSelectedAlertIdx] = useState(0)
  const [selectedReportIdx, setSelectedReportIdx] = useState(0)
  const [farmerContext, setFarmerContext] = useState<any>(null)
  const [activeFollowup, setActiveFollowup] = useState<any>(null)
  const [followupScans, setFollowupScans] = useState<any[]>([])

  const nav = useCallback((p: FarmerPage) => {
    setPage(p)
    setNotifOpen(false)
    setLangOpen(false)
  }, [])

  const activeTab = getActiveTab(page)
  const labels = NAV_LABELS[lang]

  useEffect(() => {
    let cancelled = false
      ; (async () => {
        try {
          const ctx = await getFarmerContext()
          if (cancelled) return
          setFarmerContext(ctx)
          setSelectedCrop(ctx.crop?.crop || 'Rice')
          const followup = await getActiveAiFollowup(ctx.userId)
          if (cancelled) return
          setActiveFollowup(followup)
          if (followup) {
            const scans = await getFollowupScans(followup.id)
            if (!cancelled) setFollowupScans(scans)
          }
        } catch (e) {
          console.error('Farmer context load failed:', e)
        }
      })()
    return () => { cancelled = true }
  }, [])

  // Reset image/analysis when leaving scan flow
  useEffect(() => {
    if (!['image-upload', 'pest-upload', 'ai-analysis', 'diagnosis-result', 'ipm-advisory', 'expert-consultation', 'report-case'].includes(page)) {
      if (page === 'crop-selection') {
        setImageUploaded(false)
        setSelectedFile(null)
        setImagePreview(null)
        setPestImageUploaded(false)
        setPestFile(null)
        setPestImagePreview(null)
        setAnalysisResult(null)
        setAnalysisError('')
        setAnalysisStep(0)
        setAnalysisComplete(false)
        setBothPhase('disease')
        setReportSubmitted(false)
        setExpertSubmitted(false)
      }
    }
  }, [page])

  return (
    <div className="h-full overflow-hidden bg-stone-50">
      {/* Fixed Header */}
      <header className="fixed top-0 left-0 right-0 h-14 z-50 bg-white border-b border-stone-200 flex items-center px-4 gap-3">
        <div className="flex items-center gap-2 flex-shrink-0">
          <LeafIcon className="w-5 h-5 text-green-700" />
          <span style={{ fontFamily: "'DM Serif Display', serif" }} className="text-lg text-green-900">AgriSense</span>
        </div>
        <div className="flex items-center gap-1 text-xs text-stone-400 flex-shrink-0">
          <PinIcon className="w-3 h-3" />
          <span>Sanand, Gujarat</span>
        </div>
        <div className="flex-1" />
        {/* Edge Mode Toggle */}
        <EdgeModeToggle lang={lang} />
        {/* Language selector */}
        <div className="relative flex-shrink-0">
          <button onClick={() => { setLangOpen(!langOpen); setNotifOpen(false) }}
            className="flex items-center gap-1 text-xs text-green-700 font-medium border border-green-200 px-2 py-1 rounded hover:bg-green-50 transition-colors">
            {lang === 'en' ? 'EN' : lang === 'hi' ? 'हिंदी' : 'ગુ'}
            <ChevronIcon className="w-3 h-3" />
          </button>
          {langOpen && (
            <div className="absolute right-0 top-full mt-1 bg-white border border-stone-200 rounded-lg shadow-lg z-50 overflow-hidden">
              {(['en', 'hi', 'gu'] as Language[]).map((l) => (
                <button key={l} onClick={() => { setLang(l); setLangOpen(false) }}
                  className={`block w-full text-left px-4 py-2 text-xs hover:bg-stone-50 ${lang === l ? 'text-green-700 font-semibold' : 'text-stone-700'}`}>
                  {l === 'en' ? 'English' : l === 'hi' ? 'हिंदी' : 'ગુજરાતી'}
                </button>
              ))}
            </div>
          )}
        </div>
        {/* Notifications */}
        <div className="relative flex-shrink-0">
          <button onClick={() => { setNotifOpen(!notifOpen); setLangOpen(false) }}
            className="relative w-8 h-8 flex items-center justify-center rounded-full hover:bg-stone-100 transition-colors">
            <BellIcon className="w-5 h-5 text-stone-600" />
            <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full" />
          </button>
          {notifOpen && (
            <div className="absolute right-0 top-full mt-1 w-72 bg-white border border-stone-200 rounded-xl shadow-xl z-50 overflow-hidden">
              <div className="px-4 py-3 border-b border-stone-100 flex items-center justify-between">
                <span className="font-semibold text-stone-800 text-sm">{tx('Notifications', lang)}</span>
                <button onClick={() => setNotifOpen(false)} className="text-stone-400 hover:text-stone-600 text-xs">{tx('Close', lang)}</button>
              </div>
              {NOTIFICATIONS.map((n, i) => (
                <div key={i} className={`px-4 py-3 border-b border-stone-50 ${i === 0 ? 'bg-green-50' : ''}`}>
                  <div className={`text-xs font-semibold mb-0.5 ${n.type === 'high' ? 'text-red-600' : n.type === 'weather' ? 'text-amber-600' : 'text-green-700'}`}>
                    {n.label}
                  </div>
                  <div className="text-xs text-stone-600 leading-relaxed">{n.msg}</div>
                  <div className="text-xs text-stone-400 mt-1">{n.time}</div>
                </div>
              ))}
            </div>
          )}
        </div>
        {/* Profile */}
        <button onClick={() => nav('profile')}
          className="w-8 h-8 bg-green-700 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
          RJ
        </button>
      </header>

      {/* Desktop Sidebar */}
      <aside className="hidden md:flex fixed left-0 top-14 bottom-0 w-56 z-40 bg-white border-r border-stone-200 flex-col pt-4 pb-4">
        <div className="px-3 mb-2">
          <div className="text-xs font-semibold uppercase tracking-wider text-stone-400 px-3 mb-2">{tx('Navigation', lang)}</div>
        </div>
        {SIDEBAR_ITEMS.map((item) => (
          <button key={item.key}
            onClick={() => nav(item.page as FarmerPage)}
            className={`flex items-center gap-3 mx-2 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${activeTab === item.key
              ? 'bg-green-50 text-green-800 border border-green-200'
              : 'text-stone-600 hover:bg-stone-50 hover:text-stone-900'
              }`}>
            {item.icon}
            <span>{labels[item.key as keyof typeof labels]}</span>
            {item.key === 'alerts' && <span className="ml-auto text-xs bg-red-100 text-red-600 rounded-full px-1.5">3</span>}
          </button>
        ))}
        <div className="mt-auto mx-3 pt-4 border-t border-stone-100 space-y-1">
          <button onClick={async () => { await supabase.auth.signOut(); globalNav('landing') }}
            className="w-full flex items-center gap-2 text-stone-600 hover:text-red-700 hover:bg-red-50 text-xs font-semibold px-3 py-2 rounded-lg transition-colors">
            <LogoutIcon className="w-4 h-4" />
            {t('navLogout', lang)}
          </button>
          <button onClick={() => globalNav('role-selection')}
            className="w-full flex items-center gap-2 text-stone-500 text-xs hover:text-stone-800 px-3 py-2 rounded-lg transition-colors">
            <UserIcon className="w-4 h-4" />
            {t('navSwitchRole', lang)}
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main
        className="absolute left-0 right-0 bottom-16 md:bottom-0 overflow-y-auto"
        style={{ top: '56px' }}
        id="farmer-main"
      >
        <div className="md:ml-56 min-h-full">
          {/* Click outside handlers */}
          {(langOpen || notifOpen) && (
            <div className="fixed inset-0 z-30" onClick={() => { setLangOpen(false); setNotifOpen(false) }} />
          )}

          {page === 'home' && <FarmerHome nav={nav} lang={lang} />}
          {page === 'scan-mode' && <ScanMode nav={nav} setScanMode={setScanMode} lang={lang} />}
          {page === 'crop-selection' && <CropSelection nav={nav} setSelectedCrop={setSelectedCrop} setBothPhase={setBothPhase} scanMode={scanMode} lang={lang} />}
          {page === 'image-upload' && (
            <ImageUpload
              nav={nav}
              crop={selectedCrop}
              imageUploaded={imageUploaded}
              setImageUploaded={setImageUploaded}
              selectedFile={selectedFile}
              setSelectedFile={setSelectedFile}
              imagePreview={imagePreview}
              setImagePreview={setImagePreview}
              scanMode={scanMode}
              bothPhase={bothPhase}
              lang={lang}
            />
          )}
          {page === 'pest-upload' && (
            <PestUpload
              nav={nav}
              crop={selectedCrop}
              imageUploaded={pestImageUploaded}
              setImageUploaded={setPestImageUploaded}
              selectedFile={pestFile}
              setSelectedFile={setPestFile}
              imagePreview={pestImagePreview}
              setImagePreview={setPestImagePreview}
              lang={lang}
            />
          )}
          {page === 'ai-analysis' && (
            <AIAnalysis
              nav={nav}
              step={analysisStep}
              setStep={setAnalysisStep}
              complete={analysisComplete}
              setComplete={setAnalysisComplete}
              selectedFile={selectedFile}
              pestFile={pestFile}
              scanMode={scanMode}
              bothPhase={bothPhase}
              setAnalysisResult={setAnalysisResult}
              farmerId={farmerContext?.userId ?? null}
              fieldId={farmerContext?.field?.id ?? null}
              selectedCrop={selectedCrop}
              onFollowupCreated={(f: any) => { setActiveFollowup(f); setFollowupScans([{ day_number: 1, scan_id: analysisResult?.scan_id, progression: 'STABLE' }]) }}
              analysisError={analysisError}
              setAnalysisError={setAnalysisError}
              imagePreview={imagePreview}
              pestImagePreview={pestImagePreview}
              lang={lang}
            />
          )}
          {page === 'diagnosis-result' && (scanMode === 'pest' || (scanMode === 'both' && bothPhase === 'pest')
            ? <PestResult nav={nav} crop={selectedCrop} result={analysisResult} imagePreview={pestImagePreview} scanMode={scanMode} onContinueToDisease={() => { setBothPhase('disease'); setAnalysisResult(null); setAnalysisComplete(false); setAnalysisStep(0); nav('image-upload') }} lang={lang} />
            : <DiagnosisResult
              nav={nav}
              crop={selectedCrop}
              result={analysisResult}
              imagePreview={imagePreview}
              activeFollowup={activeFollowup}
              scanMode={scanMode}
              bothPhase={bothPhase}
              onContinueToPest={() => {
                setBothPhase('pest')
                setAnalysisResult(null)
                setAnalysisComplete(false)
                setAnalysisStep(0)
                nav('pest-upload')
              }}
              lang={lang}
            />)}
          {page === 'ai-followup' && <AIFollowup nav={nav} followup={activeFollowup} scans={followupScans} setFollowup={setActiveFollowup} setScans={setFollowupScans} farmerContext={farmerContext} lang={lang} />}
          {page === 'ipm-advisory' && <IPMAdvisory nav={nav} result={analysisResult} lang={lang} />}
          {page === 'expert-consultation' && <ExpertConsultation nav={nav} submitted={expertSubmitted} setSubmitted={setExpertSubmitted} farmerId={farmerContext?.userId ?? null} fieldId={farmerContext?.field?.id ?? null} scanId={analysisResult?.scan_id ?? null} lang={lang} />}
          {page === 'report-case' && <ReportCase nav={nav} submitted={reportSubmitted} setSubmitted={setReportSubmitted} lang={lang} />}
          {page === 'risk' && <RiskForecast nav={nav} lang={lang} />}
          {page === 'alerts' && <NearbyAlerts nav={nav} setSelectedAlertIdx={setSelectedAlertIdx} lang={lang} />}
          {page === 'alert-details' && <AlertDetails nav={nav} idx={selectedAlertIdx} />}
          {page === 'my-reports' && <MyReports nav={nav} setSelectedReportIdx={setSelectedReportIdx} lang={lang} />}
          {page === 'report-details' && <ReportDetails nav={nav} idx={selectedReportIdx} lang={lang} />}
          {page === 'profile' && <FarmerProfile nav={nav} lang={lang} setLang={setLang} />}
        </div>
      </main>

      {/* Mobile Bottom Nav */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 h-16 z-50 bg-white border-t border-stone-200 flex items-center">
        {SIDEBAR_ITEMS.map((item) => (
          <button key={item.key}
            onClick={() => nav(item.page as FarmerPage)}
            className={`flex-1 flex flex-col items-center justify-center gap-0.5 py-2 transition-colors ${activeTab === item.key ? 'text-green-700' : 'text-stone-400 hover:text-stone-600'
              }`}>
            <div className={`relative ${activeTab === item.key ? 'text-green-700' : ''}`}>
              {item.icon}
              {item.key === 'alerts' && <span className="absolute -top-1 -right-1 w-2 h-2 bg-red-500 rounded-full" />}
            </div>
            <span className="text-xs font-medium">{labels[item.key as keyof typeof labels]}</span>
            {activeTab === item.key && <span className="w-4 h-0.5 bg-green-600 rounded-full" />}
          </button>
        ))}
      </nav>
    </div>
  )
}

// ────────────────────────── SUB-PAGES ──────────────────────────

function FarmerHome({ nav, lang }: { nav: (p: FarmerPage) => void; lang: Language }) {
  return (
    <div className="p-4 max-w-2xl mx-auto space-y-4 pb-4">
      {/* Greeting */}
      <div className="pt-2">
        <h1 className="text-xl font-semibold text-stone-900">{t('homeGreeting', lang)} 👋</h1>
        <p className="text-stone-500 text-sm">{t('homeSubtitle', lang)}</p>
      </div>

      {/* Scan Card */}
      <div className="bg-green-800 rounded-2xl p-5 text-white">
        <div className="flex items-center gap-2 mb-1">
          <ScanIcon className="w-5 h-5 text-green-300" />
          <span className="font-semibold text-green-100 text-sm uppercase tracking-wide">{t('scanCardTitle', lang)}</span>
        </div>
        <p className="text-green-200 text-sm mb-4 leading-relaxed">{t('scanCardDesc', lang)}</p>
        <div className="flex gap-3">
          <button onClick={() => nav('scan-mode')} className="flex-1 bg-green-600 hover:bg-green-500 text-white font-medium py-2.5 rounded-lg text-sm transition-colors flex items-center justify-center gap-2">
            <CameraIcon className="w-4 h-4" /> {t('btnTakePhoto', lang)}
          </button>
          <button onClick={() => nav('scan-mode')} className="flex-1 bg-white/15 hover:bg-white/25 text-white font-medium py-2.5 rounded-lg text-sm transition-colors flex items-center justify-center gap-2">
            <UploadIcon className="w-4 h-4" /> {t('btnUploadImage', lang)}
          </button>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: t('quickCheckRisk', lang), icon: <ShieldIcon className="w-5 h-5" />, color: 'amber', page: 'risk' as FarmerPage },
          { label: t('quickNearbyAlerts', lang), icon: <MapPinIcon className="w-5 h-5" />, color: 'red', page: 'alerts' as FarmerPage },
          { label: t('quickMyReports', lang), icon: <ReportIcon className="w-5 h-5" />, color: 'blue', page: 'my-reports' as FarmerPage },
        ].map((a) => (
          <button key={a.label} onClick={() => nav(a.page)}
            className="bg-white border border-stone-200 rounded-xl p-3 flex flex-col items-center gap-2 hover:shadow-sm hover:border-stone-300 transition-all">
            <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${a.color === 'amber' ? 'bg-amber-50 text-amber-600' :
              a.color === 'red' ? 'bg-red-50 text-red-600' : 'bg-blue-50 text-blue-600'
              }`}>{a.icon}</div>
            <span className="text-xs font-medium text-stone-700 text-center leading-tight">{a.label}</span>
          </button>
        ))}
      </div>

      {/* Edge Telemetry Dashboard */}
      <EdgeTelemetryDashboard lang={lang} />

      {/* Weather */}
      <div className="bg-white border border-stone-200 rounded-2xl p-4">
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-semibold text-stone-800 text-sm">{t('weatherAdvisoryTitle', lang)}</h2>
          <span className="text-xs text-stone-400">{t('navLocation', lang)}</span>
        </div>
        <div className="grid grid-cols-2 gap-3 mb-4">
          {[
            { label: t('temperature', lang), val: '29°C', icon: <ThermometerIcon className="w-4 h-4 text-orange-500" /> },
            { label: t('humidity', lang), val: '78%', icon: <DropletIcon className="w-4 h-4 text-blue-500" /> },
            { label: t('rainfall', lang), val: '65%', icon: <RainIcon className="w-4 h-4 text-blue-600" /> },
            { label: t('windSpeed', lang), val: '12 km/h', icon: <WindIcon className="w-4 h-4 text-stone-500" /> },
          ].map((w) => (
            <div key={w.label} className="flex items-center gap-2">
              {w.icon}
              <div>
                <div className="text-xs text-stone-500">{w.label}</div>
                <div className="text-sm font-semibold text-stone-800">{w.val}</div>
              </div>
            </div>
          ))}
        </div>
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs font-bold text-amber-700 uppercase tracking-wide">{t('moderateRisk', lang)}</span>
            <span className="w-2 h-2 bg-amber-500 rounded-full" />
          </div>
          <p className="text-xs text-amber-700 leading-relaxed">{t('weatherAdvisoryDesc', lang)}</p>
        </div>
      </div>
    </div>
  )
}


function ScanMode({ nav, setScanMode, lang = 'en' }: {
  nav: (p: FarmerPage) => void
  setScanMode: (mode: 'disease' | 'pest' | 'both') => void
  lang?: Language
}) {
  const choose = (mode: 'disease' | 'pest' | 'both') => {
    setScanMode(mode)
    nav('crop-selection')
  }

  return (
    <div className="p-4 max-w-2xl mx-auto pb-6">
      <BackButton label={tx('Back to Home', lang)} onClick={() => nav('home')} />
      <h1 className="text-xl font-semibold text-stone-900 mb-1">{tx('What would you like to scan?', lang)}</h1>
      <p className="text-sm text-stone-500 mb-5">{tx('Choose one scan type. You can scan a disease, a pest, or both separately.', lang)}</p>
      <div className="space-y-3">
        {[
          { mode: 'disease' as const, icon: '🌿', title: tx('Scan Disease', lang), text: tx('Upload a leaf or crop image to detect disease.', lang) },
          { mode: 'pest' as const, icon: '🐛', title: tx('Scan Pest', lang), text: tx('Upload an insect or pest image for detection.', lang) },
          { mode: 'both' as const, icon: '🔍', title: tx('Scan Both', lang), text: tx('Upload a disease image and a separate pest image.', lang) },
        ].map((item) => (
          <button key={item.mode} onClick={() => choose(item.mode)}
            className="w-full bg-white border border-stone-200 rounded-2xl p-4 text-left flex items-center gap-4 hover:border-green-500 hover:bg-green-50 transition-colors">
            <div className="w-14 h-14 rounded-xl bg-emerald-50 flex items-center justify-center text-3xl">{item.icon}</div>
            <div className="flex-1">
              <div className="font-semibold text-stone-900">{item.title}</div>
              <div className="text-sm text-stone-500 mt-1">{item.text}</div>
            </div>
            <span className="text-green-700 text-lg">→</span>
          </button>
        ))}
      </div>
    </div>
  )
}

function PestUpload({
  nav, crop, imageUploaded, setImageUploaded, selectedFile, setSelectedFile,
  imagePreview, setImagePreview, lang = 'en'
}: {
  nav: (p: FarmerPage) => void
  crop: string
  imageUploaded: boolean
  setImageUploaded: (v: boolean) => void
  selectedFile: File | null
  setSelectedFile: (f: File | null) => void
  imagePreview: string | null
  setImagePreview: (v: string | null) => void
  lang?: Language
}) {
  const handleFile = (file: File | undefined) => {
    if (!file || !file.type.startsWith('image/')) return
    setSelectedFile(file)
    setImagePreview(URL.createObjectURL(file))
    setImageUploaded(true)
  }

  return (
    <div className="p-4 max-w-2xl mx-auto pb-6">
      <BackButton label="Back to Disease Image" onClick={() => nav('image-upload')} />
      <h1 className="text-xl font-semibold text-stone-900 mb-1">{tx('Upload Pest Image', lang)}</h1>
      <p className="text-stone-500 text-sm mb-4">{tx('Crop selected:', lang)} <span className="font-medium text-green-700">{crop}</span></p>
      {!imageUploaded ? (
        <>
          <div className="bg-stone-100 border-2 border-dashed border-stone-300 rounded-2xl h-48 flex flex-col items-center justify-center gap-2 mb-4">
            <span className="text-4xl">🐛</span>
            <p className="text-stone-500 text-sm font-medium">{tx('Capture a clear image of the pest', lang)}</p>
            <p className="text-stone-400 text-xs">{tx('Keep the insect in focus', lang)}</p>
          </div>
          <div className="flex gap-3">
            <label className="flex-1 bg-green-700 text-white font-semibold py-3 rounded-lg flex items-center justify-center gap-2 cursor-pointer">
              <CameraIcon className="w-4 h-4" /> Take Photo
              <input type="file" accept="image/*" capture="environment" className="hidden" onChange={(e) => handleFile(e.target.files?.[0])} />
            </label>
            <label className="flex-1 bg-white border border-stone-200 text-stone-700 font-semibold py-3 rounded-lg flex items-center justify-center gap-2 cursor-pointer">
              <UploadIcon className="w-4 h-4" /> Gallery
              <input type="file" accept="image/*" className="hidden" onChange={(e) => handleFile(e.target.files?.[0])} />
            </label>
          </div>
        </>
      ) : (
        <>
          <div className="relative rounded-2xl overflow-hidden mb-3 bg-stone-200">
            {imagePreview && <img src={imagePreview} alt="Uploaded pest" className="w-full h-52 object-cover" />}
            <div className="absolute top-3 left-3 bg-green-600 text-white text-xs font-semibold px-2 py-1 rounded">{tx('Pest photo uploaded ✓', lang)}</div>
          </div>
          <div className="text-xs text-stone-500 mb-3 truncate">{selectedFile?.name}</div>
          <div className="flex gap-3">
            <button onClick={() => nav('ai-analysis')} className="flex-1 bg-green-700 text-white font-semibold py-3 rounded-lg">{tx('Scan Pest', lang)}</button>
            <button onClick={() => { setImageUploaded(false); setSelectedFile(null); setImagePreview(null) }} className="flex-1 bg-white border border-stone-200 text-stone-700 font-semibold py-3 rounded-lg">{tx('Retake', lang)}</button>
          </div>
        </>
      )}
    </div>
  )
}

function PestResult({ nav, crop, result, imagePreview, scanMode, onContinueToDisease, lang = 'en' }: {
  nav: (p: FarmerPage) => void
  crop: string
  result: any
  imagePreview: string | null
  scanMode: 'disease' | 'pest' | 'both'
  onContinueToDisease: () => void
  lang?: Language
}) {
  const detection = result?.pest_detection || result?.pest || result?.pests || result
  const detections = detection?.detections || []
  const count = detection?.pest_count ?? detections.length ?? 0
  const names = detections.map((d: any) => d.label || d.class_name || d.name).filter(Boolean)
  const confidence = detections.length ? Math.max(...detections.map((d: any) => Number(d.confidence || 0))) * 100 : 0
  const pestName = names[0] || detection?.pest_name || 'Pest not identified'

  return (
    <div className="p-4 max-w-2xl mx-auto pb-6">
      <BackButton label="Back to Pest Scan" onClick={() => nav('ai-analysis')} />
      <h1 className="text-xl font-semibold text-stone-900 mb-4">{tx('Pest Detection Result', lang)}</h1>
      <div className="relative rounded-2xl overflow-hidden mb-4 bg-stone-200">
        {imagePreview && <img src={imagePreview} alt="Detected pest" className="w-full h-48 object-cover" />}
      </div>
      <div className="bg-white border border-stone-200 rounded-xl p-4 mb-4">
        <div className="text-xs text-stone-500 mb-1">{tx('Crop', lang)}</div>
        <div className="font-semibold text-stone-900 mb-3">{crop}</div>
        <div className="text-xs text-stone-500 mb-1">{tx('Detected pest', lang)}</div>
        <div className="text-lg font-bold text-green-700 capitalize">{pestName}</div>
        <div className="grid grid-cols-2 gap-3 mt-4">
          <div className="bg-stone-50 rounded-lg p-3"><div className="text-xl font-bold">{count}</div><div className="text-xs text-stone-500">{tx('Pest count', lang)}</div></div>
          <div className="bg-stone-50 rounded-lg p-3"><div className="text-xl font-bold">{confidence.toFixed(2)}%</div><div className="text-xs text-stone-500">{tx('Confidence', lang)}</div></div>
        </div>
      </div>
      <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-sm text-amber-800 mb-4">
        {tx('AI detection is preliminary. The final recommendation should be validated by the Extension Officer.', lang)}
      </div>
      <div className="bg-green-50 border border-green-200 rounded-xl p-4 mb-3 text-sm text-green-800">
        <div className="font-semibold mb-1">{tx('✓ Pest report submitted for officer review', lang)}</div>
        <p className="text-xs leading-relaxed">{tx('The pest scan has been saved separately. The Extension Officer can review this report and send guidance back to you.', lang)}</p>
      </div>
      <button onClick={() => nav('my-reports')} className="w-full bg-green-700 text-white font-semibold py-3 rounded-lg">{tx('Track Expert Review', lang)}</button>
      <button onClick={() => nav('scan-mode')} className="w-full text-stone-500 text-sm py-3">{tx('Scan Another Image', lang)}</button>
    </div>
  )
}

function CropSelection({ nav, setSelectedCrop, setBothPhase, scanMode, lang = 'en' }: { nav: (p: FarmerPage) => void; setSelectedCrop: (c: string) => void; setBothPhase: (p: 'pest' | 'disease') => void; scanMode: 'disease' | 'pest' | 'both'; lang?: Language }) {
  const crops = ['Rice', 'Wheat', 'Cotton', 'Maize', 'Potato', 'Tomato', 'Chilli', 'Groundnut', "I don't know"]
  const [search, setSearch] = useState('')
  const filtered = crops.filter((c) => c.toLowerCase().includes(search.toLowerCase()))


  return (

    <div className="p-4 max-w-2xl mx-auto pb-4">
      <BackButton label={t('backToHome', lang)} onClick={() => nav('home')} />
      <h1 className="text-xl font-semibold text-stone-900 mb-1">{t('cropSelectTitle', lang)}</h1>
      <p className="text-stone-500 text-sm mb-4">{t('cropSelectSubtitle', lang)}</p>
      <div className="relative mb-4">
        <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-400" />
        <input
          type="text"
          placeholder={t('searchCropPlaceholder', lang)}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full pl-9 pr-4 py-2.5 border border-stone-200 rounded-lg text-sm focus:outline-none focus:border-green-500 bg-white"
        />
      </div>
      <div className="grid grid-cols-3 gap-3">
        {filtered.map((crop) => (
          <button
            key={crop}
            onClick={() => {
              setSelectedCrop(crop)
              setBothPhase('disease')
              nav(scanMode === 'pest' ? 'pest-upload' : 'image-upload')
            }}
            className="bg-white border border-stone-200 rounded-xl p-4 flex flex-col items-center gap-2 hover:border-green-500 hover:bg-green-50 hover:shadow-sm transition-all">
            <div className="w-12 h-12 rounded-xl bg-emerald-50/80 border border-emerald-200/80 flex items-center justify-center mb-1 text-2xl shadow-2xs">
              {CROP_EMOJIS[crop] || '🌱'}
            </div>
            <span className="text-xs font-semibold text-stone-800 text-center leading-tight">{crop}</span>
          </button>
        ))}
      </div>
    </div>
  )
}

function ImageUpload({
  nav, crop, imageUploaded, setImageUploaded, selectedFile, setSelectedFile,
  imagePreview, setImagePreview, scanMode, bothPhase, lang = 'en'
}: {
  nav: (p: FarmerPage) => void
  crop: string
  imageUploaded: boolean
  setImageUploaded: (v: boolean) => void
  selectedFile: File | null
  setSelectedFile: (f: File | null) => void
  imagePreview: string | null
  setImagePreview: (v: string | null) => void
  scanMode: 'disease' | 'pest' | 'both'
  bothPhase: 'pest' | 'disease'
  lang?: Language
}) {
  const handleFile = (file: File | undefined) => {
    if (!file) return
    if (!file.type.startsWith('image/')) return
    setSelectedFile(file)
    const url = URL.createObjectURL(file)
    setImagePreview(url)
    setImageUploaded(true)
  }

  return (
    <div className="p-4 max-w-2xl mx-auto pb-4">
      <BackButton label={t('backToCropSelection', lang)} onClick={() => nav('crop-selection')} />
      <h1 className="text-xl font-semibold text-stone-900 mb-1">{tx('Capture the affected area', lang)}</h1>
      <p className="text-stone-500 text-sm mb-4">{tx('Crop selected:', lang)} <span className="font-medium text-green-700">{crop}</span></p>

      {!imageUploaded ? (
        <>
          <div className="bg-stone-100 border-2 border-dashed border-stone-300 rounded-2xl h-48 flex flex-col items-center justify-center gap-2 mb-4">
            <CameraIcon className="w-10 h-10 text-stone-400" />
            <p className="text-stone-500 text-sm font-medium">{tx('Take a clear photo of the affected area', lang)}</p>
            <p className="text-stone-400 text-xs">{tx('in good lighting', lang)}</p>
          </div>
          <div className="bg-green-50 border border-green-200 rounded-xl p-4 mb-4 space-y-2">
            {['Keep the affected area in focus', 'Avoid blurry images', 'Capture one affected leaf clearly', 'Avoid very dark images'].map((tip) => (
              <div key={tip} className="flex items-center gap-2 text-sm text-green-800">
                <span className="text-green-600 flex-shrink-0">✓</span><span>{tip}</span>
              </div>
            ))}
          </div>
          <div className="flex gap-3">
            <label className="flex-1 bg-green-700 hover:bg-green-600 text-white font-semibold py-3 rounded-lg flex items-center justify-center gap-2 transition-colors cursor-pointer">
              <CameraIcon className="w-4 h-4" /> Take Photo
              <input type="file" accept="image/*" capture="environment" className="hidden"
                onChange={(e) => handleFile(e.target.files?.[0])} />
            </label>
            <label className="flex-1 bg-white border border-stone-200 hover:bg-stone-50 text-stone-700 font-semibold py-3 rounded-lg flex items-center justify-center gap-2 transition-colors cursor-pointer">
              <UploadIcon className="w-4 h-4" /> Upload from Gallery
              <input type="file" accept="image/*" className="hidden"
                onChange={(e) => handleFile(e.target.files?.[0])} />
            </label>
          </div>
        </>
      ) : (
        <>
          <div className="relative rounded-2xl overflow-hidden mb-4 bg-stone-200">
            {imagePreview && <img src={imagePreview} alt="Uploaded crop photo" className="w-full h-52 object-cover" />}
            <div className="absolute top-3 left-3 bg-green-600 text-white text-xs font-semibold px-2 py-1 rounded">
              Photo uploaded ✓
            </div>
          </div>
          <div className="text-xs text-stone-500 mb-3 truncate">{selectedFile?.name}</div>
          <div className="flex gap-3">
            <button onClick={() => nav(scanMode === 'both' && bothPhase === 'pest' ? 'pest-upload' : 'ai-analysis')} className="flex-1 bg-green-700 hover:bg-green-600 text-white font-semibold py-3 rounded-lg flex items-center justify-center gap-2 transition-colors">
              <ScanIcon className="w-4 h-4" /> {scanMode === 'both' && bothPhase === 'pest' ? 'Continue to Pest Image' : 'Analyze Crop'}
            </button>
            <button onClick={() => { setImageUploaded(false); setSelectedFile(null); setImagePreview(null) }}
              className="flex-1 bg-white border border-stone-200 hover:bg-stone-50 text-stone-700 font-semibold py-3 rounded-lg transition-colors">
              Retake Photo
            </button>
          </div>
        </>
      )}
    </div>
  )
}

function AIAnalysis({
  nav, step, setStep, complete, setComplete, selectedFile, pestFile, scanMode, bothPhase, setAnalysisResult,
  farmerId, fieldId, selectedCrop, onFollowupCreated, analysisError, setAnalysisError, imagePreview, pestImagePreview, lang = 'en'
}: {
  nav: (p: FarmerPage) => void
  step: number
  setStep: (v: number) => void
  complete: boolean
  setComplete: (v: boolean) => void
  selectedFile: File | null
  pestFile: File | null
  scanMode: 'disease' | 'pest' | 'both'
  bothPhase: 'pest' | 'disease'
  setAnalysisResult: (v: any) => void
  farmerId: string | null
  fieldId: string | null
  selectedCrop: string
  onFollowupCreated: (v: any) => void
  analysisError: string
  setAnalysisError: (v: string) => void
  imagePreview: string | null
  pestImagePreview: string | null
  lang?: Language
}) {
  const { edgeMode, addOfflineAction } = useAppNav()
  const [started, setStarted] = useState(false)
  const steps = [
    { label: 'Image quality checked', done: step > 0, active: step === 0 },
    { label: 'Crop identified', done: step > 1, active: step === 1 },
    { label: 'Analyzing symptoms', done: step > 2, active: step === 2 },
    { label: 'Estimating severity', done: step > 3, active: step === 3 },
    { label: 'Checking local risk', done: step > 4, active: step === 4 },
  ]

  useEffect(() => {
    if (started || complete) return
    setStarted(true)
    const effectiveMode = scanMode === 'both' ? bothPhase : scanMode
    const primaryFile = effectiveMode === 'pest' ? pestFile : selectedFile
    if (!primaryFile) {
      setAnalysisError('No image was selected. Please go back and upload an image.')
      setComplete(true)
      return
    }

    const runAnalysis = async () => {
      try {
        setAnalysisError('')
        setStep(1)
        setTimeout(() => setStep(2), 400)
        setTimeout(() => setStep(3), 800)
        setTimeout(() => setStep(4), 1200)

        if (edgeMode === 'edge') {
          // Edge Mode: Bypass cloud fetch and use local Edge Node telemetry inference
          let edgeTelemetry: any = null
          try {
            const telemRes = await fetch('/telemetry_mock.json')
            if (telemRes.ok) edgeTelemetry = await telemRes.json()
          } catch (e) {
            console.log('Using fallback offline telemetry mock')
          }

          const offlineResult = {
            scan_id: 'edge-scan-' + Date.now(),
            source: 'AgriSense Edge Node (YOLOv8-Nano Quantized)',
            prediction: {
              crop: selectedCrop || 'Rice',
              condition: effectiveMode === 'pest' ? 'Aphid Cluster Detected (Edge Vision)' : 'Early Fungal Blast (Edge Inference)',
              confidence: 0.92,
              disease: effectiveMode === 'pest' ? 'Aphids' : 'Rice Blast',
            },
            risk: {
              risk: 'HIGH',
              score: 85,
              recommendation: edgeTelemetry?.smart_irrigation?.recommendation || 'Irrigate Now',
            },
            treatment: {
              advisory: 'Edge Node Local Guidance: Maintain optimal soil moisture and apply targeted organic neem spray.',
              dosages: ['Neem Oil 5ml/L water', 'Trichoderma Viride 10g/L'],
              methods: ['Foliar spray during early morning or evening'],
            },
            ipm: {
              title: 'Offline Field IPM Checklist',
              steps: ['Inspect surrounding edge node area', 'Ensure drip irrigation volume is calibrated'],
            },
          }
          setTimeout(() => {
            setAnalysisResult(offlineResult)
            addOfflineAction('crop_scan', offlineResult)
            setStep(5)
            setComplete(true)
          }, 1500)
          return
        }

        const form = new FormData()
        // Tell the backend which analysis branch to run.
        form.append('scan_mode', effectiveMode)
        form.append('file', primaryFile)
        if (effectiveMode === 'both' && pestFile) form.append('pest_file', pestFile)
        if (farmerId) form.append('farmer_id', farmerId)
        if (fieldId) form.append('field_id', fieldId)
        if (selectedCrop && selectedCrop !== "I don't know") form.append('selected_crop', selectedCrop)

        // Backend uses live weather from the farmer field/profile when coordinates exist.
        // These values remain fallback inputs if live weather cannot be resolved.
        form.append('temperature', '28')
        form.append('humidity', '84')
        form.append('rainfall', '12')
        form.append('pest_count', '18')

        const response = await fetch('http://127.0.0.1:8000/analyze', {
          method: 'POST',
          body: form,
        })
        if (!response.ok) {
          const body = await response.text()
          throw new Error(`Analysis failed (${response.status}): ${body}`)
        }
        const data = await response.json()
        setAnalysisResult(data)

        const riskLevel = String(data.risk?.risk || '').toUpperCase()
        const riskScore = Number(data.risk?.score ?? 0)
        // Pest-only and combined scans must also reach the Extension Officer.
        // Disease-only scans retain the existing high-risk escalation rule.
        const mustCreateOfficerCase = scanMode === 'both' || effectiveMode === 'pest'
        const immediateEscalation =
          mustCreateOfficerCase || (riskLevel === 'HIGH' && riskScore >= 80)

        if (farmerId && data.scan_id) {
          if (immediateEscalation || scanMode === 'both') {
            try {
              const caseRow = await createOfficerCase({
                farmerId,
                fieldId,
                scanId: data.scan_id,
                priority: effectiveMode === 'pest' ? 'HIGH' : (riskScore >= 90 ? 'CRITICAL' : 'HIGH'),
              })
              data.case_id = caseRow.id
              data.report_type = effectiveMode === 'pest' ? 'pest' : 'disease'
              data.escalation_reason = effectiveMode === 'pest'
                ? 'Pest scan submitted separately for Extension Officer review.'
                : 'Disease scan submitted separately for Extension Officer review.'
              setAnalysisResult({ ...data })
            } catch (caseError) {
              setAnalysisError(caseError instanceof Error ? caseError.message : 'The scan was analyzed, but the officer report could not be created.')
              console.error('Officer case creation failed:', caseError)
            }
          } else {
            try {
              const followup = await createAiFollowup({
                farmerId,
                fieldId,
                crop: data.prediction?.crop || selectedCrop,
                initialScanId: data.scan_id,
              })
              await saveAiFollowupScan({
                followupId: followup.id,
                dayNumber: 1,
                scanId: data.scan_id,
                progression: 'STABLE',
                notes: 'Initial AI diagnosis baseline scan.',
              })
              data.followup_id = followup.id
              data.followup_started = true
              setAnalysisResult({ ...data })
              onFollowupCreated(followup)
            } catch (followupError) {
              console.error('AI follow-up creation failed:', followupError)
            }
          }
        }

        setStep(5)
        setComplete(true)
      } catch (error) {
        setAnalysisError(error instanceof Error ? error.message : 'Could not connect to the analysis server.')
        setComplete(true)
      }
    }
    runAnalysis()
  }, [selectedFile, pestFile, scanMode, bothPhase, farmerId, fieldId, selectedCrop])

  return (
    <div className="p-4 max-w-2xl mx-auto pb-4">
      <BackButton label={bothPhase === 'pest' ? 'Back to Pest Image' : t('backToImageUpload', lang)} onClick={() => nav(bothPhase === 'pest' ? 'pest-upload' : 'image-upload')} />
      <h1 className="text-xl font-semibold text-stone-900 mb-4">{complete ? 'Analysis Complete' : 'Analyzing your crop...'}</h1>

      <div className="relative rounded-2xl overflow-hidden mb-5 bg-stone-200">
        {(scanMode === 'pest' || (scanMode === 'both' && bothPhase === 'pest') ? pestImagePreview : imagePreview) ? <img src={(scanMode === 'pest' || (scanMode === 'both' && bothPhase === 'pest') ? pestImagePreview : imagePreview)!} alt="Crop being analyzed" className="w-full h-48 object-cover" /> : <img src={RICE_IMG} alt="Crop being analyzed" className="w-full h-48 object-cover" />}
        {!complete && <><div className="absolute inset-0 bg-green-900/20" /><div className="scan-line absolute left-0 right-0 h-0.5 bg-green-400" /></>}
        {complete && !analysisError && <div className="absolute inset-0 bg-green-900/40 flex items-center justify-center"><div className="bg-white rounded-full p-3"><CheckIcon className="w-8 h-8 text-green-600" /></div></div>}
      </div>

      <div className="bg-white border border-stone-200 rounded-xl p-4 space-y-3 mb-4">
        {steps.map((s, i) => (
          <div key={i} className="flex items-center gap-3">
            <div className={`w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 ${s.done ? 'bg-green-500 text-white' : s.active ? 'bg-amber-400' : 'bg-stone-200'}`}>
              {s.done ? <CheckIcon className="w-3 h-3" /> : s.active ? null : <span className="w-2 h-2 rounded-full bg-stone-400" />}
            </div>
            <span className={`text-sm ${s.done ? 'text-stone-700' : s.active ? 'text-amber-700 font-medium' : 'text-stone-400'}`}>{s.label}</span>
          </div>
        ))}
      </div>

      {analysisError && <div className="bg-red-50 border border-red-200 rounded-xl p-4 mb-4 text-sm text-red-700">{analysisError}</div>}
      {complete && !analysisError && <button onClick={() => nav('diagnosis-result')} className="w-full bg-green-700 hover:bg-green-600 text-white font-semibold py-3 rounded-lg transition-colors">{tx('View Diagnosis Result →', lang)}</button>}
    </div>
  )
}

function DiagnosisResult({ nav, crop, result, imagePreview, activeFollowup, scanMode, bothPhase, onContinueToPest, lang = 'en' }: {
  nav: (p: FarmerPage) => void
  crop: string
  result: any
  imagePreview: string | null
  activeFollowup: any
  scanMode: 'disease' | 'pest' | 'both'
  bothPhase: 'pest' | 'disease'
  onContinueToPest: () => void
  lang?: Language
}) {
  const { speak: speakAdvisory, isPlaying: isAudioPlaying } = useAudioAdvisory(lang)
  const prediction = result?.prediction
  const risk = result?.risk
  const advisory = result?.advisory
  const disease = prediction?.disease || 'Analysis unavailable'
  const confidence = prediction?.confidence_percent ?? 0
  const riskLevel = String(risk?.risk || 'UNKNOWN').toUpperCase()
  const immediateEscalation = Boolean(result?.case_id)

  return (
    <div className="p-4 max-w-2xl mx-auto pb-4">
      <BackButton label={t('backToHealthCheck', lang)} onClick={() => nav('ai-analysis')} />
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-xl font-semibold text-stone-900">{tx('Crop Health Assessment', lang)}</h1>
        <button
          onClick={() => {
            const cropName = prediction?.crop || crop
            const primaryAction = advisory?.primary_action || result?.treatment?.advisory || 'Follow recommended IPM guidance.'
            const textToRead = `${tx('Crop Health Assessment', lang)}. ${cropName}. ${disease}. ${tx('Risk Level', lang)}: ${riskLevel}. ${primaryAction}`
            speakAdvisory(textToRead)
          }}
          className={`px-3 py-1.5 rounded-xl border flex items-center gap-1.5 text-xs font-semibold transition-all cursor-pointer ${
            isAudioPlaying
              ? 'bg-emerald-600 text-white border-emerald-700 animate-pulse shadow-md'
              : 'bg-white hover:bg-stone-50 text-stone-700 border-stone-300 shadow-2xs'
          }`}
          title={isAudioPlaying ? (t('stopAudio', lang) || 'Stop Audio') : (t('listenAdvisory', lang) || 'Listen to Advisory')}
        >
          <span className="text-sm">{isAudioPlaying ? '🔊' : '📢'}</span>
          <span>{isAudioPlaying ? (t('stopAudio', lang) || 'Stop') : (t('listenAdvisory', lang) || 'Listen')}</span>
        </button>
      </div>

      <div className="relative rounded-2xl overflow-hidden mb-4 bg-stone-200">
        {imagePreview && <img src={imagePreview} alt="Diagnosed crop" className="w-full h-40 object-cover" />}
        <div className="absolute inset-0 bg-gradient-to-t from-stone-900/60 to-transparent flex items-end p-4">
          <div>
            <div className="text-white font-semibold">{prediction?.crop || crop} · {disease}</div>
            <div className="text-stone-300 text-xs">{tx('Instant Health Assessment', lang)}</div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-3 mb-4">
        <div className="bg-white border border-stone-200 rounded-xl p-3 text-center">
          <div className="text-2xl font-bold text-green-700">{Number(confidence).toFixed(2)}%</div>
          <div className="text-xs text-stone-500 mt-0.5">{tx('Confidence', lang)}</div>
        </div>
        <div className={`rounded-xl p-3 text-center ${riskLevel === 'HIGH' ? 'bg-red-50 border border-red-200' : 'bg-amber-50 border border-amber-200'}`}>
          <div className={`text-sm font-bold ${riskLevel === 'HIGH' ? 'text-red-700' : 'text-amber-700'}`}>{riskLevel}</div>
          <div className="text-xs text-stone-500 mt-0.5">{tx('Risk', lang)}</div>
        </div>
        <div className="bg-white border border-stone-200 rounded-xl p-3 text-center">
          <div className="text-2xl font-bold text-orange-600">{risk?.score ?? 0}</div>
          <div className="text-xs text-stone-500 mt-0.5">{tx('Risk Score', lang)}</div>
        </div>
      </div>

      {immediateEscalation ? (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 mb-4">
          <div className="font-semibold text-red-800 text-sm mb-1">{tx('✓ Disease Report Submitted', lang)}</div>
          <p className="text-red-700 text-xs leading-relaxed">{tx('The disease scan has been saved and submitted as a separate report to the Extension Officer.', lang)}</p>
        </div>
      ) : (
        <div className="bg-green-50 border border-green-200 rounded-xl p-4 mb-4">
          <div className="font-semibold text-green-800 text-sm mb-1">{tx('5-Day AI Follow-up Started', lang)}</div>
          <p className="text-green-700 text-xs leading-relaxed">{tx('The crop will be tracked through daily scans. AI will compare progression and escalate to an Extension Officer if the condition deteriorates or does not improve by Day 5.', lang)}</p>
        </div>
      )}

      {advisory && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 mb-4">
          <p className="text-amber-800 text-sm leading-relaxed">{advisory.summary}</p>
        </div>
      )}

      <div className="bg-white border border-stone-200 rounded-xl p-4 mb-4">
        <h3 className="font-semibold text-stone-800 text-sm mb-2">{tx('What should you do now?', lang)}</h3>
        <div className="space-y-1.5">
          {(advisory?.actions || ['Monitor the affected crop.', 'Capture a follow-up image if symptoms change.']).map((a: string, i: number) => (
            <div key={i} className="flex items-start gap-2 text-sm text-stone-600">
              <span className="text-green-600 font-semibold flex-shrink-0 mt-0.5">{i + 1}.</span>{a}
            </div>
          ))}
        </div>
      </div>

      <div className="space-y-2">
        <button onClick={() => nav('ipm-advisory')} className="w-full bg-green-700 hover:bg-green-600 text-white font-semibold py-3 rounded-lg transition-colors">{tx('View Treatment & IPM Advice', lang)}</button>
        {scanMode === 'both' && bothPhase === 'disease' && (
          <button onClick={onContinueToPest} className="w-full bg-white border border-green-600 text-green-700 hover:bg-green-50 font-semibold py-3 rounded-lg transition-colors">
            {tx('Continue to Pest Scan →', lang)}
          </button>
        )}
        {immediateEscalation ? (
          <button onClick={() => nav('my-reports')} className="w-full bg-white border border-red-300 text-red-700 hover:bg-red-50 font-semibold py-3 rounded-lg">{tx('Track Expert Case', lang)}</button>
        ) : (
          <button onClick={() => nav('ai-followup')} className="w-full bg-white border border-green-600 text-green-700 hover:bg-green-50 font-semibold py-3 rounded-lg">{tx('Open 5-Day AI Follow-up', lang)}</button>
        )}
        <button onClick={() => nav('crop-selection')} className="w-full text-stone-500 hover:text-stone-700 text-sm py-2">{tx('Scan Another Image', lang)}</button>
      </div>
    </div>
  )
}

function IPMAdvisory({
  nav,
  result,
  lang,
}: {
  nav: (p: FarmerPage) => void
  result: any
  lang: Language
}) {
  const [expanded, setExpanded] = useState<number | null>(0)
  const [selectedIpmLang, setSelectedIpmLang] = useState<BhashiniLanguage>((lang as BhashiniLanguage) || 'gu')

  const [sectionTranslationLoading, setSectionTranslationLoading] = useState<number | null>(null)
  const [sectionTranslationError, setSectionTranslationError] = useState<Record<number, string>>({})
  const [sectionTranslations, setSectionTranslations] = useState<Record<number, string>>({})
  const [sectionTranslationChunkIndex, setSectionTranslationChunkIndex] = useState<Record<number, number>>({})
  const [sectionDisplayedChunkIndex, setSectionDisplayedChunkIndex] = useState<Record<number, number>>({})
  const [sectionAudioLoading, setSectionAudioLoading] = useState<number | null>(null)
  const [sectionAudioError, setSectionAudioError] = useState<Record<number, string>>({})
  const [sectionAudioUrls, setSectionAudioUrls] = useState<Record<number, string>>({})
  const sectionAudioRefs = useRef<Record<number, HTMLAudioElement | null>>({})
  const pendingSectionAudio = useRef<number | null>(null)

  const stopAllSectionAudio = () => {
    Object.values(sectionAudioRefs.current).forEach((audio) => {
      if (audio) {
        audio.pause()
        audio.currentTime = 0
      }
    })
  }

  useEffect(() => {
    const index = pendingSectionAudio.current
    if (index === null) return
    const audio = sectionAudioRefs.current[index]
    const url = sectionAudioUrls[index]
    if (!audio || !url) return
    pendingSectionAudio.current = null
    stopAllSectionAudio()
    audio.src = url
    audio.currentTime = 0
    audio.play().catch((error) => {
      console.error(`Bhashini IPM section ${index + 1} playback failed:`, error)
    })
  }, [sectionAudioUrls])

  const prediction = result?.prediction
  const risk = result?.risk
  const advisory = result?.advisory

  const disease = prediction?.disease || 'Crop Health Condition'
  const riskLevel = risk?.risk || 'MEDIUM'

  const monitorSteps = advisory?.actions?.length
    ? advisory.actions
    : ['Monitor the affected crop for new or worsening symptoms.']

  const culturalSteps = advisory?.prevention?.length
    ? advisory.prevention
    : ['Maintain good crop hygiene and appropriate growing conditions.']

  const biologicalSteps = [
    'Prefer integrated and low-risk crop-management practices where appropriate.',
    'Avoid unnecessary broad-spectrum pesticide use that may affect beneficial organisms.',
    'Consult your local extension officer for locally approved biological options.',
  ]

  // Advisory data can come directly from the disease advisory, or be nested
  // under disease_advisory / pest_advisory for a combined scan.
  const advisorySources = [
    advisory,
    advisory?.disease_advisory,
    advisory?.pest_advisory,
  ].filter(Boolean)

  const medicineRecommendations = advisorySources.flatMap((source: any) => {
    const recommendations = source?.medicine_recommendations
    return Array.isArray(recommendations) ? recommendations : []
  })

  const dosageValues = advisorySources
    .map((source: any) => source?.dosage)
    .filter((value: any) => value !== null && value !== undefined && String(value).trim())

  const applicationMethodValues = advisorySources
    .map((source: any) => source?.application_method)
    .filter((value: any) => value !== null && value !== undefined && String(value).trim())

  const advisorySourceValues = advisorySources.flatMap((source: any) => {
    const values: string[] = []
    if (source?.source) values.push(String(source.source))
    if (source?.source_url) values.push(String(source.source_url))
    return values
  })

  const chemicalSteps = [
    advisory?.warning ||
    'Do not apply chemical treatments solely from an image prediction.',
    'Follow the product label and local agricultural guidance if treatment is recommended.',
    'Use appropriate protective equipment when handling crop-protection products.',
  ]

  const sections = [
    { num: '01', title: 'Monitor', color: 'blue', steps: monitorSteps },
    { num: '02', title: 'Cultural Practices', color: 'green', steps: culturalSteps },
    { num: '03', title: 'Biological / Low-risk Options', color: 'teal', steps: biologicalSteps },
    { num: '04', title: 'Chemical Intervention', color: 'amber', steps: chemicalSteps },
  ]

  const translateSection = async (sectionIndex: number, steps: string[]) => {
    const chunks: string[][] = []
    for (let i = 0; i < steps.length; i += 3) {
      chunks.push(steps.slice(i, i + 3))
    }

    const safeChunks = chunks.length ? chunks : [['No guidance available for this section.']]
    const currentChunk = sectionTranslationChunkIndex[sectionIndex] ?? 0
    const chunkIndex = currentChunk % safeChunks.length
    const text = safeChunks[chunkIndex].join('. ')

    setSectionTranslationLoading(sectionIndex)
    setSectionTranslationError((prev) => ({ ...prev, [sectionIndex]: '' }))

    try {
      const translatedText = await translateWithBhashini(text, selectedIpmLang)
      setSectionTranslations((prev) => ({
        ...prev,
        [sectionIndex]: translatedText || '',
      }))
      setSectionDisplayedChunkIndex((prev) => ({
        ...prev,
        [sectionIndex]: chunkIndex,
      }))
      setSectionTranslationChunkIndex((prev) => ({
        ...prev,
        [sectionIndex]: (chunkIndex + 1) % safeChunks.length,
      }))
    } catch (error) {
      console.error(`Bhashini IPM section ${sectionIndex + 1} translation failed:`, error)
      setSectionTranslationError((prev) => ({
        ...prev,
        [sectionIndex]: error instanceof Error ? error.message : 'Unable to translate guidance.',
      }))
    } finally {
      setSectionTranslationLoading(null)
    }
  }

  const playSectionAudio = async (sectionIndex: number, steps: string[]) => {
    stopAllSectionAudio()
    setSectionAudioLoading(sectionIndex)
    setSectionAudioError((prev) => ({ ...prev, [sectionIndex]: '' }))

    try {
      const chunks: string[][] = []
      for (let i = 0; i < steps.length; i += 3) {
        chunks.push(steps.slice(i, i + 3))
      }
      const safeChunks = chunks.length ? chunks : [['No guidance available for this section.']]
      const activeChunkIndex = sectionDisplayedChunkIndex[sectionIndex] ?? 0
      const chunkToSpeak = safeChunks[activeChunkIndex % safeChunks.length]
      const textToSpeak = chunkToSpeak.join('. ')
      const existingTranslation = sectionTranslations[sectionIndex]

      const result = existingTranslation
        ? await speakWithBhashini(existingTranslation, selectedIpmLang, selectedIpmLang)
        : await speakWithBhashini(textToSpeak, selectedIpmLang, 'en')

      const nextUrl = audioUrlFromBase64(result.audio_base64 || '')
      const prevUrl = sectionAudioUrls[sectionIndex]
      if (prevUrl) URL.revokeObjectURL(prevUrl)

      setSectionAudioUrls((prev) => ({ ...prev, [sectionIndex]: nextUrl }))
      pendingSectionAudio.current = sectionIndex
    } catch (error) {
      console.error(`Bhashini IPM section ${sectionIndex + 1} audio failed:`, error)
      setSectionAudioError((prev) => ({
        ...prev,
        [sectionIndex]: error instanceof Error ? error.message : 'Unable to play audio.',
      }))
    } finally {
      setSectionAudioLoading(null)
    }
  }

  return (
    <div className="p-4 max-w-2xl mx-auto pb-6">
      <BackButton label="Back to Diagnosis Result" onClick={() => nav('diagnosis-result')} />

      <h1 className="text-xl font-bold text-stone-900 mb-1">{tx('Recommended Action Plan', lang)}</h1>

      <div className="flex items-center gap-2 mb-4">
        <span className="text-sm text-stone-600 font-medium">
          {prediction?.crop ? `${prediction.crop} · ` : ''}
          {disease}
        </span>
        <span className="w-1 h-1 bg-stone-300 rounded-full" />
        <span className={`text-sm font-semibold ${riskLevel === 'HIGH' ? 'text-red-700' : riskLevel === 'LOW' ? 'text-emerald-800' : 'text-amber-700'}`}>
          {riskLevel} Risk
        </span>
      </div>

      <div className="bg-white border border-stone-200 rounded-xl p-3.5 mb-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-2xs">
        <label htmlFor="ipm-lang-select" className="text-xs font-semibold text-stone-700 flex items-center gap-1.5">
          <span>🌐</span> Select Advisory Language (Translation & TTS):
        </label>
        <select
          id="ipm-lang-select"
          value={selectedIpmLang}
          onChange={(e) => setSelectedIpmLang(e.target.value as BhashiniLanguage)}
          className="text-xs font-medium border border-stone-300 rounded-lg px-3 py-1.5 bg-stone-50 text-stone-800 focus:outline-none focus:ring-2 focus:ring-emerald-700"
        >
          {TRANSLATION_LANGUAGES.map((l) => (
            <option key={l.code} value={l.code}>
              {l.label}
            </option>
          ))}
        </select>
      </div>

      <div className="space-y-3 mb-5">
        {sections.map((s, i) => (
          <div key={i} className="bg-white border border-stone-200 rounded-xl overflow-hidden shadow-2xs">
            <div
              onClick={() => setExpanded(expanded === i ? null : i)}
              role="button"
              tabIndex={0}
              onKeyDown={(event) => {
                if (event.key === 'Enter' || event.key === ' ') {
                  event.preventDefault()
                  setExpanded(expanded === i ? null : i)
                }
              }}
              className="w-full flex items-center gap-3 p-4 text-left hover:bg-stone-50 transition-colors cursor-pointer"
            >
              <span className={`text-xs font-bold px-2 py-0.5 rounded-md ${s.color === 'blue' ? 'bg-blue-100 text-blue-800' :
                s.color === 'green' ? 'bg-emerald-100 text-emerald-800' :
                  s.color === 'teal' ? 'bg-teal-100 text-teal-800' :
                    'bg-amber-100 text-amber-800'
                }`}>
                {s.num}
              </span>

              <span className="font-bold text-stone-900 text-sm flex-1">
                {s.title}
              </span>

              <button
                type="button"
                onClick={(event) => {
                  event.stopPropagation()
                  setExpanded(i)
                  translateSection(i, s.steps)
                }}
                disabled={sectionTranslationLoading === i}
                aria-label={`Translate ${s.title}`}
                className="px-3 py-1.5 rounded-lg border border-emerald-300 text-emerald-900 hover:bg-emerald-50 disabled:opacity-60 flex items-center justify-center flex-shrink-0 text-xs font-semibold bg-emerald-50/50"
              >
                {sectionTranslationLoading === i ? '…' : 'Translate'}
              </button>

              <button
                type="button"
                onClick={(event) => {
                  event.stopPropagation()
                  setExpanded(i)
                  playSectionAudio(i, s.steps)
                }}
                disabled={sectionAudioLoading === i}
                aria-label={`Listen to ${s.title}`}
                className="w-8 h-8 rounded-lg border border-emerald-300 text-emerald-900 hover:bg-emerald-50 disabled:opacity-60 flex items-center justify-center flex-shrink-0 bg-emerald-50/50"
              >
                {sectionAudioLoading === i ? '…' : <SpeakerIcon className="w-4 h-4" />}
              </button>

              <ChevronIcon className={`w-4 h-4 text-stone-400 transition-transform ${expanded === i ? 'rotate-180' : ''}`} />
            </div>

            {expanded === i && (
              <div className="px-4 pb-4 space-y-2.5 border-t border-stone-100 pt-3">
                {s.steps.map((step: string, j: number) => (
                  <div key={j} className="flex items-start gap-2.5 text-sm text-stone-700 leading-relaxed">
                    <span className="w-1.5 h-1.5 bg-emerald-600 rounded-full flex-shrink-0 mt-2" />
                    <span className="flex-1 break-words">{step}</span>
                  </div>
                ))}

                {i === 3 && (
                  <div className="mt-3 rounded-xl bg-amber-50 border border-amber-200 p-4 space-y-3">
                    <div>
                      <div className="text-xs font-bold text-amber-900 uppercase tracking-wide">
                        {tx('Treatment & Dosage', lang)}
                      </div>
                      <div className="text-[11px] text-amber-700 mt-0.5">
                        {tx('Advisory information — confirm the final treatment and dosage with the Extension Officer and current product label.', lang)}
                      </div>
                    </div>

                    {medicineRecommendations.length > 0 ? (
                      <div className="space-y-2">
                        {medicineRecommendations.map((item: any, medicineIndex: number) => (
                          <div
                            key={medicineIndex}
                            className="rounded-lg bg-white border border-amber-100 p-3"
                          >
                            <div className="text-sm font-semibold text-stone-900">
                              {item?.medicine || item?.name || item?.treatment || 'Recommended treatment'}
                            </div>

                            {(item?.dosage || item?.dose) && (
                              <div className="mt-1 text-sm text-stone-700">
                                <span className="font-semibold">{tx('Dosage:', lang)}</span>{' '}
                                {item?.dosage || item?.dose}
                              </div>
                            )}

                            {item?.application_method && (
                              <div className="mt-1 text-sm text-stone-700">
                                <span className="font-semibold">{tx('Application:', lang)}</span>{' '}
                                {item.application_method}
                              </div>
                            )}

                            {(item?.source || item?.source_url) && (
                              <div className="mt-2 text-[11px] text-stone-500 break-words">
                                <span className="font-semibold">{tx('Source:', lang)}</span>{' '}
                                {item?.source || item?.source_url}
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-sm text-stone-600">
                        {tx('No medicine recommendation is currently available for this condition.', lang)}
                      </div>
                    )}

                    {dosageValues.length > 0 && (
                      <div className="text-sm text-stone-700">
                        <span className="font-semibold">{tx('Advisory dosage:', lang)}</span>{' '}
                        {Array.from(new Set(dosageValues.map(String))).join(' · ')}
                      </div>
                    )}

                    {applicationMethodValues.length > 0 && (
                      <div className="text-sm text-stone-700">
                        <span className="font-semibold">{tx('Application method:', lang)}</span>{' '}
                        {Array.from(new Set(applicationMethodValues.map(String))).join(' · ')}
                      </div>
                    )}

                    {medicineRecommendations.some((item: any) => !item?.dosage && !item?.dose) && dosageValues.length === 0 && (
                      <div className="text-xs text-stone-500">
                        {tx('Dosage is not specified in the current advisory data.', lang)}
                      </div>
                    )}

                    {advisorySourceValues.length > 0 && (
                      <div className="text-[11px] text-stone-500 break-words">
                        <span className="font-semibold">{tx('Advisory source:', lang)}</span>{' '}
                        {Array.from(new Set(advisorySourceValues)).join(' · ')}
                      </div>
                    )}
                  </div>
                )}

                {sectionTranslations[i] && (
                  <div className="mt-3 rounded-lg bg-emerald-50/80 border border-emerald-200 p-3.5">
                    <div className="flex items-center justify-between gap-2 mb-1.5">
                      <div className="text-xs font-bold text-emerald-900">
                        Translation ({TRANSLATION_LANGUAGES.find(l => l.code === selectedIpmLang)?.label || selectedIpmLang})
                      </div>
                      {s.steps.length > 3 && (
                        <div className="text-[10px] text-stone-500 font-medium">{tx('3 points per translation', lang)}</div>
                      )}
                    </div>
                    <p className="text-sm text-stone-800 leading-relaxed whitespace-pre-wrap break-words">{sectionTranslations[i]}</p>
                  </div>
                )}

                {sectionTranslationError[i] && (
                  <p className="text-xs text-red-600 mt-2 font-medium">{sectionTranslationError[i]}</p>
                )}

                {sectionAudioUrls[i] && (
                  <audio
                    ref={(element) => { sectionAudioRefs.current[i] = element }}
                    controls
                    src={sectionAudioUrls[i]}
                    className="w-full mt-2.5 h-9"
                    onPlay={() => {
                      Object.entries(sectionAudioRefs.current).forEach(([key, audio]) => {
                        if (Number(key) !== i && audio) {
                          audio.pause()
                          audio.currentTime = 0
                        }
                      })
                    }}
                  />
                )}

                {sectionAudioError[i] && (
                  <p className="text-xs text-red-600 mt-2 font-medium">{sectionAudioError[i]}</p>
                )}
              </div>
            )}
          </div>
        ))}
      </div>


      <div className="bg-red-50 border border-red-200 rounded-xl p-4 mb-4">
        <h3 className="font-semibold text-red-800 text-sm mb-1">
          ⚠ Safe Input Use
        </h3>

        <p className="text-red-700 text-xs leading-relaxed">
          {advisory?.warning ||
            'Do not apply treatments without confirming the diagnosis. Follow locally approved agricultural guidance.'}
        </p>
      </div>

      {advisory?.referral && (
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 mb-4">
          <h3 className="font-semibold text-blue-800 text-sm mb-1">
            When to seek help
          </h3>

          <p className="text-blue-700 text-xs leading-relaxed">
            {advisory.referral}
          </p>
        </div>
      )}

      <button
        onClick={() => nav('expert-consultation')}
        className="w-full bg-green-700 hover:bg-green-600 text-white font-semibold py-3 rounded-lg transition-colors"
      >
        Contact Extension Expert
      </button>
    </div>
  )
}
function ExpertConsultation({ nav, submitted, setSubmitted, farmerId, fieldId, scanId, lang = 'en' }: {
  nav: (p: FarmerPage) => void
  submitted: boolean
  setSubmitted: (v: boolean) => void
  farmerId: string | null
  fieldId: string | null
  scanId: string | null
  lang?: Language
}) {
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [caseId, setCaseId] = useState<string | null>(null)

  const submitForExpertReview = async () => {
    if (!farmerId || !scanId) {
      setError('Your scan could not be linked to an expert case. Please return to the diagnosis and try again.')
      return
    }

    setSubmitting(true)
    setError('')
    try {
      const created = await createOfficerCase({
        farmerId,
        fieldId,
        scanId,
        priority: 'HIGH',
      })
      setCaseId(created.id)
      setSubmitted(true)
    } catch (e) {
      console.error('Expert case creation failed:', e)
      setError(e instanceof Error ? e.message : 'Could not submit the case for expert review.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="p-4 max-w-2xl mx-auto pb-4">
      <BackButton label="Back to Diagnosis Result" onClick={() => nav('diagnosis-result')} />
      <h1 className="text-xl font-semibold text-stone-900 mb-2">{tx('Get Expert Validation', lang)}</h1>
      <div className="bg-stone-100 rounded-lg px-3 py-2 text-sm text-stone-700 mb-4 inline-flex items-center gap-2">
        <span>🌾</span> {analysisResultLabel(scanId, lang)}
      </div>

      {!submitted ? (
        <>
          <div className="space-y-3 mb-5">
            {[
              { icon: '📋', key: 'Submit for Expert Review', title: tx('Submit for Expert Review', lang), desc: tx('An agricultural extension expert will review your case within 24–48 hours.', lang), action: submitForExpertReview },
              { icon: '📍', key: 'Find Nearby Extension Support', title: tx('Find Nearby Extension Support', lang), desc: tx('Locate extension offices and officers available in your area.', lang), action: () => { } },
              { icon: '🔬', key: 'Refer for Laboratory Diagnosis', title: tx('Refer for Laboratory Diagnosis', lang), desc: tx('Submit a plant sample to a certified laboratory for confirmation.', lang), action: () => { } },
            ].map((opt) => (
              <button key={opt.key} onClick={opt.action} disabled={opt.key === 'Submit for Expert Review' && submitting}
                className="w-full text-left bg-white border border-stone-200 rounded-xl p-4 hover:border-green-500 hover:bg-green-50 transition-all disabled:opacity-60">
                <div className="flex items-start gap-3">
                  <span className="text-xl">{opt.icon}</span>
                  <div>
                    <div className="font-semibold text-stone-800 text-sm mb-0.5">{opt.title}</div>
                    <div className="text-stone-500 text-xs leading-relaxed">{opt.key === 'Submit for Expert Review' && submitting ? tx('Submitting your case...', lang) : opt.desc}</div>
                  </div>
                </div>
              </button>
            ))}
          </div>
          {error && <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg p-3 text-xs mb-4">{error}</div>}
          <div className="bg-white border border-stone-200 rounded-xl p-4">
            <h3 className="font-semibold text-stone-800 text-sm mb-3">{tx('Case Review Timeline', lang)}</h3>
            <div className="flex items-center gap-2">
              {['Pending', 'Under Review', 'Validated'].map((s, i) => (
                <div key={s} className="flex items-center gap-2 flex-1">
                  <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 ${i === 0 ? 'bg-amber-500 text-white' : 'bg-stone-200 text-stone-400'}`}>
                    {i + 1}
                  </div>
                  <span className={`text-xs ${i === 0 ? 'text-amber-700 font-medium' : 'text-stone-400'}`}>{s}</span>
                  {i < 2 && <div className="flex-1 h-px bg-stone-200" />}
                </div>
              ))}
            </div>
          </div>
        </>
      ) : (
        <div className="bg-green-50 border border-green-200 rounded-2xl p-6 text-center">
          <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-3">
            <CheckIcon className="w-6 h-6 text-green-600" />
          </div>
          <h2 className="font-semibold text-green-800 mb-2">{tx('Case Submitted for Expert Review', lang)}</h2>
          <p className="text-green-700 text-sm leading-relaxed mb-4">{tx('An extension expert will review your case within 24–48 hours. You will receive a notification once completed.', lang)}</p>
          {caseId && <div className="text-[11px] text-green-700 mb-3">Case ID: {caseId.slice(0, 8).toUpperCase()}</div>}
          <div className="bg-white border border-green-200 rounded-lg p-3 text-left">
            <div className="text-xs text-stone-500 mb-1">{tx('Status', lang)}</div>
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 bg-amber-400 rounded-full animate-pulse" />
              <span className="text-sm font-medium text-amber-700">{tx('Pending Review', lang)}</span>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function analysisResultLabel(scanId: string | null, lang: Language) {
  return scanId ? tx('Current crop scan · Ready for expert review', lang) : tx('Current crop scan', lang)
}

function ReportCase({ nav, submitted, setSubmitted, lang = 'en' }: { nav: (p: FarmerPage) => void; submitted: boolean; setSubmitted: (v: boolean) => void; lang?: Language }) {
  const [form, setForm] = useState({ crop: 'Rice', symptoms: '', severity: 'Moderate', date: '', pestCount: '' })
  return (
    <div className="p-4 max-w-2xl mx-auto pb-4">
      <BackButton label="Back to Diagnosis Result" onClick={() => nav('diagnosis-result')} />
      <h1 className="text-xl font-semibold text-stone-900 mb-4">{tx('Report Crop Condition', lang)}</h1>

      {!submitted ? (
        <div className="space-y-4">
          <FormField label={tx('Crop', lang)}>
            <select value={form.crop} onChange={(e) => setForm({ ...form, crop: e.target.value })} className="w-full border border-stone-200 rounded-lg px-3 py-2.5 text-sm bg-white focus:outline-none focus:border-green-500">
              {['Rice', 'Wheat', 'Cotton', 'Maize', 'Potato', 'Tomato'].map((c) => <option key={c}>{c}</option>)}
            </select>
          </FormField>
          <FormField label={tx('Location', lang)}>
            <div className="border border-stone-200 rounded-lg px-3 py-2.5 bg-stone-50 text-sm text-stone-600 flex items-center gap-2">
              <PinIcon className="w-4 h-4 text-stone-400" /> Sanand, Gujarat
            </div>
          </FormField>
          <FormField label={tx('Observed Symptoms', lang)}>
            <textarea value={form.symptoms} onChange={(e) => setForm({ ...form, symptoms: e.target.value })}
              rows={3} placeholder={tx('Describe what you see on the plant...', lang)}
              className="w-full border border-stone-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-green-500 resize-none" />
          </FormField>
          <FormField label="Severity">
            <div className="flex gap-2">
              {['Low', 'Moderate', 'High'].map((s) => (
                <button key={s} onClick={() => setForm({ ...form, severity: s })}
                  className={`flex-1 py-2 rounded-lg text-sm font-medium border transition-colors ${form.severity === s
                    ? s === 'Low' ? 'bg-green-100 border-green-500 text-green-700'
                      : s === 'Moderate' ? 'bg-amber-100 border-amber-500 text-amber-700'
                        : 'bg-red-100 border-red-500 text-red-700'
                    : 'bg-white border-stone-200 text-stone-600'
                    }`}>{s}</button>
              ))}
            </div>
          </FormField>
          <FormField label="Date Observed">
            <input type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })}
              className="w-full border border-stone-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-green-500 bg-white" />
          </FormField>
          <FormField label="Photo Attachment">
            <div className="border border-stone-200 rounded-lg overflow-hidden">
              <img src={RICE_IMG} alt="Attached photo" className="w-full h-28 object-cover" />
              <div className="px-3 py-2 text-xs text-stone-500 bg-stone-50">rice_leaf_scan.jpg · Attached</div>
            </div>
          </FormField>
          <FormField label="Pest Trap Count (Optional)">
            <input type="number" value={form.pestCount} onChange={(e) => setForm({ ...form, pestCount: e.target.value })}
              placeholder="Number of pests trapped"
              className="w-full border border-stone-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-green-500 bg-white" />
          </FormField>
          <button onClick={() => setSubmitted(true)} className="w-full bg-green-700 hover:bg-green-600 text-white font-semibold py-3 rounded-lg transition-colors">
            Submit Field Report
          </button>
        </div>
      ) : (
        <div className="bg-green-50 border border-green-200 rounded-2xl p-6 text-center">
          <div className="text-4xl mb-3">✓</div>
          <h2 className="font-semibold text-green-800 text-lg mb-2">{tx('Report Submitted', lang)}</h2>
          <p className="text-green-700 text-sm leading-relaxed mb-4">{tx('Your observation has been added to the local crop-health monitoring system.', lang)}</p>
          <button onClick={() => nav('my-reports')} className="bg-green-700 hover:bg-green-600 text-white font-semibold px-6 py-2.5 rounded-lg text-sm transition-colors">
            View My Reports
          </button>
        </div>
      )}
    </div>
  )
}

function RiskForecast({ nav, lang = 'en' }: { nav: (p: FarmerPage) => void; lang?: Language }) {
  const days = [
    { day: 'Today', risk: 'Moderate', val: 68, color: 'amber' },
    { day: 'Tomorrow', risk: 'High', val: 82, color: 'red' },
    { day: 'Day 3', risk: 'High', val: 79, color: 'red' },
    { day: 'Day 4', risk: 'Moderate', val: 65, color: 'amber' },
    { day: 'Day 5', risk: 'Moderate', val: 60, color: 'amber' },
  ]
  return (
    <div className="p-4 max-w-2xl mx-auto pb-4">
      <BackButton label={t('backToHome', lang)} onClick={() => nav('home')} />
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-xl font-semibold text-stone-900">{t('riskForecastTitle', lang)}</h1>
        <div className="flex items-center gap-1 text-xs text-stone-400">
          <PinIcon className="w-3 h-3" /> {t('navLocation', lang)}
        </div>
      </div>

      {/* Gauge */}
      <div className="bg-white border border-stone-200 rounded-2xl p-5 mb-4 text-center">
        <div className="text-sm font-semibold text-amber-700 uppercase tracking-wide mb-1">{tx('Moderate Risk', lang)}</div>
        <div className="text-5xl font-bold text-stone-900 mb-1">68</div>
        <div className="text-stone-400 text-sm mb-4">/ 100</div>
        <div className="w-full bg-stone-100 rounded-full h-3 overflow-hidden mb-4">
          <div className="h-full rounded-full bg-gradient-to-r from-green-400 via-amber-400 to-red-500" style={{ width: '100%' }} />
        </div>
        <div className="relative w-full flex justify-center">
          <div className="absolute -top-7 flex flex-col items-center" style={{ left: '68%', transform: 'translateX(-50%)' }}>
            <div className="w-0.5 h-4 bg-stone-800 mx-auto" />
            <div className="text-xs font-bold text-stone-800 bg-white px-1 rounded">68</div>
          </div>
        </div>
        <p className="text-stone-600 text-sm leading-relaxed mt-2">
          {t('riskForecastSubtitle', lang)}
        </p>
      </div>

      {/* Factors */}
      <div className="bg-white border border-stone-200 rounded-xl p-4 mb-4">
        <h3 className="font-semibold text-stone-800 text-sm mb-3">{tx('Risk Factors', lang)}</h3>
        <div className="grid grid-cols-2 gap-3 mb-3">
          {[
            { label: t('temperature', lang), val: '29°C', icon: '🌡' },
            { label: t('humidity', lang), val: '78%', icon: '💧' },
            { label: t('rainfall', lang), val: '65%', icon: '🌧' },
            { label: 'Crop Stage', val: 'Flowering', icon: '🌸' },
          ].map((f) => (
            <div key={f.label} className="bg-stone-50 rounded-lg p-2.5">
              <div className="text-base mb-0.5">{f.icon}</div>
              <div className="text-xs text-stone-500">{f.label}</div>
              <div className="text-sm font-semibold text-stone-800">{f.val}</div>
            </div>
          ))}
        </div>
        <div className="flex items-center justify-between text-sm border-t border-stone-100 pt-3">
          <div><span className="text-stone-500">{tx('Recent Field Reports:', lang)}</span> <span className="font-semibold text-stone-800">12 nearby</span></div>
          <div><span className="text-stone-500">{tx('Pest Activity:', lang)}</span> <span className="font-semibold text-amber-700">{tx('Moderate', lang)}</span></div>
        </div>
      </div>

      {/* 5-day trend */}
      <div className="bg-white border border-stone-200 rounded-xl p-4 mb-4">
        <h3 className="font-semibold text-stone-800 text-sm mb-3">{tx('5-Day Risk Trend', lang)}</h3>
        <div className="space-y-2">
          {days.map((d) => (
            <div key={d.day} className="flex items-center gap-3">
              <span className="text-xs text-stone-500 w-16 flex-shrink-0">{d.day}</span>
              <div className="flex-1 bg-stone-100 rounded-full h-2 overflow-hidden">
                <div className={`h-full rounded-full ${d.color === 'red' ? 'bg-red-500' : 'bg-amber-400'}`} style={{ width: `${d.val}%` }} />
              </div>
              <span className={`text-xs font-medium w-16 text-right ${d.color === 'red' ? 'text-red-600' : 'text-amber-600'}`}>{d.risk}</span>
            </div>
          ))}
        </div>
      </div>

      <button onClick={() => nav('ipm-advisory')} className="w-full bg-green-700 hover:bg-green-600 text-white font-semibold py-3 rounded-lg transition-colors">
        View Preventive Actions
      </button>
    </div>
  )
}

const NEARBY_ALERTS = [
  { level: 'high', levelLabel: 'High Risk', crop: 'Cotton', issue: 'Cotton pest activity', dist: '4.2 km away', color: 'red', region: 'Viramgam Road area' },
  { level: 'moderate', levelLabel: 'Moderate Risk', crop: 'Rice', issue: 'Rice disease reports', dist: '7.8 km away', color: 'orange', region: 'Bavla Road area' },
  { level: 'moderate', levelLabel: 'Moderate Risk', crop: 'Vegetables', issue: 'Vegetable pest reports', dist: '10.4 km away', color: 'orange', region: 'Changodar area' },
]

function NearbyAlerts({ nav, setSelectedAlertIdx, lang = 'en' }: { nav: (p: FarmerPage) => void; setSelectedAlertIdx: (i: number) => void; lang?: Language }) {
  const [activeFilter, setActiveFilter] = useState('All')
  return (
    <div className="p-4 max-w-2xl mx-auto pb-4">
      <BackButton label={t('backToHome', lang)} onClick={() => nav('home')} />
      <h1 className="text-xl font-semibold text-stone-900 mb-1">{t('alertsTitle', lang)}</h1>
      <p className="text-stone-500 text-sm mb-4">{t('alertsSubtitle', lang)}</p>

      {/* Map visual */}
      <div className="relative bg-green-50 border border-green-200 rounded-2xl h-52 mb-4 overflow-hidden">
        {/* Grid lines */}
        <svg className="absolute inset-0 w-full h-full opacity-20" preserveAspectRatio="none">
          {[1, 2, 3].map((i) => <line key={`h${i}`} x1="0" y1={`${i * 25}%`} x2="100%" y2={`${i * 25}%`} stroke="#166534" strokeWidth="1" />)}
          {[1, 2, 3, 4].map((i) => <line key={`v${i}`} x1={`${i * 20}%`} y1="0" x2={`${i * 20}%`} y2="100%" stroke="#166534" strokeWidth="1" />)}
        </svg>
        {/* Road suggestions */}
        <svg className="absolute inset-0 w-full h-full opacity-10">
          <line x1="0" y1="50%" x2="100%" y2="50%" stroke="#166534" strokeWidth="4" />
          <line x1="40%" y1="0" x2="40%" y2="100%" stroke="#166534" strokeWidth="4" />
        </svg>
        {/* Alert markers */}
        <div className="absolute" style={{ left: '28%', top: '22%' }}>
          <div className="w-5 h-5 bg-red-500 rounded-full border-2 border-white shadow-lg cursor-pointer hover:scale-110 transition-transform" onClick={() => { setSelectedAlertIdx(0); nav('alert-details') }} />
          <div className="absolute top-6 left-1/2 -translate-x-1/2 bg-red-500 text-white text-xs px-1.5 py-0.5 rounded whitespace-nowrap shadow">{tx('High Risk', lang)}</div>
        </div>
        <div className="absolute" style={{ left: '68%', top: '55%' }}>
          <div className="w-5 h-5 bg-orange-400 rounded-full border-2 border-white shadow-lg cursor-pointer hover:scale-110 transition-transform" onClick={() => { setSelectedAlertIdx(1); nav('alert-details') }} />
          <div className="absolute top-6 left-1/2 -translate-x-1/2 bg-orange-400 text-white text-xs px-1.5 py-0.5 rounded whitespace-nowrap shadow">{tx('Moderate', lang)}</div>
        </div>
        <div className="absolute" style={{ left: '62%', top: '75%' }}>
          <div className="w-4 h-4 bg-orange-400 rounded-full border-2 border-white shadow-md cursor-pointer" onClick={() => { setSelectedAlertIdx(2); nav('alert-details') }} />
        </div>
        {/* You are here */}
        <div className="absolute" style={{ left: '47%', top: '47%' }}>
          <div className="w-4 h-4 bg-blue-600 rounded-full border-2 border-white shadow-lg" />
          <div className="absolute top-5 left-1/2 -translate-x-1/2 text-xs text-blue-800 font-semibold whitespace-nowrap">{tx('You', lang)}</div>
        </div>
        {/* Legend */}
        <div className="absolute bottom-2 right-2 flex gap-2 bg-white/80 rounded px-2 py-1">
          <div className="flex items-center gap-1"><div className="w-2 h-2 bg-red-500 rounded-full" /><span className="text-xs text-stone-600">{tx('High', lang)}</span></div>
          <div className="flex items-center gap-1"><div className="w-2 h-2 bg-orange-400 rounded-full" /><span className="text-xs text-stone-600">{tx('Moderate', lang)}</span></div>
          <div className="flex items-center gap-1"><div className="w-2 h-2 bg-green-500 rounded-full" /><span className="text-xs text-stone-600">{tx('Low', lang)}</span></div>
        </div>
      </div>

      {/* Filters */}
      <div className="flex gap-2 overflow-x-auto pb-2 mb-4 scrollbar-hide">
        {['All', 'High Risk', 'Moderate', 'Cotton', 'Rice', 'Vegetable'].map((f) => (
          <button key={f} onClick={() => setActiveFilter(f)}
            className={`flex-shrink-0 text-xs font-medium px-3 py-1.5 rounded-full border transition-colors ${activeFilter === f ? 'bg-green-700 border-green-700 text-white' : 'bg-white border-stone-200 text-stone-600 hover:border-stone-300'
              }`}>{f}</button>
        ))}
      </div>

      {/* Alert list */}
      <div className="space-y-3">
        {NEARBY_ALERTS.map((a, i) => (
          <button key={i} onClick={() => { setSelectedAlertIdx(i); nav('alert-details') }}
            className="w-full text-left bg-white border border-stone-200 rounded-xl p-4 hover:shadow-sm hover:border-stone-300 transition-all">
            <div className="flex items-start gap-3">
              <div className={`w-3 h-3 rounded-full flex-shrink-0 mt-1 ${a.color === 'red' ? 'bg-red-500' : 'bg-orange-400'}`} />
              <div className="flex-1 min-w-0">
                <div className={`text-xs font-bold uppercase mb-0.5 ${a.color === 'red' ? 'text-red-600' : 'text-orange-600'}`}>{a.levelLabel}</div>
                <div className="font-semibold text-stone-800 text-sm">{a.issue}</div>
                <div className="text-stone-500 text-xs mt-0.5">{a.region}</div>
              </div>
              <div className="text-xs text-stone-400 flex-shrink-0">{a.dist}</div>
            </div>
          </button>
        ))}
      </div>
    </div>
  )
}

function AlertDetails({ nav, idx, lang = 'en' }: { nav: (p: FarmerPage) => void; idx: number; lang?: Language }) {
  const a = NEARBY_ALERTS[idx] || NEARBY_ALERTS[0]
  return (
    <div className="p-4 max-w-2xl mx-auto pb-4">
      <BackButton label={t('backToAlerts', lang)} onClick={() => nav('alerts')} />
      <div className={`inline-flex items-center gap-1.5 text-xs font-bold uppercase px-2.5 py-1 rounded-full mb-3 ${a.color === 'red' ? 'bg-red-50 text-red-700' : 'bg-orange-50 text-orange-700'}`}>
        <span className={`w-2 h-2 rounded-full ${a.color === 'red' ? 'bg-red-500' : 'bg-orange-400'}`} />
        {a.levelLabel}
      </div>
      <h1 className="text-xl font-semibold text-stone-900 mb-1">{a.issue}</h1>
      <p className="text-stone-500 text-sm mb-4">{a.region} · {a.dist}</p>

      <div className="bg-white border border-stone-200 rounded-xl divide-y divide-stone-100 mb-4">
        {[
          { label: 'Crop Affected', val: a.crop },
          { label: 'Risk Level', val: a.levelLabel },
          { label: 'Distance', val: a.dist },
          { label: 'Reports in area', val: '12 reports' },
          { label: 'Confirmed cases', val: '5 confirmed' },
          { label: 'Last updated', val: '2 hours ago' },
        ].map((row) => (
          <div key={row.label} className="flex items-center justify-between px-4 py-3">
            <span className="text-sm text-stone-500">{row.label}</span>
            <span className="text-sm font-medium text-stone-800">{row.val}</span>
          </div>
        ))}
      </div>

      <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 mb-4">
        <h3 className="font-semibold text-amber-800 text-sm mb-1">{tx('Advisory', lang)}</h3>
        <p className="text-amber-700 text-sm leading-relaxed">Inspect your {a.crop.toLowerCase()} crop carefully over the next few days. Early detection is key. Contact your extension officer if you observe similar symptoms.</p>
      </div>

      <button onClick={() => nav('crop-selection')} className="w-full bg-green-700 hover:bg-green-600 text-white font-semibold py-3 rounded-lg transition-colors">
        Scan My Crop Now
      </button>
    </div>
  )
}

function MyReports({ nav, setSelectedReportIdx, lang = 'en' }: { nav: (p: FarmerPage) => void; setSelectedReportIdx: (i: number) => void; lang?: Language }) {
  const [scans, setScans] = useState<any[]>([])
  const [cases, setCases] = useState<any[]>([])
  const [responses, setResponses] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    ; (async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { setLoading(false); return }

      const [{ data: scanData, error: scanError }, { data: caseData, error: caseError }] = await Promise.all([
        supabase.from('crop_scans').select('*').eq('farmer_id', user.id).order('created_at', { ascending: false }),
        supabase.from('cases').select('*').eq('farmer_id', user.id).order('created_at', { ascending: false }),
      ])

      if (scanError) console.error('Could not load scans:', scanError)
      if (caseError) console.error('Could not load cases:', caseError)

      const loadedScans = scanData ?? []
      const loadedCases = caseData ?? []
      setScans(loadedScans)
      setCases(loadedCases)

      const caseIds = loadedCases.map((c: any) => c.id).filter(Boolean)
      if (caseIds.length > 0) {
        const { data: responseData, error: responseError } = await supabase
          .from('case_response')
          .select('*')
          .in('case_id', caseIds)
        if (responseError) console.error('Could not load officer responses:', responseError)
        setResponses(responseData ?? [])
      } else {
        setResponses([])
      }

      setLoading(false)
    })()
  }, [])

  const caseByScan = new Map(cases.map((c: any) => [c.scan_id, c]))
  const responseByCase = new Map(responses.map((r: any) => [r.case_id, r]))

  return (
    <div className="p-4 max-w-2xl mx-auto pb-4">
      <BackButton label={tx('Back to Home', lang)} onClick={() => nav('home')} />
      <h1 className="text-xl font-semibold text-stone-900 mb-1">{tx('My Crop Health History', lang)}</h1>
      <p className="text-stone-500 text-sm mb-4">{tx('AI scans, follow-up progress and expert cases.', lang)}</p>
      {loading ? <div className="text-sm text-stone-500">{tx('Loading your reports...', lang)}</div> : scans.length === 0 ? (
        <div className="bg-white border border-stone-200 rounded-xl p-6 text-center text-sm text-stone-500">{tx('No crop scans yet.', lang)}</div>
      ) : (
        <div className="space-y-3">
          {scans.map((r, i) => {
            const risk = String(r.risk || 'UNKNOWN')
            const caseRow = caseByScan.get(r.id)
            const officerResponse = caseRow ? responseByCase.get(caseRow.id) : null
            const finalReady = Boolean(officerResponse) || ['GUIDANCE_SENT', 'RESOLVED'].includes(String(caseRow?.status || ''))
            const pendingOfficer = Boolean(caseRow) && !finalReady
            return (
              <button key={r.id} onClick={() => { setSelectedReportIdx(i); nav('report-details') }}
                className="w-full text-left bg-white border border-stone-200 rounded-xl p-4 hover:shadow-sm hover:border-stone-300 transition-all">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="font-semibold text-stone-800 text-sm mb-1">{r.crop || 'Crop'} — {r.disease || 'No disease detected'}</div>
                    <div className="flex items-center gap-2 text-xs">
                      <span className="text-stone-500">Confidence: <span className="font-medium text-stone-700">{Number(r.confidence || 0).toFixed(2)}%</span></span>
                      <span className="text-stone-300">·</span>
                      <span className={`font-medium ${risk === 'HIGH' ? 'text-red-600' : risk === 'LOW' ? 'text-green-600' : 'text-amber-600'}`}>{risk} Risk</span>
                    </div>
                    <div className="text-xs text-stone-400 mt-1">{new Date(r.created_at).toLocaleString()}</div>
                    {pendingOfficer && <div className="text-xs text-amber-700 font-medium mt-2">{tx('Extension Officer Review · Pending', lang)}</div>}
                    {finalReady && <div className="text-xs text-green-700 font-semibold mt-2">{tx('✓ Final Officer Report Available', lang)}</div>}
                  </div>
                  <span className={`flex-shrink-0 text-xs font-medium px-2 py-0.5 rounded-full ${finalReady ? 'bg-green-100 text-green-700' : pendingOfficer ? 'bg-amber-100 text-amber-700' : 'bg-stone-100 text-stone-600'}`}>{finalReady ? 'Expert Report' : pendingOfficer ? 'Expert Case' : 'AI Scan'}</span>
                </div>
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}

function ReportDetails({ nav, idx, lang }: { nav: (p: FarmerPage) => void; idx: number; lang: Language }) {
  const [loading, setLoading] = useState(true)
  const [scan, setScan] = useState<any>(null)
  const [caseRow, setCaseRow] = useState<any>(null)
  const [validation, setValidation] = useState<any>(null)
  const [response, setResponse] = useState<any>(null)
  const [profile, setProfile] = useState<any>(null)
  const [field, setField] = useState<any>(null)
  const [crop, setCrop] = useState<any>(null)
  const [followup, setFollowup] = useState<any>(null)
  const [selectedReportLang, setSelectedReportLang] = useState<BhashiniLanguage>((lang as BhashiniLanguage) || 'gu')
  const [audioLoading, setAudioLoading] = useState(false)
  const [audioError, setAudioError] = useState('')
  const [audioUrl, setAudioUrl] = useState<string | null>(null)
  const [translationLoading, setTranslationLoading] = useState(false)
  const [translationError, setTranslationError] = useState('')
  const [translatedReport, setTranslatedReport] = useState<string | null>(null)
  const [gujaratiTranslationLoading, setGujaratiTranslationLoading] = useState(false)
  const [gujaratiTranslationError, setGujaratiTranslationError] = useState('')
  const [gujaratiReport, setGujaratiReport] = useState<string | null>(null)
  const [gujaratiAudioLoading, setGujaratiAudioLoading] = useState(false)
  const [gujaratiAudioError, setGujaratiAudioError] = useState('')
  const [gujaratiAudioUrl, setGujaratiAudioUrl] = useState<string | null>(null)
  const reportAudioRef = useRef<HTMLAudioElement | null>(null)
  const gujaratiAudioRef = useRef<HTMLAudioElement | null>(null)
  const pendingReportAudio = useRef<'report' | 'gujarati' | null>(null)

  const stopAllReportAudio = () => {
    ;[reportAudioRef.current, gujaratiAudioRef.current].forEach((audio) => {
      if (audio) {
        audio.pause()
        audio.currentTime = 0
      }
    })
  }

  useEffect(() => {
    const type = pendingReportAudio.current
    if (!type) return
    const audio = type === 'gujarati' ? gujaratiAudioRef.current : reportAudioRef.current
    const url = type === 'gujarati' ? gujaratiAudioUrl : audioUrl
    if (!audio || !url) return
    pendingReportAudio.current = null
    stopAllReportAudio()
    audio.src = url
    audio.currentTime = 0
    audio.play().catch((error) => {
      console.error('Report audio playback failed:', error)
    })
  }, [audioUrl, gujaratiAudioUrl])

  useEffect(() => {
    return () => {
      stopAllReportAudio()
      if (audioUrl) URL.revokeObjectURL(audioUrl)
      if (gujaratiAudioUrl) URL.revokeObjectURL(gujaratiAudioUrl)
    }
  }, [audioUrl, gujaratiAudioUrl])

  useEffect(() => {
    ; (async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { setLoading(false); return }
      const { data: scans } = await supabase.from('crop_scans').select('*').eq('farmer_id', user.id).order('created_at', { ascending: false })
      const selected = scans?.[idx]
      if (!selected) { setLoading(false); return }
      setScan(selected)

      const [p, f, c, ca] = await Promise.all([
        supabase.from('profiles').select('*').eq('id', user.id).single(),
        selected.field_id ? supabase.from('fields').select('*').eq('id', selected.field_id).single() : Promise.resolve({ data: null }),
        selected.field_id ? supabase.from('farmer_crops').select('*').eq('farmer_id', user.id).eq('field_id', selected.field_id).order('created_at', { ascending: false }).limit(1).maybeSingle() : Promise.resolve({ data: null }),
        supabase.from('cases').select('*').eq('farmer_id', user.id).eq('scan_id', selected.id).maybeSingle(),
      ])
      setProfile(p.data); setField(f.data); setCrop(c.data); setCaseRow(ca.data)

      if (ca.data) {
        const [v, rr] = await Promise.all([
          supabase.from('case_validation').select('*').eq('case_id', ca.data.id).order('created_at', { ascending: false }).limit(1).maybeSingle(),
          supabase.from('case_response').select('*').eq('case_id', ca.data.id).maybeSingle(),
        ])
        setValidation(v.data); setResponse(rr.data)
      }
      setLoading(false)
    })()
  }, [idx])

  const validated = validation?.validated_diagnosis || scan?.disease || 'Pending'
  const status = caseRow?.status || 'AI MONITORING'
  const showOfficerSections = Boolean(caseRow)

  const persistedAdvisory = scan?.advisory
  const aiIpmGuidance = (() => {
    if (!persistedAdvisory) return ''
    if (typeof persistedAdvisory === 'string') return persistedAdvisory

    const parts: string[] = []
    if (persistedAdvisory.title) parts.push(String(persistedAdvisory.title))
    if (persistedAdvisory.summary) parts.push(String(persistedAdvisory.summary))

    const addList = (label: string, value: any) => {
      if (Array.isArray(value) && value.length) {
        parts.push(`${label}: ${value.map((item: any) => String(item)).join(' • ')}`)
      } else if (typeof value === 'string' && value.trim()) {
        parts.push(`${label}: ${value}`)
      }
    }

    addList('Actions', persistedAdvisory.actions)
    addList('Prevention', persistedAdvisory.prevention)
    addList('Warning', persistedAdvisory.warning)
    addList('Referral', persistedAdvisory.referral)

    return parts.join('\n')
  })()

  const reportIpmGuidance = response?.ipm_guidance || aiIpmGuidance

  const buildReportText = () => [
    'AgriSense final report.',
    `Farmer information: Name ${profile?.name || 'not available'}. Contact ${profile?.phone || 'not available'}. Location ${[profile?.village, profile?.district].filter(Boolean).join(', ') || 'not available'}.`,
    `Field information: Area ${field?.area != null ? `${field.area} acres` : 'not available'}. Soil type ${field?.soil_type || 'not available'}. Irrigation ${field?.irrigation_type || 'not available'}.`,
    `Crop information: ${crop?.crop || scan?.crop || 'not available'}, variety ${crop?.variety || 'not available'}, season ${crop?.season || 'not available'}.`,
    `Disease diagnosis: ${scan?.disease || 'not available'}. Confidence ${Number(scan?.confidence || 0).toFixed(2)} percent. Risk ${scan?.risk || 'not available'}, score ${scan?.risk_score ?? 'not available'}.`,
    showOfficerSections ? `Officer validation: ${validation?.validation_status || 'pending'}. Validated diagnosis ${validated}. Officer notes ${validation?.notes || 'none'}.` : '',
    (showOfficerSections && response) || reportIpmGuidance ? `Recommendation and guidance: Treatment ${response?.treatment || 'not specified'}. Dosage ${response?.dosage || 'not specified'}. Application method ${response?.application_method || 'not specified'}. Weather guidance ${response?.weather_guidance || 'not specified'}. IPM guidance ${reportIpmGuidance || 'not specified'}. Policy and regulatory guidance ${response?.policy_regulatory_guidance || 'not specified'}. Additional agronomic advice ${response?.additional_advice || 'not specified'}.` : '',
    showOfficerSections && response ? `Government scheme: ${response.scheme_name || 'not specified'}. Benefits ${response.scheme_benefits || 'not specified'}. Eligibility ${response.scheme_eligibility || 'not specified'}. How to apply ${response.scheme_application || 'not specified'}.` : '',
    showOfficerSections && response ? `Contact and support: Regional office ${response.regional_office || 'not specified'}. Services ${response.services_info || 'not specified'}. Officer contact ${response.officer_contact || 'not specified'}. Officer email ${response.officer_email || 'not specified'}. Office address ${response.office_address || 'not specified'}.` : '',
    showOfficerSections && response ? `Follow-up information: Next follow-up ${response.next_followup_date || 'not specified'}. Monitor ${response.monitor_instructions || 'not specified'}. Contact officer if ${response.contact_officer_if || 'not specified'}. Important instructions ${response.important_instructions || 'not specified'}.` : '',
  ].filter(Boolean).join(' ')

  const translateReport = async () => {
    setTranslationLoading(true)
    setTranslationError('')
    try {
      const translated = await translateWithBhashini(buildReportText(), selectedReportLang)
      setTranslatedReport(translated)
    } catch (error) {
      console.error('Bhashini report translation failed:', error)
      setTranslationError(error instanceof Error ? error.message : 'Unable to translate the report.')
    } finally {
      setTranslationLoading(false)
    }
  }

  const translateReportToGujarati = async () => {
    setGujaratiTranslationLoading(true)
    setGujaratiTranslationError('')
    try {
      const translated = await translateWithBhashini(buildReportText(), 'gu')
      setGujaratiReport(translated)
    } catch (error) {
      console.error('Bhashini Gujarati report translation failed:', error)
      setGujaratiTranslationError(error instanceof Error ? error.message : 'Unable to translate the report to Gujarati.')
    } finally {
      setGujaratiTranslationLoading(false)
    }
  }

  const playReportAudioGujarati = async () => {
    stopAllReportAudio()
    pendingReportAudio.current = 'gujarati'
    setGujaratiAudioLoading(true)
    setGujaratiAudioError('')
    try {
      const reportText = buildReportText()
      const result = gujaratiReport
        ? await speakWithBhashini(gujaratiReport, 'gu', 'gu')
        : await speakWithBhashini(reportText, 'gu', 'en')
      const nextUrl = audioUrlFromBase64(result.audio_base64 || '')
      if (gujaratiAudioRef.current) {
        gujaratiAudioRef.current.pause()
        gujaratiAudioRef.current.currentTime = 0
      }
      if (gujaratiAudioUrl) URL.revokeObjectURL(gujaratiAudioUrl)
      setGujaratiAudioUrl(nextUrl)
    } catch (error) {
      console.error('Bhashini Gujarati report audio failed:', error)
      setGujaratiAudioError(error instanceof Error ? error.message : 'Unable to play the report in Gujarati.')
    } finally {
      setGujaratiAudioLoading(false)
    }
  }

  const downloadTranslatedReport = () => {
    if (!translatedReport) return
    const blob = new Blob([translatedReport], { type: 'text/plain;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const anchor = document.createElement('a')
    anchor.href = url
    anchor.download = `AgriSense_Final_Report_${selectedReportLang}.txt`
    document.body.appendChild(anchor)
    anchor.click()
    anchor.remove()
    URL.revokeObjectURL(url)
  }

  const playReportAudio = async () => {
    stopAllReportAudio()
    pendingReportAudio.current = 'report'
    setAudioLoading(true)
    setAudioError('')
    try {
      const reportText = buildReportText()
      const result = translatedReport
        ? await speakWithBhashini(translatedReport, selectedReportLang, selectedReportLang)
        : await speakWithBhashini(reportText, selectedReportLang, 'en')
      const nextUrl = audioUrlFromBase64(result.audio_base64 || '')
      if (reportAudioRef.current) {
        reportAudioRef.current.pause()
        reportAudioRef.current.currentTime = 0
      }
      if (audioUrl) URL.revokeObjectURL(audioUrl)
      setAudioUrl(nextUrl)
    } catch (error) {
      console.error('Bhashini report audio failed:', error)
      setAudioError(error instanceof Error ? error.message : 'Unable to play report audio.')
    } finally {
      setAudioLoading(false)
    }
  }

  if (loading) return <div className="p-4 max-w-2xl mx-auto text-sm text-stone-500">{tx('Loading report...', lang)}</div>
  if (!scan) return <div className="p-4 max-w-2xl mx-auto"><BackButton label="Back to My Reports" onClick={() => nav('my-reports')} /><div className="text-sm text-stone-500">{tx('Report not found.', lang)}</div></div>

  return (
    <div className="p-4 max-w-3xl mx-auto pb-6">
      <BackButton label="Back to My Reports" onClick={() => nav('my-reports')} />
      <div className="flex items-start justify-between gap-3 mb-4">
        <div><h1 className="text-xl font-bold text-stone-900">AGRISENSE REPORT</h1><p className="text-xs text-stone-500">Report generated {new Date(scan.created_at).toLocaleString()}</p></div>
        <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-800">{status}</span>
      </div>

      <div className="mb-5 space-y-3">
        <div className="rounded-xl border border-emerald-200 bg-emerald-50/70 p-4 shadow-2xs">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-3">
            <label htmlFor="report-lang-select" className="text-xs font-bold text-emerald-950 flex items-center gap-1.5">
              <span>🌐</span> Select Report Language (Translation & TTS):
            </label>
            <select
              id="report-lang-select"
              value={selectedReportLang}
              onChange={(e) => setSelectedReportLang(e.target.value as BhashiniLanguage)}
              className="text-xs font-semibold border border-emerald-300 rounded-lg px-3 py-1.5 bg-white text-emerald-950 focus:outline-none focus:ring-2 focus:ring-emerald-700"
            >
              {TRANSLATION_LANGUAGES.map((l) => (
                <option key={l.code} value={l.code}>
                  {l.label}
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            <button
              onClick={translateReport}
              disabled={translationLoading}
              className="flex items-center justify-center gap-2 bg-white border border-emerald-300 text-emerald-900 font-semibold py-2.5 px-3 rounded-lg hover:bg-emerald-100/60 disabled:opacity-60 transition-colors text-sm shadow-2xs"
            >
              <span>{translationLoading ? 'Translating…' : '🌐 Translate Report'}</span>
            </button>
            <button
              onClick={playReportAudio}
              disabled={audioLoading}
              className="flex items-center justify-center gap-2 bg-emerald-800 text-white font-semibold py-2.5 px-3 rounded-lg hover:bg-emerald-900 disabled:opacity-60 transition-colors text-sm shadow-xs"
            >
              <SpeakerIcon className="w-4 h-4" />
              <span>{audioLoading ? 'Preparing audio…' : '🔊 Play Report Audio'}</span>
            </button>
          </div>

          {translatedReport && !translationLoading && (
            <div className="mt-3.5 rounded-xl border border-emerald-200 bg-white p-4 shadow-2xs">
              <div className="text-xs font-bold text-emerald-800 mb-2 flex items-center justify-between">
                <span>Translated Report ({TRANSLATION_LANGUAGES.find(l => l.code === selectedReportLang)?.label || selectedReportLang})</span>
              </div>
              <p className="text-sm text-stone-800 whitespace-pre-wrap leading-relaxed max-h-72 overflow-y-auto break-words">{translatedReport}</p>
              <button
                onClick={downloadTranslatedReport}
                className="mt-3 w-full border border-emerald-700 text-emerald-800 font-semibold py-2 rounded-lg hover:bg-emerald-50 transition-colors text-sm"
              >
                ⬇️ Download Translated Report
              </button>
            </div>
          )}

          {translationError && <p className="text-xs text-red-600 mt-2 font-medium">{translationError}</p>}
          {audioError && <p className="text-xs text-red-600 mt-2 font-medium">{audioError}</p>}

          {audioUrl && (
            <div className="mt-3 bg-white p-2 rounded-lg border border-emerald-200">
              <audio
                ref={reportAudioRef}
                controls
                src={audioUrl}
                className="w-full h-9"
              />
            </div>
          )}
        </div>
      </div>


      <div className="space-y-3">
        <ReportSection title="1. Farmer Information">
          <ReportRow label={tx('Name', lang)} value={profile?.name || '—'} />
          <ReportRow label="Contact Number" value={profile?.phone || '—'} />
          <ReportRow label={tx('Village / District', lang)} value={[profile?.village, profile?.district].filter(Boolean).join(' / ') || '—'} />
          <ReportRow label="Farmer ID" value={profile?.id ? `AG-${String(profile.id).slice(0, 8).toUpperCase()}` : '—'} />
        </ReportSection>

        <ReportSection title="2. Field Information">
          <ReportRow label={tx('Location', lang)} value={[profile?.village, profile?.district, profile?.state].filter(Boolean).join(', ') || '—'} />
          <ReportRow label={tx('Area', lang)} value={field?.area != null ? `${field.area} acres` : '—'} />
          <ReportRow label="Soil Type" value={field?.soil_type || '—'} />
          <ReportRow label="Irrigation Type" value={field?.irrigation_type || '—'} />
        </ReportSection>

        <ReportSection title="3. Crop Information">
          <ReportRow label={tx('Crop', lang)} value={crop?.crop || scan.crop || '—'} />
          <ReportRow label={tx('Variety', lang)} value={crop?.variety || '—'} />
          <ReportRow label={tx('Sowing Date', lang)} value={crop?.sowing_date || '—'} />
          <ReportRow label="Season" value={crop?.season || '—'} />
        </ReportSection>

        <ReportSection title="4. Disease Diagnosis">
          <ReportRow label={tx('AI Diagnosis', lang)} value={scan.disease || '—'} />
          <ReportRow label="Confidence Score" value={`${Number(scan.confidence || 0).toFixed(2)}%`} />
          <ReportRow label="Risk Level" value={`${scan.risk || '—'} (${scan.risk_score ?? '—'}/100)`} />
          <ReportRow label={tx('Observed Symptoms', lang)} value="See uploaded crop image and AI assessment." />
          <ReportRow label="Affected Parts" value="AI image assessment" />
        </ReportSection>

        {showOfficerSections && <>
          <ReportSection title="5. Officer Validation">
            <ReportRow label="Validation Status" value={validation?.validation_status || 'Pending'} />
            <ReportRow label={tx('Validated Diagnosis', lang)} value={validated} />
            <ReportRow label={tx('Officer Notes', lang)} value={validation?.notes || '—'} />
            <ReportRow label="Validation Date" value={validation?.created_at ? new Date(validation.created_at).toLocaleDateString() : '—'} />
          </ReportSection>

          <ReportSection title="6. Recommendation & Guidance">
            <ReportRow label={tx('Pesticide / Treatment', lang)} value={response?.treatment || '—'} />
            <ReportRow label="Dosage" value={response?.dosage || '—'} />
            <ReportRow label={tx('Application Method', lang)} value={response?.application_method || '—'} />
            <ReportRow label={tx('Weather-based Guidance', lang)} value={response?.weather_guidance || '—'} />
            <ReportRow label="IPM Guidance" value={reportIpmGuidance || '—'} />
            <ReportRow label="Policy / Regulatory Guidance" value={response?.policy_regulatory_guidance || '—'} />
            <ReportRow label={tx('Additional Agronomic Advice', lang)} value={response?.additional_advice || '—'} />
          </ReportSection>

          <ReportSection title="7. Government Scheme">
            <ReportRow label={tx('Scheme Name', lang)} value={response?.scheme_name || '—'} />
            <ReportRow label={tx('Benefits', lang)} value={response?.scheme_benefits || '—'} />
            <ReportRow label={tx('Eligibility', lang)} value={response?.scheme_eligibility || '—'} />
            <ReportRow label={tx('How to Apply', lang)} value={response?.scheme_application || '—'} />
          </ReportSection>

          <ReportSection title="8. Contact & Support Info">
            <ReportRow label={tx('Regional Office', lang)} value={response?.regional_office || '—'} />
            <ReportRow label={tx('Services', lang)} value={response?.services_info || '—'} />
            <ReportRow label={tx('Officer Contact', lang)} value={response?.officer_contact || '—'} />
            <ReportRow label={tx('Officer Email', lang)} value={response?.officer_email || '—'} />
            <ReportRow label={tx('Office Address', lang)} value={response?.office_address || '—'} />
          </ReportSection>

          <ReportSection title="9. Follow-up Information">
            <ReportRow label="Next Follow-up" value={response?.next_followup_date || '—'} />
            <ReportRow label={tx('What to Monitor', lang)} value={response?.monitor_instructions || '—'} />
            <ReportRow label={tx('When to Contact Officer', lang)} value={response?.contact_officer_if || '—'} />
            <ReportRow label={tx('Important Instructions', lang)} value={response?.important_instructions || '—'} />
          </ReportSection>
        </>}

        {!showOfficerSections && (
          <ReportSection title="6. Recommendation & Guidance">
            <ReportRow label="IPM Guidance" value={reportIpmGuidance || '—'} />
          </ReportSection>
        )}
      </div>

      {showOfficerSections && !response && (
        <div className="mt-4 bg-amber-50 border border-amber-200 rounded-xl p-4">
          <div className="font-semibold text-amber-800 text-sm">{tx('Extension Officer Review Pending', lang)}</div>
          <p className="text-xs text-amber-700 mt-1">{tx('Your case has been sent to an Extension Officer. The final expert guidance, IPM, policy/regulatory advice, scheme and follow-up sections will appear here after the officer submits the response.', lang)}</p>
        </div>
      )}

      {!showOfficerSections && (
        <div className="mt-4 bg-green-50 border border-green-200 rounded-xl p-4">
          <div className="font-semibold text-green-800 text-sm">{tx('AI Follow-up Active', lang)}</div>
          <p className="text-xs text-green-700 mt-1">{tx('This report is currently in the 5-day AI monitoring loop. If the crop deteriorates or fails to improve by Day 5, it will be escalated to an Extension Officer.', lang)}</p>
          <button onClick={() => nav('ai-followup')} className="mt-3 w-full bg-green-700 text-white font-semibold py-2.5 rounded-lg text-sm">{tx('Open 5-Day Follow-up', lang)}</button>
        </div>
      )}
    </div>
  )
}

function ReportSection({ title, children }: { title: string; children: React.ReactNode }) {
  return <div className="bg-white border border-stone-200 rounded-xl overflow-hidden"><div className="px-4 py-2.5 bg-stone-50 border-b border-stone-100"><h3 className="text-sm font-semibold text-stone-800">{title}</h3></div><div>{children}</div></div>
}

function ReportRow({ label, value }: { label: string; value: string }) {
  return <div className="flex flex-col sm:flex-row sm:items-start gap-1 sm:gap-4 px-4 py-2.5 border-b border-stone-50 last:border-0"><span className="text-xs text-stone-500 sm:w-40 flex-shrink-0">{label}</span><span className="text-sm font-medium text-stone-800 break-words">{value}</span></div>
}

function AIFollowup({ nav, followup, scans, setFollowup, setScans, farmerContext, lang = 'en' }: {
  nav: (p: FarmerPage) => void
  followup: any
  scans: any[]
  setFollowup: (v: any) => void
  setScans: (v: any[]) => void
  farmerContext: any
  lang?: Language
}) {
  const [file, setFile] = useState<File | null>(null)
  const [preview, setPreview] = useState<string | null>(null)
  const [notes, setNotes] = useState('')
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState('')

  if (!followup) {
    return <div className="p-4 max-w-2xl mx-auto"><BackButton label="Back to Diagnosis Result" onClick={() => nav('diagnosis-result')} /><div className="bg-white border border-stone-200 rounded-xl p-6 text-center text-sm text-stone-500">{tx('No active 5-day AI follow-up found.', lang)}</div></div>
  }

  const completedDays = scans.length
  const nextDay = Math.min(completedDays + 1, 5)
  const previousScan = scans[scans.length - 1]
  const allDone = completedDays >= 5

  const handleScan = async () => {
    if (!file || !farmerContext?.userId) return
    setBusy(true); setMessage('')
    try {
      const form = new FormData()
      form.append('scan_mode', 'disease')
      form.append('file', file)
      form.append('farmer_id', farmerContext.userId)
      if (farmerContext.field?.id) form.append('field_id', farmerContext.field.id)
      if (farmerContext.crop?.crop) form.append('selected_crop', farmerContext.crop.crop)
      form.append('temperature', '28'); form.append('humidity', '84'); form.append('rainfall', '12'); form.append('pest_count', '18')

      const res = await fetch('http://127.0.0.1:8000/analyze', { method: 'POST', body: form })
      if (!res.ok) throw new Error(`Follow-up analysis failed (${res.status})`)
      const data = await res.json()
      const score = Number(data.risk?.score ?? 0)
      const prevScore = Number(previousScan?.risk_score ?? data.risk?.score ?? 0)
      const progression = progressionFromScores(previousScan ? prevScore : null, score)
      const row = await saveAiFollowupScan({ followupId: followup.id, dayNumber: nextDay, scanId: data.scan_id, progression, notes })
      const nextScans = [...scans, { ...row, risk_score: score, risk: data.risk?.risk, disease: data.prediction?.disease }]
      setScans(nextScans)

      const shouldEscalate = progression === 'DETERIORATING' || (nextDay === 5 && progression !== 'IMPROVING')
      if (shouldEscalate) {
        const caseRow = await createOfficerCase({
          farmerId: farmerContext.userId,
          fieldId: farmerContext.field?.id,
          scanId: data.scan_id,
          priority: progression === 'DETERIORATING' ? 'HIGH' : 'MEDIUM',
        })
        const updated = await updateAiFollowup(followup.id, { current_day: nextDay, status: 'ESCALATED', progression, latest_scan_id: data.scan_id, notes: `Escalated to officer after Day ${nextDay}: ${progression}.` })
        setFollowup(updated)
        setMessage(`Day ${nextDay} complete. AI detected ${progression.toLowerCase()} progression. Case ${caseRow.id.slice(0, 8)} has been sent to the Extension Officer.`)
      } else if (nextDay === 5) {
        const updated = await updateAiFollowup(followup.id, { current_day: 5, status: 'COMPLETED', progression, latest_scan_id: data.scan_id, notes: 'Five-day AI monitoring completed with improvement.' })
        setFollowup(updated)
        setMessage('5-day AI monitoring completed. The crop is improving, so no officer escalation was required.')
      } else {
        const updated = await updateAiFollowup(followup.id, { current_day: nextDay, status: 'IN_PROGRESS', progression, latest_scan_id: data.scan_id })
        setFollowup(updated)
        setMessage(`Day ${nextDay} complete. AI progression: ${progression}. Continue the recommended management and scan again tomorrow.`)
      }
      setFile(null); setPreview(null); setNotes('')
    } catch (e) {
      setMessage(e instanceof Error ? e.message : 'Could not save follow-up scan.')
    } finally { setBusy(false) }
  }

  return (
    <div className="p-4 max-w-2xl mx-auto pb-6">
      <BackButton label="Back to Diagnosis Result" onClick={() => nav('diagnosis-result')} />
      <div className="flex items-center justify-between mb-1"><h1 className="text-xl font-semibold text-stone-900">{tx('5-Day AI Follow-up', lang)}</h1><span className="text-xs font-semibold bg-green-100 text-green-700 px-2 py-1 rounded-full">Day {Math.min(followup.current_day, 5)} / 5</span></div>
      <p className="text-stone-500 text-sm mb-4">{tx('AI tracks crop progression before deciding whether expert escalation is needed.', lang)}</p>

      <div className="bg-white border border-stone-200 rounded-xl p-4 mb-4">
        <div className="grid grid-cols-5 gap-2">
          {[1, 2, 3, 4, 5].map(day => {
            const item = scans.find(x => Number(x.day_number) === day)
            const active = day === nextDay && !allDone && followup.status !== 'ESCALATED'
            return <div key={day} className={`rounded-lg p-2 text-center border ${item ? 'bg-green-50 border-green-200' : active ? 'bg-amber-50 border-amber-300' : 'bg-stone-50 border-stone-200'}`}><div className="text-xs text-stone-500">Day {day}</div><div className="text-lg mt-1">{item ? '✓' : active ? '●' : '○'}</div><div className="text-[10px] text-stone-500 mt-1">{item?.progression || (active ? 'Scan' : 'Pending')}</div></div>
          })}
        </div>
      </div>

      {followup.status === 'ESCALATED' && <div className="bg-red-50 border border-red-200 rounded-xl p-4 mb-4"><div className="font-semibold text-red-800 text-sm">{tx('Extension Officer Escalation', lang)}</div><p className="text-xs text-red-700 mt-1">{tx('AI determined that expert intervention is required based on crop deterioration or lack of improvement.', lang)}</p><button onClick={() => nav('my-reports')} className="mt-3 w-full bg-red-600 text-white font-semibold py-2.5 rounded-lg text-sm">{tx('View My Case', lang)}</button></div>}

      {followup.status !== 'ESCALATED' && followup.status !== 'COMPLETED' && (
        <div className="bg-white border border-stone-200 rounded-xl p-4 space-y-3">
          <h3 className="font-semibold text-stone-800 text-sm">{tx('Record Day', lang)} {nextDay} {tx('Scan', lang)}</h3>
          <label className="block border-2 border-dashed border-stone-300 rounded-xl p-5 text-center cursor-pointer hover:border-green-400"><div className="text-2xl mb-1">📷</div><div className="text-sm font-medium text-stone-700">Upload today's crop image</div><div className="text-xs text-stone-400 mt-1">{tx('AI will compare it with the previous scan', lang)}</div><input type="file" accept="image/*" className="hidden" onChange={e => { const f = e.target.files?.[0]; if (!f) return; setFile(f); setPreview(URL.createObjectURL(f)) }} /></label>
          {preview && <img src={preview} alt="Follow-up crop" className="w-full h-44 object-cover rounded-xl" />}
          <textarea value={notes} onChange={e => setNotes(e.target.value)} rows={2} placeholder={tx('Optional observations...', lang)} className="w-full border border-stone-200 rounded-lg px-3 py-2.5 text-sm resize-none" />
          <button disabled={!file || busy} onClick={handleScan} className="w-full bg-green-700 disabled:bg-stone-300 text-white font-semibold py-3 rounded-lg">{busy ? tx('Analyzing follow-up...', lang) : `${tx('Analyze Day', lang)} ${nextDay} ${tx('Scan', lang)}`}</button>
        </div>
      )}

      {followup.status === 'COMPLETED' && <div className="bg-green-50 border border-green-200 rounded-xl p-5 text-center"><div className="text-3xl mb-2">🌱</div><div className="font-semibold text-green-800">{tx('5-Day Monitoring Complete', lang)}</div><p className="text-xs text-green-700 mt-1">{tx('The crop improved during AI monitoring. Continue the recommended management practices.', lang)}</p></div>}
      {message && <div className="mt-4 bg-blue-50 border border-blue-200 rounded-xl p-4 text-sm text-blue-800">{message}</div>}
    </div>
  )
}

function FarmerProfile({ nav, lang, setLang }: { nav: (p: FarmerPage) => void; lang: Language; setLang: (l: Language) => void }) {
  const { navigate: globalNav } = useAppNav()
  return (
    <div className="p-4 max-w-2xl mx-auto pb-4">
      <BackButton label={tx('Back to Home', lang)} onClick={() => nav('home')} />
      <h1 className="text-xl font-semibold text-stone-900 mb-4">{tx('My Profile', lang)}</h1>

      {/* Avatar */}
      <div className="flex items-center gap-4 mb-6">
        <div className="w-16 h-16 bg-green-700 rounded-full flex items-center justify-center text-white text-2xl font-bold">RJ</div>
        <div>
          <div className="font-semibold text-stone-900">Ramesh Jadav</div>
          <div className="text-stone-500 text-sm">Sanand, Gujarat</div>
          <div className="text-green-600 text-xs mt-0.5">Farmer ID: AG-F-1042</div>
        </div>
      </div>

      <div className="space-y-3">
        <ProfileSection title={tx('Personal Information', lang)}>
          <ProfileRow label={tx('Name', lang)} val="Ramesh Jadav" />
          <ProfileRow label={tx('Location', lang)} val="Sanand, Gujarat" />
          <ProfileRow label="Village" val="Sanand Taluka" />
          <ProfileRow label="Land Size" val="4.5 acres" />
        </ProfileSection>

        <ProfileSection title={tx('Crop Preferences', lang)}>
          <div className="flex flex-wrap gap-2 px-4 pb-3">
            {['Rice', 'Cotton', 'Wheat'].map((c) => (
              <span key={c} className="text-xs bg-green-100 text-green-700 px-2.5 py-1 rounded-full font-medium">{c}</span>
            ))}
          </div>
        </ProfileSection>

        <ProfileSection title={tx('Language', lang)}>
          <div className="flex gap-2 px-4 pb-3">
            {(['en', 'hi', 'gu'] as Language[]).map((l) => (
              <button key={l} onClick={() => setLang(l)}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium border transition-colors ${lang === l ? 'bg-green-700 border-green-700 text-white' : 'bg-white border-stone-200 text-stone-600'}`}>
                {l === 'en' ? 'English' : l === 'hi' ? 'हिंदी' : 'ગુજરાતી'}
              </button>
            ))}
          </div>
        </ProfileSection>

        <ProfileSection title={tx('Notification Settings', lang)}>
          {[
            { label: 'High Risk Alerts', on: true },
            { label: 'Weather Advisories', on: true },
            { label: 'Expert Case Updates', on: true },
            { label: 'Weekly Summary', on: false },
          ].map((n) => (
            <div key={n.label} className="flex items-center justify-between px-4 py-3 border-b border-stone-50 last:border-0">
              <span className="text-sm text-stone-700">{n.label}</span>
              <div className={`w-10 h-5 rounded-full transition-colors ${n.on ? 'bg-green-500' : 'bg-stone-200'} relative`}>
                <div className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${n.on ? 'translate-x-5' : 'translate-x-0.5'}`} />
              </div>
            </div>
          ))}
        </ProfileSection>

        <button
          onClick={async () => { await supabase.auth.signOut(); globalNav('landing') }}
          className="w-full bg-red-50 hover:bg-red-100 text-red-700 font-semibold py-3 rounded-xl border border-red-200 transition-colors text-sm flex items-center justify-center gap-2 mt-4"
        >
          <LogoutIcon className="w-4 h-4" />
          <span>{tx('Logout & Return to Home', lang)}</span>
        </button>
      </div>
    </div>
  )
}

// ────────────────────────── SHARED COMPONENTS ──────────────────────────

function BackButton({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <button onClick={onClick} className="flex items-center gap-1.5 text-green-700 hover:text-green-600 text-sm font-medium mb-4 transition-colors">
      <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="m15 18-6-6 6-6" /></svg>
      {label}
    </button>
  )
}

function ProfileSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bg-white border border-stone-200 rounded-xl overflow-hidden">
      <div className="px-4 py-2.5 bg-stone-50 border-b border-stone-100">
        <h3 className="text-xs font-semibold uppercase tracking-wide text-stone-500">{title}</h3>
      </div>
      {children}
    </div>
  )
}

function ProfileRow({ label, val }: { label: string; val: string }) {
  return (
    <div className="flex items-center justify-between px-4 py-3 border-b border-stone-50 last:border-0">
      <span className="text-sm text-stone-500">{label}</span>
      <span className="text-sm font-medium text-stone-800">{val}</span>
    </div>
  )
}

function FormField({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-sm font-medium text-stone-700 mb-1.5">{label}</label>
      {children}
    </div>
  )
}

// ────────────────────────── DATA & ICONS ──────────────────────────

const NOTIFICATIONS = [
  { type: 'high', label: 'High Risk Alert', msg: 'High disease activity detected near your location in Sanand area.', time: '2 hours ago' },
  { type: 'weather', label: 'Weather Advisory', msg: 'Humidity and rainfall conditions may increase fungal disease risk over next 3 days.', time: '5 hours ago' },
  { type: 'expert', label: 'Expert Update', msg: 'Your submitted crop report (Rice — Leaf Blast) has been reviewed by an officer.', time: 'Yesterday' },
]

const CROP_EMOJIS: Record<string, string> = {
  Rice: '🌾',
  Wheat: '🌾',
  Cotton: '☁️',
  Maize: '🌽',
  Potato: '🥔',
  Tomato: '🍅',
  Chilli: '🌶️',
  Groundnut: '🥜',
  "I don't know": '❓',
}


const SIDEBAR_ITEMS = [
  { key: 'home', page: 'home', icon: <HomeIcon className="w-4 h-4" /> },
  { key: 'scan', page: 'crop-selection', icon: <ScanIcon className="w-4 h-4" /> },
  { key: 'risk', page: 'risk', icon: <ShieldIcon className="w-4 h-4" /> },
  { key: 'alerts', page: 'alerts', icon: <BellIcon className="w-4 h-4" /> },
  { key: 'profile', page: 'profile', icon: <UserIcon className="w-4 h-4" /> },
]

// Icon components
function HomeIcon({ className }: { className?: string }) {
  return <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" /><polyline points="9 22 9 12 15 12 15 22" /></svg>
}
function ScanIcon({ className }: { className?: string }) {
  return <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 7V5a2 2 0 0 1 2-2h2" /><path d="M17 3h2a2 2 0 0 1 2 2v2" /><path d="M21 17v2a2 2 0 0 1-2 2h-2" /><path d="M7 21H5a2 2 0 0 1-2-2v-2" /><line x1="3" y1="12" x2="21" y2="12" /></svg>
}
function ShieldIcon({ className }: { className?: string }) {
  return <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" /></svg>
}
function BellIcon({ className }: { className?: string }) {
  return <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" /><path d="M13.73 21a2 2 0 0 1-3.46 0" /></svg>
}
function UserIcon({ className }: { className?: string }) {
  return <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" /></svg>
}
function LeafIcon({ className }: { className?: string }) {
  return <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 20A7 7 0 0 1 9.8 6.1C15.5 5 17 4.48 19 2c1 2 2 4.18 2 8 0 5.5-4.78 10-10 10Z" /><path d="M2 21c0-3 1.85-5.36 5.08-6C9.5 14.52 12 13 13 12" /></svg>
}
function PinIcon({ className }: { className?: string }) {
  return <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z" /><circle cx="12" cy="10" r="3" /></svg>
}
function MapPinIcon({ className }: { className?: string }) {
  return <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z" /><circle cx="12" cy="10" r="3" /></svg>
}
function ReportIcon({ className }: { className?: string }) {
  return <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><polyline points="14 2 14 8 20 8" /><line x1="16" y1="13" x2="8" y2="13" /><line x1="16" y1="17" x2="8" y2="17" /><polyline points="10 9 9 9 8 9" /></svg>
}
function CameraIcon({ className }: { className?: string }) {
  return <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" /><circle cx="12" cy="13" r="4" /></svg>
}
function UploadIcon({ className }: { className?: string }) {
  return <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="16 16 12 12 8 16" /><line x1="12" y1="12" x2="12" y2="21" /><path d="M20.39 18.39A5 5 0 0 0 18 9h-1.26A8 8 0 1 0 3 16.3" /></svg>
}
function SearchIcon({ className }: { className?: string }) {
  return <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" /></svg>
}
function ChevronIcon({ className }: { className?: string }) {
  return <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 12 15 18 9" /></svg>
}
function CheckIcon({ className }: { className?: string }) {
  return <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg>
}
function ThermometerIcon({ className }: { className?: string }) {
  return <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 14.76V3.5a2.5 2.5 0 0 0-5 0v11.26a4.5 4.5 0 1 0 5 0z" /></svg>
}
function DropletIcon({ className }: { className?: string }) {
  return <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2.69l5.66 5.66a8 8 0 1 1-11.31 0z" /></svg>
}
function RainIcon({ className }: { className?: string }) {
  return <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="16" y1="13" x2="16" y2="21" /><line x1="8" y1="13" x2="8" y2="21" /><line x1="12" y1="15" x2="12" y2="23" /><path d="M20 16.58A5 5 0 0 0 18 7h-1.26A8 8 0 1 0 4 15.25" /></svg>
}
function WindIcon({ className }: { className?: string }) {
  return <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9.59 4.59A2 2 0 1 1 11 8H2m10.59 11.41A2 2 0 1 0 14 16H2m15.73-8.27A2.5 2.5 0 1 1 19.5 12H2" /></svg>
}
function SpeakerIcon({ className }: { className?: string }) {
  return <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" /><path d="M15.54 8.46a5 5 0 0 1 0 7.07" /><path d="M19.07 4.93a10 10 0 0 1 0 14.14" /></svg>
}
function LogoutIcon({ className }: { className?: string }) {
  return <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" /><polyline points="16 17 21 12 16 7" /><line x1="21" y1="12" x2="9" y2="12" /></svg>
}
function SproutIcon({ className }: { className?: string }) {
  return <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M7 20h10" /><path d="M12 20v-8" /><path d="M12 12c-3 0-5-2.5-5-6 3.5 0 6 2.5 6 6" /><path d="M12 12c3 0 5-2.5 5-6-3.5 0-6 2.5-6 6" /></svg>
}
function GlobeIcon({ className }: { className?: string }) {
  return <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10" /><path d="M12 2a14.5 14.5 0 0 0 0 20 14.5 14.5 0 0 0 0-20" /><path d="M2 12h20" /></svg>
}
function DownloadIcon({ className }: { className?: string }) {
  return <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="7 10 12 15 17 10" /><line x1="12" y1="15" x2="12" y2="3" /></svg>
}
function MicroscopeIcon({ className }: { className?: string }) {
  return <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M6 18h8" /><path d="M3 22h18" /><path d="M14 22a7 7 0 1 0-14 0" /><path d="M9 14h2" /><path d="M9 12a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v4a2 2 0 0 1-2 2" /><path d="M12 6V3" /></svg>
}
function FileTextIcon({ className }: { className?: string }) {
  return <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z" /><polyline points="14 2 14 8 20 8" /><line x1="16" y1="13" x2="8" y2="13" /><line x1="16" y1="17" x2="8" y2="17" /><line x1="10" y1="9" x2="8" y2="9" /></svg>
}
function CheckCircleIcon({ className }: { className?: string }) {
  return <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" /><polyline points="22 4 12 14.01 9 11.01" /></svg>
}
function AlertTriangleIcon({ className }: { className?: string }) {
  return <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z" /><line x1="12" y1="9" x2="12" y2="13" /><line x1="12" y1="17" x2="12.01" y2="17" /></svg>
}

