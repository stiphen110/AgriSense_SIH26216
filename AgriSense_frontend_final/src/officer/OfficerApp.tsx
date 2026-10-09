import { useEffect, useState } from 'react'
import { useAppNav } from '../App'
import { supabase } from '../lib/supabase'
import { t, type AppLanguage } from '../lib/i18n'
import { tx } from '../lib/uiText'

type OfficerPage =
  | 'dashboard' | 'regional-heat-map' | 'focused-area'
  | 'validation' | 'case-validation' | 'alerts' | 'alert-detail'
  | 'reports' | 'profile'

const DISTRICT_DATA = [
  { id: 'mehsana', name: 'Mehsana', risk: 'low', reports: 14, confirmed: 8, trend: '+3%', threat: 'Whitefly', cx: 48, cy: 16 },
  { id: 'ahmedabad', name: 'Ahmedabad', risk: 'moderate', reports: 38, confirmed: 24, trend: '+9%', threat: 'Leaf Spot', cx: 62, cy: 34 },
  { id: 'sanand', name: 'Sanand', risk: 'high', reports: 48, confirmed: 31, trend: '↑18%', threat: 'Rice Leaf Blast', cx: 48, cy: 40 },
  { id: 'anand', name: 'Anand', risk: 'moderate', reports: 29, confirmed: 18, trend: '+6%', threat: 'Stem Borer', cx: 74, cy: 48 },
  { id: 'kheda', name: 'Kheda', risk: 'moderate', reports: 22, confirmed: 14, trend: '+5%', threat: 'Brown Plant Hopper', cx: 70, cy: 40 },
  { id: 'rajkot', name: 'Rajkot', risk: 'moderate', reports: 31, confirmed: 19, trend: '+14%', threat: 'Pink Bollworm', cx: 26, cy: 58 },
  { id: 'vadodara', name: 'Vadodara', risk: 'low', reports: 17, confirmed: 10, trend: '+2%', threat: 'Leaf Miner', cx: 68, cy: 62 },
  { id: 'surat', name: 'Surat', risk: 'emerging', reports: 21, confirmed: 12, trend: '+8%', threat: 'Thrips', cx: 58, cy: 80 },
]


const OFFICER_ALERTS_DATA = [
  { priority: 'high', title: 'High Risk Crop Case', crop: 'Rice', region: 'Ahmedabad', location: 'Ahmedabad', time: 'Today', body: 'AI escalation requires immediate expert validation.', message: 'AI escalation requires immediate expert validation.' },
  { priority: 'high', title: 'Disease Cluster Detected', crop: 'Cotton', region: 'Sanand', location: 'Sanand', time: 'Today', body: 'Multiple high-risk reports require field monitoring.', message: 'Multiple high-risk reports require field monitoring.' },
  { priority: 'medium', title: 'Emerging Pest Risk', crop: 'Wheat', region: 'Kheda', location: 'Kheda', time: 'Yesterday', body: 'Monitor for early pest symptoms and farmer reports.', message: 'Monitor for early pest symptoms and farmer reports.' },
]

function getPestLabel(scan: any): string {
  const detection = scan?.pest_detection ?? scan?.pest_result ?? scan?.pest
  let advisory: any = scan?.advisory ?? {}
  if (typeof advisory === 'string') {
    try { advisory = JSON.parse(advisory) } catch { advisory = {} }
  }
  const pestAdvisory = advisory?.pest_advisory ?? {}
  if (typeof scan?.pest_name === 'string' && scan.pest_name) return scan.pest_name
  if (typeof scan?.pest_label === 'string' && scan.pest_label) return scan.pest_label
  if (typeof advisory?.pest === 'string' && advisory.pest) return advisory.pest
  if (typeof pestAdvisory?.pest === 'string' && pestAdvisory.pest) return pestAdvisory.pest
  if (typeof detection === 'string' && detection) return detection
  if (Array.isArray(detection)) return String(detection[0]?.label || detection[0]?.name || detection[0] || '')
  return String(detection?.detections?.[0]?.label || detection?.label || detection?.name || '')
}

function getScanDiagnosis(scan: any): string {
  const disease = scan?.disease || ''
  const pest = getPestLabel(scan)
  return [disease, pest].filter(Boolean).join(' + ') || '—'
}

function getRiskColor(risk: string) {
  if (risk === 'high') return { dot: 'bg-red-500', text: 'text-red-700', bg: 'bg-red-50 border-red-200', badge: 'bg-red-100 text-red-700', fill: '#ef4444' }
  if (risk === 'moderate') return { dot: 'bg-orange-400', text: 'text-orange-700', bg: 'bg-orange-50 border-orange-200', badge: 'bg-orange-100 text-orange-700', fill: '#fb923c' }
  if (risk === 'emerging') return { dot: 'bg-yellow-400', text: 'text-yellow-700', bg: 'bg-yellow-50 border-yellow-200', badge: 'bg-yellow-100 text-yellow-700', fill: '#facc15' }
  return { dot: 'bg-green-500', text: 'text-green-700', bg: 'bg-green-50 border-green-200', badge: 'bg-green-100 text-green-700', fill: '#22c55e' }
}

export default function OfficerApp({ initialLang = 'en' }: { initialLang?: AppLanguage }) {
  const { navigate: globalNav, lang, setLang } = useAppNav()
  const [page, setPage] = useState<OfficerPage>('dashboard')
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [selectedDistrict, setSelectedDistrict] = useState(DISTRICT_DATA[2])
  const [selectedCaseIdx, setSelectedCaseIdx] = useState(0)
  const [selectedAlertIdx, setSelectedAlertIdx] = useState(0)

  const nav = (p: OfficerPage) => {
    setPage(p)
    setSidebarOpen(false)
  }

  const NAV_ITEMS = [
    { key: 'dashboard', label: t('officerDashboard', lang), icon: <DashIcon className="w-4 h-4" /> },
    { key: 'regional-heat-map', label: t('officerHeatMap', lang), icon: <MapIcon className="w-4 h-4" /> },
    { key: 'validation', label: t('officerValidation', lang), icon: <ValidIcon className="w-4 h-4" />, badge: '67' },
    { key: 'alerts', label: t('officerAlerts', lang), icon: <BellIcon className="w-4 h-4" />, badge: '5' },
    { key: 'reports', label: t('officerReports', lang), icon: <ChartBarIcon className="w-4 h-4" /> },
    { key: 'profile', label: t('officerProfile', lang), icon: <UserIcon className="w-4 h-4" /> },
  ]

  const activePage = ['focused-area'].includes(page) ? 'regional-heat-map' :
    ['case-validation'].includes(page) ? 'validation' :
      ['alert-detail'].includes(page) ? 'alerts' : page

  const SidebarContent = () => (
    <div className="flex flex-col h-full pt-4 pb-4">
      <div className="px-3 mb-2">
        <div className="text-xs font-semibold uppercase tracking-wider text-slate-400 px-3 mb-2">{t('officerTools', lang)}</div>
      </div>
      {NAV_ITEMS.map((item) => (
        <button key={item.key}
          onClick={() => nav(item.key as OfficerPage)}
          className={`flex items-center gap-3 mx-2 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${activePage === item.key
            ? 'bg-blue-50 text-blue-800 border border-blue-200'
            : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
            }`}>
          {item.icon}
          <span className="flex-1">{item.label}</span>
          {item.badge && <span className="text-xs bg-red-100 text-red-600 rounded-full px-1.5">{item.badge}</span>}
        </button>
      ))}
      <div className="mt-auto mx-3 pt-4 border-t border-slate-100 space-y-1">
        <button onClick={async () => { await supabase.auth.signOut(); globalNav('landing') }}
          className="w-full flex items-center gap-2 text-slate-600 hover:text-red-700 hover:bg-red-50 text-xs font-semibold px-3 py-2 rounded-lg transition-colors">
          <LogoutIcon className="w-4 h-4" />
          {t('navLogout', lang)}
        </button>
        <button onClick={() => globalNav('role-selection')}
          className="w-full flex items-center gap-2 text-slate-500 text-xs hover:text-slate-800 px-3 py-2 rounded-lg transition-colors">
          <UserIcon className="w-4 h-4" />
          {t('navSwitchRole', lang)}
        </button>
      </div>
    </div>
  )

  return (
    <div className="h-full overflow-hidden bg-slate-50">
      {/* Fixed Header */}
      <header className="fixed top-0 left-0 right-0 h-14 z-50 bg-white border-b border-slate-200 flex items-center px-4 gap-3">
        <button className="lg:hidden w-8 h-8 flex items-center justify-center rounded hover:bg-slate-100 transition-colors"
          onClick={() => setSidebarOpen(!sidebarOpen)}>
          <MenuIcon className="w-5 h-5 text-slate-600" />
        </button>
        <div className="flex items-center gap-2 flex-shrink-0">
          <ShieldCheckIcon className="w-5 h-5 text-blue-700" />
          <div>
            <span style={{ fontFamily: "'DM Serif Display', serif" }} className="text-lg text-blue-900">AgriSense</span>
            <span className="text-slate-400 text-xs ml-2 hidden sm:inline">{tx('Extension Intelligence', lang)}</span>
          </div>
        </div>
        <div className="flex-1" />
        <div className="flex items-center gap-1.5 text-xs text-slate-500 flex-shrink-0">
          <PinIcon className="w-3 h-3" />
          <span className="hidden sm:inline">{tx('Ahmedabad District', lang)}</span>
        </div>
        <select className="text-xs border border-slate-200 rounded px-2 py-1 text-slate-600 bg-white focus:outline-none hidden sm:block">
          <option>Aug 2026</option>
          <option>Jul 2026</option>
        </select>
        <select
          value={lang}
          onChange={(e) => setLang(e.target.value as AppLanguage)}
          className="text-xs font-semibold border border-blue-200 rounded px-2 py-1 bg-white text-blue-900 focus:outline-none focus:ring-1 focus:ring-blue-500"
        >
          <option value="en">EN</option>
          <option value="hi">हिंदी</option>
          <option value="gu">ગુજરાતી</option>
        </select>
        <div className="relative flex-shrink-0">
          <button className="relative w-8 h-8 flex items-center justify-center rounded-full hover:bg-slate-100 transition-colors">
            <BellIcon className="w-5 h-5 text-slate-600" />
            <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full" />
          </button>
        </div>
        <button onClick={() => nav('profile')}
          className="w-8 h-8 bg-blue-700 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
          SO
        </button>
      </header>

      {/* Mobile sidebar overlay */}
      {sidebarOpen && (
        <div className="lg:hidden fixed inset-0 z-40" onClick={() => setSidebarOpen(false)}>
          <div className="absolute inset-0 bg-black/30" />
          <div className="absolute left-0 top-14 bottom-0 w-64 bg-white border-r border-slate-200 z-50" onClick={(e) => e.stopPropagation()}>
            <SidebarContent />
          </div>
        </div>
      )}

      {/* Desktop Sidebar */}
      <aside className="hidden lg:block fixed left-0 top-14 bottom-0 w-64 z-40 bg-white border-r border-slate-200">
        <SidebarContent />
      </aside>

      {/* Main Content */}
      <main className="absolute inset-0 overflow-y-auto" style={{ top: '56px' }}>
        <div className="lg:ml-64 min-h-full">
          {page === 'dashboard' && <OfficerDashboard nav={nav} lang={lang} />}
          {page === 'regional-heat-map' && (
            <RegionalHeatMap nav={nav} selectedDistrict={selectedDistrict} setSelectedDistrict={setSelectedDistrict} lang={lang} />
          )}
          {page === 'focused-area' && <FocusedArea nav={nav} district={selectedDistrict} lang={lang} />}
          {page === 'validation' && <PendingValidation nav={nav} setSelectedCaseIdx={setSelectedCaseIdx} lang={lang} />}
          {page === 'case-validation' && <CaseValidation nav={nav} caseIdx={selectedCaseIdx} lang={lang} />}
          {page === 'alerts' && <OfficerAlerts nav={nav} setSelectedAlertIdx={setSelectedAlertIdx} lang={lang} />}
          {page === 'alert-detail' && <OfficerAlertDetail nav={nav} idx={selectedAlertIdx} lang={lang} />}
          {page === 'reports' && <OfficerReports nav={nav} lang={lang} />}
          {page === 'profile' && <OfficerProfile nav={nav} lang={lang} />}
        </div>
      </main>
    </div>
  )
}

// ────────────────────────── OFFICER PAGES ──────────────────────────

function OfficerDashboard({ nav, lang = 'en' }: { nav: (p: OfficerPage) => void; lang?: AppLanguage }) {
  const kpis = [
    { label: t('totalFieldReports', lang), val: '1,284', change: '+43 this week', color: 'blue', icon: <ReportIcon className="w-5 h-5" /> },
    { label: t('highRiskAreas', lang), val: '24', change: '↑3 since last week', color: 'red', icon: <AlertIcon className="w-5 h-5" /> },
    { label: t('pendingValidation', lang), val: '67', change: 'Needs attention', color: 'amber', icon: <ValidIcon className="w-5 h-5" /> },
    { label: t('casesConfirmed', lang), val: '892', change: '+18 today', color: 'green', icon: <CheckIcon className="w-5 h-5" /> },
  ]

  const threats = [
    { name: 'Rice Blast', change: '+18%', dir: 'up', severity: 'high' },
    { name: 'Pink Bollworm', change: '+14%', dir: 'up', severity: 'high' },
    { name: 'Wheat Rust', change: '+9%', dir: 'up', severity: 'moderate' },
    { name: 'Leaf Spot', change: '-4%', dir: 'down', severity: 'low' },
  ]

  const cropData = [
    { crop: 'Rice', pct: 34, count: 436 },
    { crop: 'Cotton', pct: 26, count: 334 },
    { crop: 'Wheat', pct: 18, count: 231 },
    { crop: 'Maize', pct: 12, count: 154 },
    { crop: 'Vegetables', pct: 10, count: 129 },
  ]

  return (
    <div className="p-4 lg:p-6 max-w-6xl mx-auto">
      <div className="mb-6">
        <h1 style={{ fontFamily: "'DM Serif Display', serif" }} className="text-2xl text-slate-900 mb-1">{tx('Regional Dashboard', lang)}</h1>
        <p className="text-slate-500 text-sm">Ahmedabad District · Aug 25, 2026</p>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {kpis.map((k) => (
          <div key={k.label} className="bg-white border border-slate-200 rounded-xl p-4">
            <div className={`w-8 h-8 rounded-lg flex items-center justify-center mb-3 ${k.color === 'blue' ? 'bg-blue-100 text-blue-700' :
              k.color === 'red' ? 'bg-red-100 text-red-700' :
                k.color === 'amber' ? 'bg-amber-100 text-amber-700' : 'bg-green-100 text-green-700'
              }`}>{k.icon}</div>
            <div className="text-2xl font-bold text-slate-900 mb-0.5">{k.val}</div>
            <div className="text-xs text-slate-500 leading-tight mb-1">{k.label}</div>
            <div className={`text-xs font-medium ${k.color === 'red' ? 'text-red-600' : k.color === 'amber' ? 'text-amber-600' : 'text-green-600'}`}>{k.change}</div>
          </div>
        ))}
      </div>

      <div className="grid lg:grid-cols-3 gap-4 mb-4">
        {/* Map overview */}
        <div className="lg:col-span-2 bg-white border border-slate-200 rounded-xl p-4">
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-semibold text-slate-800">{tx('Regional Crop Health Overview', lang)}</h2>
            <button onClick={() => nav('regional-heat-map')} className="text-xs text-blue-600 hover:text-blue-500 font-medium">
              {tx('Full Heat Map →', lang)}
            </button>
          </div>
          {/* Mini Gujarat map */}
          <div className="relative bg-slate-50 rounded-lg h-52 overflow-hidden border border-slate-100">
            <svg viewBox="0 0 100 100" className="w-full h-full">
              <path d="M 20 8 L 80 8 L 88 20 L 90 40 L 85 60 L 78 82 L 65 90 L 50 92 L 35 88 L 22 75 L 15 58 L 10 38 L 12 18 Z"
                fill="#f1f5f9" stroke="#cbd5e1" strokeWidth="1" />
              {DISTRICT_DATA.map((d) => {
                const c = getRiskColor(d.risk)
                return (
                  <g key={d.id} className="cursor-pointer" onClick={() => nav('regional-heat-map')}>
                    <circle cx={d.cx} cy={d.cy} r="5.5" fill={c.fill} opacity="0.85" stroke="white" strokeWidth="1.2" />
                    <text x={d.cx} y={d.cy + 9.5} textAnchor="middle" fontSize="3.5" fill="#1e293b" fontFamily="DM Sans, sans-serif">{d.name}</text>
                  </g>
                )
              })}
            </svg>
            <div className="absolute bottom-2 right-2 flex gap-2 bg-white/80 rounded px-2 py-1">
              {[['red', 'High'], ['orange', 'Moderate'], ['yellow', 'Emerging'], ['green', 'Low']].map(([c, l]) => (
                <div key={l} className="flex items-center gap-1">
                  <div className={`w-2 h-2 rounded-full ${c === 'red' ? 'bg-red-500' : c === 'orange' ? 'bg-orange-400' : c === 'yellow' ? 'bg-yellow-400' : 'bg-green-500'}`} />
                  <span className="text-xs text-slate-600">{l}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Emerging threats */}
        <div className="bg-white border border-slate-200 rounded-xl p-4">
          <h2 className="font-semibold text-slate-800 mb-3">{tx('Top Emerging Threats', lang)}</h2>
          <div className="space-y-3">
            {threats.map((t) => (
              <div key={t.name} className="flex items-center justify-between">
                <div>
                  <div className="text-sm font-medium text-slate-800">{t.name}</div>
                  <div className={`text-xs ${t.severity === 'high' ? 'text-red-500' : t.severity === 'moderate' ? 'text-amber-500' : 'text-green-500'}`}>
                    {tx(t.severity, lang)}
                  </div>
                </div>
                <span className={`text-sm font-bold ${t.dir === 'up' ? 'text-red-600' : 'text-green-600'}`}>{t.change}</span>
              </div>
            ))}
          </div>
          <button onClick={() => nav('reports')} className="w-full mt-4 text-xs text-blue-600 hover:text-blue-500 font-medium text-left">
            {tx('View full analytics →', lang)}
          </button>
        </div>
      </div>

      {/* Crop-wise distribution */}
      <div className="bg-white border border-slate-200 rounded-xl p-4">
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-semibold text-slate-800">{tx('Disease/Pest Reports — Last 30 Days', lang)}</h2>
          <span className="text-xs text-slate-400">{tx('Crop-wise distribution', lang)}</span>
        </div>
        <div className="space-y-2.5">
          {cropData.map((c) => (
            <div key={c.crop} className="flex items-center gap-3">
              <span className="text-sm text-slate-600 w-20 flex-shrink-0">{c.crop}</span>
              <div className="flex-1 bg-slate-100 rounded-full h-2 overflow-hidden">
                <div className="h-full bg-blue-500 rounded-full" style={{ width: `${c.pct}%` }} />
              </div>
              <span className="text-xs text-slate-500 w-16 text-right">{c.count} {tx('reports', lang)}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

function RegionalHeatMap({ nav, selectedDistrict, setSelectedDistrict, lang = 'en' }: {
  nav: (p: OfficerPage) => void
  selectedDistrict: typeof DISTRICT_DATA[0]
  setSelectedDistrict: (d: typeof DISTRICT_DATA[0]) => void
  lang?: AppLanguage
}) {
  const [activeFilters, setActiveFilters] = useState({ crop: 'All', risk: 'All', period: 'Last 30 days' })
  const [panelDistrict, setPanelDistrict] = useState<typeof DISTRICT_DATA[0] | null>(null)

  const handleDistrictClick = (d: typeof DISTRICT_DATA[0]) => {
    setSelectedDistrict(d)
    setPanelDistrict(d)
  }

  return (
    <div className="p-4 lg:p-6 max-w-6xl mx-auto">
      <BackButton label={tx('Back to Officer Dashboard', lang)} onClick={() => nav('dashboard')} />
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-xl font-semibold text-slate-900">{tx('Regional Heat Map', lang)}</h1>
        <span className="text-xs text-slate-400">Gujarat · Ahmedabad District</span>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 mb-4">
        {[
          { label: 'Crop', options: ['All', 'Rice', 'Cotton', 'Wheat', 'Maize'], field: 'crop' as const },
          { label: 'Risk Level', options: ['All', 'High', 'Moderate', 'Emerging', 'Low'], field: 'risk' as const },
          { label: 'Period', options: ['Last 7 days', 'Last 30 days', 'Last 90 days'], field: 'period' as const },
        ].map((f) => (
          <select key={f.field}
            value={activeFilters[f.field]}
            onChange={(e) => setActiveFilters({ ...activeFilters, [f.field]: e.target.value })}
            className="text-xs border border-slate-200 rounded-lg px-3 py-2 bg-white text-slate-700 focus:outline-none focus:border-blue-500">
            {f.options.map((o) => <option key={o}>{o}</option>)}
          </select>
        ))}
      </div>

      <div className="grid lg:grid-cols-3 gap-4">
        {/* Map */}
        <div className="lg:col-span-2">
          <div className="bg-white border border-slate-200 rounded-xl p-4">
            <div className="relative bg-slate-50 rounded-lg overflow-hidden" style={{ paddingBottom: '75%' }}>
              <div className="absolute inset-0">
                <svg viewBox="0 0 100 100" className="w-full h-full">
                  {/* Gujarat simplified outline */}
                  <path d="M 18 6 L 82 6 L 90 18 L 92 38 L 88 58 L 80 78 L 68 90 L 52 93 L 36 90 L 22 78 L 14 58 L 10 36 L 12 18 Z"
                    fill="#f8fafc" stroke="#e2e8f0" strokeWidth="1.5" />
                  {/* District circles */}
                  {DISTRICT_DATA.map((d) => {
                    const c = getRiskColor(d.risk)
                    const isSelected = panelDistrict?.id === d.id
                    return (
                      <g key={d.id} className="cursor-pointer" onClick={() => handleDistrictClick(d)}>
                        {isSelected && <circle cx={d.cx} cy={d.cy} r="9" fill={c.fill} opacity="0.25" />}
                        <circle cx={d.cx} cy={d.cy} r={isSelected ? 7 : 6} fill={c.fill} opacity="0.9"
                          stroke={isSelected ? 'white' : 'white'} strokeWidth={isSelected ? 2 : 1.5} />
                        <text x={d.cx} y={d.cy + 11} textAnchor="middle" fontSize="3.8" fill="#1e293b" fontFamily="DM Sans, sans-serif" fontWeight="500">{d.name}</text>
                      </g>
                    )
                  })}
                </svg>
              </div>
            </div>
            {/* Map controls */}
            <div className="flex items-center justify-between mt-3">
              <div className="flex gap-1">
                {['−', '+'].map((btn, i) => (
                  <button key={i} className="w-7 h-7 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded text-sm font-bold transition-colors">{btn}</button>
                ))}
                <button className="px-2.5 h-7 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded text-xs transition-colors">{tx('Reset', lang)}</button>
              </div>
              <div className="flex gap-3">
                {[['red', 'High'], ['orange', 'Moderate'], ['yellow', 'Emerging'], ['green', 'Low']].map(([c, l]) => (
                  <div key={l} className="flex items-center gap-1">
                    <div className={`w-2.5 h-2.5 rounded-full ${c === 'red' ? 'bg-red-500' : c === 'orange' ? 'bg-orange-400' : c === 'yellow' ? 'bg-yellow-400' : 'bg-green-500'}`} />
                    <span className="text-xs text-slate-600">{l}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Detail panel or district list */}
        <div className="space-y-3">
          {panelDistrict ? (
            <div className={`bg-white border rounded-xl p-4 ${getRiskColor(panelDistrict.risk).bg}`}>
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-semibold text-slate-800">{panelDistrict.name}</h3>
                <button onClick={() => setPanelDistrict(null)} className="text-slate-400 hover:text-slate-600 text-sm">✕</button>
              </div>
              <div className={`inline-flex items-center gap-1 text-xs font-bold uppercase px-2 py-0.5 rounded-full mb-3 ${getRiskColor(panelDistrict.risk).badge}`}>
                {panelDistrict.risk} risk
              </div>
              <div className="space-y-2 mb-4">
                {[
                  { label: 'Primary Threat', val: panelDistrict.threat },
                  { label: 'Total Reports', val: panelDistrict.reports.toString() },
                  { label: 'Confirmed Cases', val: panelDistrict.confirmed.toString() },
                  { label: 'Recent Trend', val: panelDistrict.trend },
                  { label: 'Last Updated', val: '2 hrs ago' },
                ].map((row) => (
                  <div key={row.label} className="flex justify-between text-sm">
                    <span className="text-slate-500">{row.label}</span>
                    <span className="font-medium text-slate-800">{row.val}</span>
                  </div>
                ))}
              </div>
              <button onClick={() => nav('focused-area')}
                className="w-full bg-blue-700 hover:bg-blue-600 text-white text-sm font-semibold py-2.5 rounded-lg transition-colors">
                View Focused Area →
              </button>
            </div>
          ) : (
            <div className="bg-white border border-slate-200 rounded-xl p-4">
              <h3 className="font-semibold text-slate-700 text-sm mb-2">{tx('Click a district to view details', lang)}</h3>
              <p className="text-slate-400 text-xs">{tx('Select any district on the map to see risk levels, reports, and actions.', lang)}</p>
            </div>
          )}

          {/* All districts list */}
          <div className="bg-white border border-slate-200 rounded-xl p-4">
            <h3 className="font-semibold text-slate-800 text-sm mb-3">{tx('All Districts', lang)}</h3>
            <div className="space-y-1.5">
              {DISTRICT_DATA.sort((a, b) => {
                const order = { high: 0, moderate: 1, emerging: 2, low: 3 }
                return (order[a.risk as keyof typeof order] || 99) - (order[b.risk as keyof typeof order] || 99)
              }).map((d) => (
                <button key={d.id} onClick={() => handleDistrictClick(d)}
                  className={`w-full flex items-center gap-2 px-2 py-1.5 rounded-lg text-left hover:bg-slate-50 transition-colors ${panelDistrict?.id === d.id ? 'bg-slate-50' : ''}`}>
                  <div className={`w-2 h-2 rounded-full flex-shrink-0 ${getRiskColor(d.risk).dot}`} />
                  <span className="text-sm text-slate-700 flex-1">{d.name}</span>
                  <span className="text-xs text-slate-400">{d.reports} rpts</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

function FocusedArea({ nav, district, lang = 'en' }: { nav: (p: OfficerPage) => void; district: typeof DISTRICT_DATA[0]; lang?: AppLanguage }) {
  const c = getRiskColor(district.risk)
  return (
    <div className="p-4 lg:p-6 max-w-6xl mx-auto">
      <BackButton label={t('backToDashboard', lang)} onClick={() => nav('regional-heat-map')} />
      <div className="flex items-start justify-between mb-4 gap-3">
        <div>
          <h1 className="text-xl font-semibold text-slate-900">{district.name} Agricultural Zone</h1>
          <div className={`inline-flex items-center gap-1.5 text-xs font-bold uppercase px-2.5 py-0.5 rounded-full mt-1.5 ${c.badge}`}>
            {district.risk} risk · Score: {district.risk === 'high' ? 78 : district.risk === 'moderate' ? 62 : 45}/100
          </div>
        </div>
        <div className="text-right text-xs text-slate-400">
          <div>{tx('Last updated', lang)}</div>
          <div className="font-medium text-slate-600">{tx('2 hours ago', lang)}</div>
        </div>
      </div>

      {/* Detailed area map */}
      <div className="bg-white border border-slate-200 rounded-xl p-4 mb-4">
        <h2 className="font-semibold text-slate-800 text-sm mb-3">{tx('Area Intelligence Map', lang)}</h2>
        <div className="relative bg-green-50 rounded-lg overflow-hidden" style={{ height: '200px' }}>
          <svg className="absolute inset-0 w-full h-full opacity-10">
            {[1, 2, 3, 4].map((i) => <line key={`h${i}`} x1="0" y1={`${i * 20}%`} x2="100%" y2={`${i * 20}%`} stroke="#166534" strokeWidth="1" />)}
            {[1, 2, 3, 4, 5].map((i) => <line key={`v${i}`} x1={`${i * 16.6}%`} y1="0" x2={`${i * 16.6}%`} y2="100%" stroke="#166534" strokeWidth="1" />)}
          </svg>
          {/* Hotspot clusters */}
          {[
            { x: '20%', y: '30%', type: 'disease', size: 'w-10 h-10', opacity: 'opacity-40' },
            { x: '55%', y: '20%', type: 'disease', size: 'w-7 h-7', opacity: 'opacity-30' },
            { x: '35%', y: '60%', type: 'pest', size: 'w-6 h-6', opacity: 'opacity-30' },
            { x: '75%', y: '50%', type: 'report', size: 'w-5 h-5', opacity: 'opacity-40' },
          ].map((h, i) => (
            <div key={i} className={`absolute ${h.size} rounded-full ${h.type === 'disease' ? 'bg-red-500' : h.type === 'pest' ? 'bg-orange-400' : 'bg-blue-400'} ${h.opacity} -translate-x-1/2 -translate-y-1/2`}
              style={{ left: h.x, top: h.y }} />
          ))}
          <div className="absolute bottom-2 right-2 flex gap-2 bg-white/80 rounded px-2 py-1">
            {[['red', 'Disease'], ['orange', 'Pest'], ['blue', 'Report']].map(([c, l]) => (
              <div key={l} className="flex items-center gap-1">
                <div className={`w-2 h-2 rounded-full ${c === 'red' ? 'bg-red-500' : c === 'orange' ? 'bg-orange-400' : 'bg-blue-400'}`} />
                <span className="text-xs text-slate-600">{l}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Analytics */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
        {[
          { label: 'Total Reports', val: district.reports.toString(), color: 'blue' },
          { label: 'Confirmed Cases', val: district.confirmed.toString(), color: 'green' },
          { label: 'Pending Validation', val: '9', color: 'amber' },
          { label: 'High-Risk Clusters', val: '6', color: 'red' },
        ].map((s) => (
          <div key={s.label} className="bg-white border border-slate-200 rounded-xl p-3 text-center">
            <div className={`text-xl font-bold mb-0.5 ${s.color === 'blue' ? 'text-blue-700' : s.color === 'green' ? 'text-green-700' : s.color === 'amber' ? 'text-amber-700' : 'text-red-700'}`}>{s.val}</div>
            <div className="text-xs text-slate-500">{s.label}</div>
          </div>
        ))}
      </div>

      <div className="grid lg:grid-cols-2 gap-4 mb-4">
        {/* Threats */}
        <div className="bg-white border border-slate-200 rounded-xl p-4">
          <h3 className="font-semibold text-slate-800 text-sm mb-3">{tx('Active Threats', lang)}</h3>
          <div className="flex items-center gap-3 mb-2">
            <span className="text-xs text-slate-500 w-24">{tx('Top Threat', lang)}</span>
            <span className="font-semibold text-red-700 text-sm">{district.threat}</span>
            <span className="text-xs text-red-500 ml-auto">{district.trend}</span>
          </div>
          <div className="flex items-center gap-3 mb-4">
            <span className="text-xs text-slate-500 w-24">{tx('Secondary', lang)}</span>
            <span className="font-medium text-orange-700 text-sm">Stem Borer</span>
            <span className="text-xs text-orange-500 ml-auto">+5%</span>
          </div>
          <h3 className="font-semibold text-slate-800 text-sm mb-2">{tx('Why is this area at risk?', lang)}</h3>
          <div className="space-y-1.5">
            {['High humidity (78%)', 'Recent rainfall events', 'Increasing field reports', 'Favorable crop stage (Flowering)'].map((r) => (
              <div key={r} className="flex items-center gap-2 text-xs text-slate-600">
                <span className="w-1.5 h-1.5 bg-red-400 rounded-full flex-shrink-0" />
                {r}
              </div>
            ))}
          </div>
        </div>

        {/* 14-day trend */}
        <div className="bg-white border border-slate-200 rounded-xl p-4">
          <h3 className="font-semibold text-slate-800 text-sm mb-3">{tx('Local Disease Activity — Last 14 Days', lang)}</h3>
          <div className="flex items-end gap-1 h-24">
            {[4, 6, 5, 8, 7, 9, 12, 11, 14, 13, 16, 15, 18, 20].map((v, i) => (
              <div key={i} className="flex-1 flex flex-col items-center justify-end">
                <div className="w-full rounded-t" style={{
                  height: `${(v / 20) * 100}%`,
                  backgroundColor: v > 12 ? '#ef4444' : v > 8 ? '#fb923c' : '#22c55e'
                }} />
              </div>
            ))}
          </div>
          <div className="flex justify-between text-xs text-slate-400 mt-1">
            <span>{tx('14 days ago', lang)}</span>
            <span>{tx('Today', lang)}</span>
          </div>
        </div>
      </div>

      {/* Crop distribution */}
      <div className="bg-white border border-slate-200 rounded-xl p-4 mb-4">
        <h3 className="font-semibold text-slate-800 text-sm mb-3">Crop Distribution · Affected Area: 1,240 hectares</h3>
        <div className="space-y-2">
          {[['Rice', 48], ['Cotton', 22], ['Wheat', 18], ['Vegetables', 12]].map(([crop, pct]) => (
            <div key={crop} className="flex items-center gap-3">
              <span className="text-sm text-slate-600 w-20">{crop}</span>
              <div className="flex-1 bg-slate-100 rounded-full h-2 overflow-hidden">
                <div className="h-full bg-green-500 rounded-full" style={{ width: `${pct}%` }} />
              </div>
              <span className="text-xs text-slate-500 w-8 text-right">{pct}%</span>
            </div>
          ))}
        </div>
      </div>

      {/* Actions */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        {[
          { label: 'Review Pending Cases', action: () => nav('validation'), color: 'blue' },
          { label: 'Notify Farmers', action: () => nav('alerts'), color: 'green' },
          { label: 'View Reports', action: () => nav('reports'), color: 'slate' },
        ].map((a) => (
          <button key={a.label} onClick={a.action}
            className={`py-2.5 px-4 rounded-lg text-sm font-semibold transition-colors ${a.color === 'blue' ? 'bg-blue-700 hover:bg-blue-600 text-white' :
              a.color === 'green' ? 'bg-green-700 hover:bg-green-600 text-white' :
                'bg-white border border-slate-200 text-slate-700 hover:bg-slate-50'
              }`}>{a.label}</button>
        ))}
      </div>
    </div>
  )
}

async function loadOfficerCases() {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Officer session has expired.')

  const { data: cases, error } = await supabase
    .from('cases')
    .select('*')
    .in('status', ['PENDING', 'UNDER_REVIEW'])
    .order('created_at', { ascending: false })

  if (error) throw new Error(error.message)

  return Promise.all((cases ?? []).map(async (c: any) => {
    const [scan, farmer, field, crop] = await Promise.all([
      supabase.from('crop_scans').select('*').eq('id', c.scan_id).maybeSingle(),
      supabase.from('profiles').select('*').eq('id', c.farmer_id).maybeSingle(),
      c.field_id ? supabase.from('fields').select('*').eq('id', c.field_id).maybeSingle() : Promise.resolve({ data: null }),
      c.field_id ? supabase.from('farmer_crops').select('*').eq('farmer_id', c.farmer_id).eq('field_id', c.field_id).order('created_at', { ascending: false }).limit(1).maybeSingle() : Promise.resolve({ data: null }),
    ])
    if (scan.error) {
      console.error('Failed to load crop scan for case', c.id, scan.error)
    }
    return { ...c, scan: scan.data, scan_error: scan.error?.message ?? null, farmer: farmer.data, field: field.data, crop: crop.data }
  }))
}

function PendingValidation({ nav, setSelectedCaseIdx, lang = 'en' }: { nav: (p: OfficerPage) => void; setSelectedCaseIdx: (i: number) => void; lang?: AppLanguage }) {
  const [cases, setCases] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const load = async () => {
    setLoading(true); setError('')
    try { setCases(await loadOfficerCases()) } catch (e) { setError(e instanceof Error ? e.message : 'Could not load cases.') } finally { setLoading(false) }
  }
  useEffect(() => { load() }, [])

  return (
    <div className="p-4 lg:p-6 max-w-6xl mx-auto">
      <BackButton label={tx('Back to Officer Dashboard', lang)} onClick={() => nav('dashboard')} />
      <div className="flex items-center justify-between mb-4">
        <div><h1 className="text-xl font-semibold text-slate-900">{tx('Case List', lang)}</h1><p className="text-slate-500 text-sm">{tx('New and pending farmer cases requiring expert review.', lang)}</p></div>
        <span className="bg-amber-100 text-amber-700 text-xs font-bold px-2.5 py-1 rounded-full">{cases.length} pending</span>
      </div>
      {error && <div className="bg-red-50 border border-red-200 text-red-700 rounded-xl p-3 text-sm mb-4">{error}</div>}
      {loading ? <div className="text-sm text-slate-500">{tx('Loading field reports...', lang)}</div> : cases.length === 0 ? (
        <div className="bg-white border border-slate-200 rounded-xl p-8 text-center text-sm text-slate-500">{tx('No pending farmer cases yet. When a farmer is escalated by AI, the case will appear here.', lang)}</div>
      ) : (
        <div className="bg-white border border-slate-200 rounded-xl overflow-hidden"><div className="overflow-x-auto"><table className="w-full"><thead><tr className="bg-slate-50 border-b border-slate-200">{['Case ID', 'Farmer', 'Location', 'Crop', 'AI Assessment', 'Confidence', 'Priority', 'Status', 'Action'].map(h => <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide whitespace-nowrap">{tx(h, lang)}</th>)}</tr></thead><tbody className="divide-y divide-slate-100">{cases.map((c, i) => <tr key={c.id} className="hover:bg-slate-50"><td className="px-4 py-3 text-xs font-mono text-blue-700">{c.id.slice(0, 8).toUpperCase()}</td><td className="px-4 py-3 text-sm text-slate-700">{c.farmer?.name || 'Farmer'}</td><td className="px-4 py-3 text-sm text-slate-700">{c.farmer?.village || c.farmer?.district || '—'}</td><td className="px-4 py-3 text-sm text-slate-700">{c.scan?.crop || c.crop?.crop || '—'}</td><td className="px-4 py-3 text-sm font-medium text-slate-800">{getScanDiagnosis(c.scan)}</td><td className="px-4 py-3 text-sm font-semibold text-slate-700">{Number(c.scan?.confidence || 0).toFixed(2)}%</td><td className="px-4 py-3"><span className={`text-xs font-medium px-2 py-0.5 rounded-full ${c.priority === 'CRITICAL' ? 'bg-red-100 text-red-700' : c.priority === 'HIGH' ? 'bg-red-50 text-red-600' : 'bg-amber-100 text-amber-700'}`}>{tx(c.priority, lang)}</span></td><td className="px-4 py-3 text-xs text-slate-500">{tx(c.status, lang)}</td><td className="px-4 py-3"><button onClick={() => { setSelectedCaseIdx(i); nav('case-validation') }} className="text-xs bg-blue-700 hover:bg-blue-600 text-white px-3 py-1.5 rounded font-medium">{tx('Open Case', lang)}</button></td></tr>)}</tbody></table></div></div>
      )}
    </div>
  )
}

function CaseValidation({ nav, caseIdx, lang = 'en' }: { nav: (p: OfficerPage) => void; caseIdx: number; lang?: AppLanguage }) {
  const [caseData, setCaseData] = useState<any>(null)
  const [action, setAction] = useState<'confirm' | 'correct' | null>(null)
  const [correction, setCorrection] = useState('')
  const [notes, setNotes] = useState('')
  const [treatment, setTreatment] = useState('')
  const [dosage, setDosage] = useState('')
  const [applicationMethod, setApplicationMethod] = useState('')
  const [weatherGuidance, setWeatherGuidance] = useState('')
  const [additionalAdvice, setAdditionalAdvice] = useState('')
  const [ipmGuidance, setIpmGuidance] = useState('')
  const [policyRegulatoryGuidance, setPolicyRegulatoryGuidance] = useState('')
  const [schemeName, setSchemeName] = useState('')
  const [schemeBenefits, setSchemeBenefits] = useState('')
  const [schemeEligibility, setSchemeEligibility] = useState('')
  const [schemeApplication, setSchemeApplication] = useState('')
  const [regionalOffice, setRegionalOffice] = useState('Agriculture Extension Office')
  const [servicesInfo, setServicesInfo] = useState('Crop disease guidance and field support')
  const [officerContact, setOfficerContact] = useState('')
  const [officerEmail, setOfficerEmail] = useState('')
  const [officeAddress, setOfficeAddress] = useState('')
  const [nextFollowupDate, setNextFollowupDate] = useState('')
  const [monitorInstructions, setMonitorInstructions] = useState('Monitor symptoms and upload a follow-up scan if the condition changes.')
  const [contactOfficerIf, setContactOfficerIf] = useState('Contact the officer if symptoms worsen or treatment does not help.')
  const [importantInstructions, setImportantInstructions] = useState('Follow approved product labels and local agricultural guidance.')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    ; (async () => {
      try {
        const cases = await loadOfficerCases()
        const c = cases[caseIdx]
        if (!c) throw new Error('Case no longer exists or is no longer pending.')
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) throw new Error('Officer session has expired.')
        if (!c.officer_id) {
          // Claiming is conditional on officer_id still being NULL. Because another
          // request (or React StrictMode in development) may claim the case first,
          // do not use .single() here: a conditional update can legitimately return
          // zero rows.
          const { data: claimed, error: claimError } = await supabase
            .from('cases')
            .update({ officer_id: user.id, status: 'UNDER_REVIEW' })
            .eq('id', c.id)
            .is('officer_id', null)
            .select('*')
            .maybeSingle()

          if (claimError) {
            throw new Error(`Could not claim case: ${claimError.message}`)
          }

          if (claimed) {
            c.officer_id = claimed.officer_id
            c.status = claimed.status
          } else {
            // The case may have been claimed between the initial read and the
            // conditional update. Read it again and continue only if it belongs
            // to the currently logged-in officer.
            const { data: existingCase, error: existingCaseError } = await supabase
              .from('cases')
              .select('*')
              .eq('id', c.id)
              .maybeSingle()

            if (existingCaseError) {
              throw new Error(`Could not verify case ownership: ${existingCaseError.message}`)
            }

            if (!existingCase) {
              throw new Error('Could not find the case after the claim attempt.')
            }

            if (existingCase.officer_id !== user.id) {
              throw new Error('This case has already been claimed by another officer.')
            }

            c.officer_id = existingCase.officer_id
            c.status = existingCase.status
          }
        }

        // RLS intentionally hides farmer/field/scan data until the officer has claimed the case.
        // Re-fetch the linked records after claiming so the full field report becomes visible.
        const [scan, farmer, field, crop] = await Promise.all([
          supabase.from('crop_scans').select('*').eq('id', c.scan_id).maybeSingle(),
          supabase.from('profiles').select('*').eq('id', c.farmer_id).maybeSingle(),
          c.field_id ? supabase.from('fields').select('*').eq('id', c.field_id).maybeSingle() : Promise.resolve({ data: null }),
          c.field_id ? supabase.from('farmer_crops').select('*').eq('farmer_id', c.farmer_id).eq('field_id', c.field_id).order('created_at', { ascending: false }).limit(1).maybeSingle() : Promise.resolve({ data: null }),
        ])
        c.scan = scan.data; c.farmer = farmer.data; c.field = field.data; c.crop = crop.data

        setOfficerContact(user.id.slice(0, 8).toUpperCase())
        const { data: officer } = await supabase.from('profiles').select('*').eq('id', user.id).maybeSingle()
        if (officer) { setOfficerEmail('Extension office contact available in profile'); setRegionalOffice(`${officer.district || officer.state || 'Regional'} Agriculture Extension Office`) }

        // Pull the existing backend advisory + farmer-support data so the officer
        // does not have to manually re-enter information that AgriSense already knows.
        const API_BASE_URL = 'http://127.0.0.1:8000'
        const disease = c.scan?.disease || ''
        const pest = getPestLabel(c.scan)
        const cropForAdvisory = c.scan?.crop || c.crop?.crop || ''
        const farmerId = c.farmer_id
        const state = c.farmer?.state || officer?.state || ''

        try {
          const advisoryPromise = disease
            ? fetch(`${API_BASE_URL}/advisory/${encodeURIComponent(disease)}`).then(async r => r.ok ? r.json() : null).catch(() => null)
            : pest && cropForAdvisory
              ? fetch(`${API_BASE_URL}/pest-advisory?crop=${encodeURIComponent(cropForAdvisory)}&pest=${encodeURIComponent(pest)}`).then(async r => r.ok ? r.json() : null).catch(() => null)
              : Promise.resolve(null)
          const supportPromise = farmerId
            ? fetch(`${API_BASE_URL}/farmer-support/${encodeURIComponent(farmerId)}${state ? `?state=${encodeURIComponent(state)}` : ''}`).then(async r => r.ok ? r.json() : null).catch(() => null)
            : Promise.resolve(null)

          const [advisoryData, supportData] = await Promise.all([advisoryPromise, supportPromise])

          if (advisoryData) {
            const actions = Array.isArray(advisoryData.actions) ? advisoryData.actions.filter(Boolean) : []
            const prevention = Array.isArray(advisoryData.prevention) ? advisoryData.prevention.filter(Boolean) : []
            const warning = advisoryData.warning || ''
            const referral = advisoryData.referral || ''

            if (actions.length) setTreatment(actions.join('\n• '))
            if (warning) setWeatherGuidance(warning)
            if (actions.length || prevention.length) {
              const parts = []
              if (actions.length) parts.push(`Recommended actions:\n• ${actions.join('\n• ')}`)
              if (prevention.length) parts.push(`Prevention / IPM:\n• ${prevention.join('\n• ')}`)
              setIpmGuidance(parts.join('\n\n'))
            }
            if (referral) setAdditionalAdvice(referral)
          }

          if (supportData) {
            const regulations = Array.isArray(supportData.regulations) ? supportData.regulations : []
            if (regulations.length) {
              setPolicyRegulatoryGuidance(regulations.map((r: any) => {
                const title = r.title || r.category || 'Regulation'
                const description = r.description || ''
                const jurisdiction = r.jurisdiction ? ` (${r.jurisdiction})` : ''
                return `• ${title}${jurisdiction}${description ? `: ${description}` : ''}`
              }).join('\n'))
            }

            const schemes = Array.isArray(supportData.schemes) ? supportData.schemes : []
            if (schemes.length) {
              // The current backend intentionally filters schemes by farmer state;
              // it does not claim crop-specific eligibility when the source data
              // does not provide it. Pre-fill the first state-matched scheme.
              const scheme = schemes[0]
              setSchemeName(scheme.name || '')
              setSchemeBenefits(scheme.benefits || scheme.description || '')
              const rules = scheme.eligibility_rules
              setSchemeEligibility(typeof rules === 'string' ? rules : rules ? JSON.stringify(rules) : 'Verify current eligibility on the official government portal.')
              setSchemeApplication(scheme.application_info || scheme.contact_info || 'Refer to the official government portal for the current application process.')
            }
          }
        } catch {
          // Backend support is an enhancement; the officer can still complete the report manually.
        }

        setCaseData(c)
      } catch (e) { setError(e instanceof Error ? e.message : 'Could not load case.') } finally { setLoading(false) }
    })()
  }, [caseIdx])

  const submit = async () => {
    if (!caseData || !action) return
    if (action === 'correct' && !correction) return
    setSaving(true); setError('')
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Officer session has expired.')
      const original = getScanDiagnosis(caseData.scan)
      const validated = action === 'confirm' ? original : correction
      const { error: vError } = await supabase.from('case_validation').insert({ case_id: caseData.id, officer_id: user.id, original_diagnosis: original, validated_diagnosis: validated, validation_status: action === 'confirm' ? 'CONFIRMED' : 'CORRECTED', notes })
      if (vError) throw new Error(`Validation failed: ${vError.message}`)
      const { error: rError } = await supabase.from('case_response').upsert({ case_id: caseData.id, officer_id: user.id, treatment, dosage, application_method: applicationMethod, weather_guidance: weatherGuidance, additional_advice: additionalAdvice, ipm_guidance: ipmGuidance, policy_regulatory_guidance: policyRegulatoryGuidance, scheme_name: schemeName, scheme_benefits: schemeBenefits, scheme_eligibility: schemeEligibility, scheme_application: schemeApplication, regional_office: regionalOffice, services_info: servicesInfo, officer_contact: officerContact, officer_email: officerEmail, office_address: officeAddress, next_followup_date: nextFollowupDate || null, monitor_instructions: monitorInstructions, contact_officer_if: contactOfficerIf, important_instructions: importantInstructions })
      if (rError) throw new Error(`Response save failed: ${rError.message}`)
      const { error: cError } = await supabase.from('cases').update({ status: 'GUIDANCE_SENT' }).eq('id', caseData.id).eq('officer_id', user.id)
      if (cError) throw new Error(`Case update failed: ${cError.message}`)
      await supabase.from('case_updates').insert({ case_id: caseData.id, sender_id: user.id, message: 'Extension Officer reviewed the case and returned a structured response.', guidance: additionalAdvice || treatment || 'See structured AGRISENSE report.' })
      setSubmitted(true)
    } catch (e) { setError(e instanceof Error ? e.message : 'Could not submit officer response.') } finally { setSaving(false) }
  }

  if (loading) return <div className="p-4 lg:p-6 max-w-4xl mx-auto text-sm text-slate-500">{tx('Loading field report...', lang)}</div>
  if (error && !caseData) return <div className="p-4 lg:p-6 max-w-4xl mx-auto"><BackButton label={tx('Back to Pending Validation', lang)} onClick={() => nav('validation')} /><div className="bg-red-50 border border-red-200 text-red-700 rounded-xl p-4 text-sm">{error}</div></div>

  return (
    <div className="p-4 lg:p-6 max-w-4xl mx-auto">
      <BackButton label={tx('Back to Case List', lang)} onClick={() => nav('validation')} />
      <div className="mb-4"><h1 className="text-xl font-semibold text-slate-900">{tx('Field Report Details & Validation', lang)}</h1><p className="text-slate-500 text-sm">Case {caseData.id.slice(0, 8).toUpperCase()} · {caseData.farmer?.name || 'Farmer'} · {caseData.scan?.crop || 'Crop'}</p></div>

      <div className="space-y-4">
        <ReportCard title={tx('1. Farmer Information', lang)}>
          <ReportLine label={tx('Submitted', lang)} value={new Date(caseData.created_at).toLocaleString()} /><ReportLine label={tx('Farmer', lang)} value={caseData.farmer?.name || '—'} /><ReportLine label={tx('Contact', lang)} value={caseData.farmer?.phone || '—'} /><ReportLine label={tx('Village / District', lang)} value={[caseData.farmer?.village, caseData.farmer?.district].filter(Boolean).join(' / ') || '—'} />
        </ReportCard>
        <ReportCard title={tx('2. Field Information', lang)}>
          <ReportLine label={tx('Location', lang)} value={[caseData.farmer?.village, caseData.farmer?.district, caseData.farmer?.state].filter(Boolean).join(', ') || '—'} /><ReportLine label={tx('Area', lang)} value={caseData.field?.area != null ? `${caseData.field.area} acres` : '—'} /><ReportLine label={tx('Soil', lang)} value={caseData.field?.soil_type || '—'} /><ReportLine label={tx('Irrigation', lang)} value={caseData.field?.irrigation_type || '—'} /><ReportLine label={tx('Water Source', lang)} value={caseData.field?.water_source || '—'} />
        </ReportCard>
        <ReportCard title={tx('3. Crop Information', lang)}>
          <ReportLine label={tx('Crop', lang)} value={caseData.crop?.crop || caseData.scan?.crop || '—'} /><ReportLine label={tx('Variety', lang)} value={caseData.crop?.variety || '—'} /><ReportLine label={tx('Sowing Date', lang)} value={caseData.crop?.sowing_date || '—'} />
        </ReportCard>
        <ReportCard title={tx('4. AI Diagnosis', lang)}>
          <ReportLine label={tx('AI Diagnosis', lang)} value={getScanDiagnosis(caseData.scan)} />
          <ReportLine label={tx('Disease', lang)} value={caseData.scan?.disease || 'Not detected / not provided'} />
          <ReportLine label={tx('Pest', lang)} value={getPestLabel(caseData.scan) || 'Not detected / not provided'} />
          <ReportLine label={tx('Confidence', lang)} value={`${Number(caseData.scan?.confidence || caseData.scan?.confidence_percent || 0).toFixed(2)}%`} />
          <ReportLine label={tx('Risk', lang)} value={`${caseData.scan?.risk || '—'} (${caseData.scan?.risk_score ?? '—'}/100)`} />
          <ReportLine label={tx('Advisory', lang)} value={caseData.scan?.advisory_summary || '—'} />
          <ReportLine label={tx('Image', lang)} value={caseData.scan?.image_filename || 'Crop image attached to submission'} />
        </ReportCard>

        {!submitted ? <>
          <ReportCard title={tx('5. Officer Validation', lang)}>
            <div className="grid grid-cols-2 gap-3"><button onClick={() => setAction('confirm')} className={`p-4 rounded-xl border-2 text-left ${action === 'confirm' ? 'border-green-500 bg-green-50' : 'border-slate-200 bg-white'}`}><div className="flex items-center gap-1.5 font-semibold text-green-700 text-sm"><CheckIcon className="w-4 h-4" /> {tx('Confirm Diagnosis', lang)}</div><div className="text-xs text-slate-500 mt-1">{tx('AI assessment is accurate', lang)}</div></button><button onClick={() => setAction('correct')} className={`p-4 rounded-xl border-2 text-left ${action === 'correct' ? 'border-amber-500 bg-amber-50' : 'border-slate-200 bg-white'}`}><div className="flex items-center gap-1.5 font-semibold text-amber-700 text-sm"><PencilIcon className="w-4 h-4" /> {tx('Correct Diagnosis', lang)}</div><div className="text-xs text-slate-500 mt-1">{tx('Provide expert correction', lang)}</div></button></div>
            {action === 'correct' && <div className="mt-3"><label className="block text-sm font-medium text-slate-700 mb-1.5">{tx('Validated Diagnosis', lang)}</label><input value={correction} onChange={e => setCorrection(e.target.value)} placeholder={tx('Enter corrected disease/pest', lang)} className="w-full border border-slate-200 rounded-lg px-3 py-2.5 text-sm" /></div>}
            {action && <div className="mt-3"><label className="block text-sm font-medium text-slate-700 mb-1.5">{tx('Officer Notes', lang)}</label><textarea value={notes} onChange={e => setNotes(e.target.value)} rows={3} placeholder={tx('Symptoms, context, history, validation notes...', lang)} className="w-full border border-slate-200 rounded-lg px-3 py-2.5 text-sm resize-none" /></div>}
          </ReportCard>

          <ReportCard title={tx('6. Recommendation & Guidance', lang)}>
            <FieldInput label={tx('Pesticide / Treatment', lang)} value={treatment} setValue={setTreatment} placeholder={tx('Recommended treatment', lang)} /><FieldInput label={tx('Dosage', lang)} value={dosage} setValue={setDosage} placeholder={tx('Dosage, if required', lang)} /><FieldInput label={tx('Application Method', lang)} value={applicationMethod} setValue={setApplicationMethod} placeholder={tx('How to apply', lang)} /><FieldInput label={tx('Weather-based Guidance', lang)} value={weatherGuidance} setValue={setWeatherGuidance} placeholder={tx('Timing / weather precautions', lang)} /><FieldInput label={tx('IPM Guidance', lang)} value={ipmGuidance} setValue={setIpmGuidance} placeholder={tx('Integrated pest management: cultural, biological and safe chemical measures', lang)} textarea /><FieldInput label={tx('Policy & Regulatory Guidance', lang)} value={policyRegulatoryGuidance} setValue={setPolicyRegulatoryGuidance} placeholder={tx('Approved-use, safety, label and local regulatory guidance', lang)} textarea /><FieldInput label={tx('Additional Agronomic Advice', lang)} value={additionalAdvice} setValue={setAdditionalAdvice} placeholder={tx('Additional advice', lang)} textarea />
          </ReportCard>

          <ReportCard title={tx('7. Government Scheme', lang)}>
            <FieldInput label={tx('Scheme Name', lang)} value={schemeName} setValue={setSchemeName} placeholder={tx('Relevant scheme, if applicable', lang)} /><FieldInput label={tx('Benefits', lang)} value={schemeBenefits} setValue={setSchemeBenefits} placeholder={tx('Benefits', lang)} /><FieldInput label={tx('Eligibility Criteria', lang)} value={schemeEligibility} setValue={setSchemeEligibility} placeholder={tx('Eligibility', lang)} /><FieldInput label={tx('How to Apply', lang)} value={schemeApplication} setValue={setSchemeApplication} placeholder={tx('Application process', lang)} textarea />
          </ReportCard>

          <ReportCard title={tx('8. Contact & Support Information', lang)}>
            <FieldInput label={tx('Regional Office', lang)} value={regionalOffice} setValue={setRegionalOffice} placeholder={tx('Office name', lang)} /><FieldInput label={tx('Services', lang)} value={servicesInfo} setValue={setServicesInfo} placeholder={tx('Services provided', lang)} /><FieldInput label={tx('Officer Contact', lang)} value={officerContact} setValue={setOfficerContact} placeholder={tx('Phone / contact', lang)} /><FieldInput label={tx('Officer Email', lang)} value={officerEmail} setValue={setOfficerEmail} placeholder={tx('Email', lang)} /><FieldInput label={tx('Office Address', lang)} value={officeAddress} setValue={setOfficeAddress} placeholder={tx('Office address', lang)} textarea />
          </ReportCard>

          <ReportCard title={tx('9. Follow-up Information', lang)}>
            <FieldInput label={tx('Next Follow-up Date', lang)} value={nextFollowupDate} setValue={setNextFollowupDate} type="date" /><FieldInput label={tx('What to Monitor', lang)} value={monitorInstructions} setValue={setMonitorInstructions} textarea /><FieldInput label={tx('When to Contact Officer', lang)} value={contactOfficerIf} setValue={setContactOfficerIf} textarea /><FieldInput label={tx('Important Instructions', lang)} value={importantInstructions} setValue={setImportantInstructions} textarea />
          </ReportCard>

          {error && <div className="bg-red-50 border border-red-200 text-red-700 rounded-xl p-3 text-sm">{error}</div>}
          <button disabled={!action || (action === 'correct' && !correction) || saving} onClick={submit} className="w-full bg-blue-700 disabled:bg-slate-300 text-white font-semibold py-3 rounded-lg">{saving ? 'Submitting response...' : 'Validate & Send Report to Farmer'}</button>
        </> : <div className="bg-green-50 border border-green-200 rounded-2xl p-6 text-center"><div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-green-100 text-green-700 mb-2"><CheckIcon className="w-6 h-6" /></div><h2 className="font-semibold text-green-800">{tx('Case Handled & Farmer Report Prepared', lang)}</h2><p className="text-green-700 text-sm mt-1">{tx('The structured officer response has been saved. The farmer will see Sections 1–9 in My Reports.', lang)}</p><button onClick={() => nav('validation')} className="mt-4 bg-blue-700 text-white font-semibold px-5 py-2.5 rounded-lg text-sm">{tx('Back to Case List', lang)}</button></div>}
      </div>
    </div>
  )
}

function ReportCard({ title, children }: { title: string; children: React.ReactNode }) { return <div className="bg-white border border-slate-200 rounded-xl overflow-hidden"><div className="px-4 py-3 bg-slate-50 border-b border-slate-100"><h3 className="text-sm font-semibold text-slate-800">{title}</h3></div><div className="p-4 space-y-2">{children}</div></div> }
function ReportLine({ label, value }: { label: string; value: string }) { return <div className="flex flex-col sm:flex-row sm:items-start gap-1 sm:gap-4 py-2 border-b border-slate-50 last:border-0"><span className="text-xs text-slate-500 sm:w-40">{label}</span><span className="text-sm font-medium text-slate-800">{value}</span></div> }
function FieldInput({ label, value, setValue, placeholder, textarea, type = 'text' }: { label: string; value: string; setValue: (v: string) => void; placeholder?: string; textarea?: boolean; type?: string }) { return <div><label className="block text-sm font-medium text-slate-700 mb-1.5">{label}</label>{textarea ? <textarea value={value} onChange={e => setValue(e.target.value)} rows={3} placeholder={placeholder} className="w-full border border-slate-200 rounded-lg px-3 py-2.5 text-sm resize-none" /> : <input type={type} value={value} onChange={e => setValue(e.target.value)} placeholder={placeholder} className="w-full border border-slate-200 rounded-lg px-3 py-2.5 text-sm" />}</div> }

function OfficerAlerts({ nav, setSelectedAlertIdx, lang = 'en' }: { nav: (p: OfficerPage) => void; setSelectedAlertIdx: (i: number) => void; lang?: AppLanguage }) {
  return (
    <div className="p-4 lg:p-6 max-w-4xl mx-auto">
      <h1 className="text-xl font-semibold text-slate-900 mb-1">{t('alertsTitle', lang)}</h1>
      <p className="text-slate-500 text-sm mb-4">Ahmedabad District · {OFFICER_ALERTS_DATA.filter(a => a.priority === 'high').length} high priority</p>

      <div className="space-y-3">
        {OFFICER_ALERTS_DATA.map((a, i) => (
          <div key={i} className={`bg-white border rounded-xl p-4 ${a.priority === 'high' ? 'border-red-200' : 'border-slate-200'}`}>
            <div className="flex items-start gap-3">
              <div className={`w-2 h-2 rounded-full flex-shrink-0 mt-2 ${a.priority === 'high' ? 'bg-red-500' : 'bg-amber-400'}`} />
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between mb-1">
                  <span className="font-semibold text-slate-900 text-sm">{tx(a.title, lang)}</span>
                  <span className="text-xs text-slate-400">{a.time}</span>
                </div>
                <div className="text-xs text-slate-500 mb-2">{a.location} · {tx('Crop', lang)}: {a.crop}</div>
                <p className="text-slate-600 text-xs leading-relaxed mb-3">{tx(a.body, lang)}</p>
                <div className="flex gap-2">
                  <button onClick={() => { setSelectedAlertIdx(i); nav('alert-detail') }}
                    className="text-xs bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium px-3 py-1.5 rounded transition-colors">
                    {tx('View Alert Details', lang)}
                  </button>
                  <button onClick={() => nav('focused-area')}
                    className="text-xs bg-blue-50 hover:bg-blue-100 text-blue-700 font-medium px-3 py-1.5 rounded transition-colors">
                    {tx('View Cluster Map', lang)}
                  </button>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

function OfficerAlertDetail({ nav, idx, lang = 'en' }: { nav: (p: OfficerPage) => void; idx: number; lang?: AppLanguage }) {
  const a = OFFICER_ALERTS_DATA[idx] || OFFICER_ALERTS_DATA[0]
  return (
    <div className="p-4 lg:p-6 max-w-3xl mx-auto">
      <BackButton label={t('backToAlerts', lang)} onClick={() => nav('alerts')} />
      <div className={`inline-flex items-center gap-1.5 text-xs font-bold uppercase px-2.5 py-1 rounded-full mb-3 ${a.priority === 'high' ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-amber-700'}`}>
        {a.priority === 'high' ? tx('High Priority Alert', lang) : tx('Monitor Alert', lang)}
      </div>
      <h1 className="text-xl font-semibold text-slate-900 mb-1">{tx(a.title, lang)}</h1>
      <p className="text-slate-500 text-sm mb-4">{tx('Region:', lang)} {a.region} · {a.time}</p>

      <div className="bg-white border border-slate-200 rounded-xl p-4 mb-4">
        <p className="text-slate-700 leading-relaxed">{tx(a.body, lang)}</p>
      </div>

      <div className="bg-white border border-slate-200 rounded-xl divide-y divide-slate-100 mb-4">
        {[
          { label: tx('Affected Area', lang), val: a.region },
          { label: tx('Alert Type', lang), val: a.priority === 'high' ? tx('High Priority', lang) : tx('Monitor', lang) },
          { label: tx('Reports Triggering Alert', lang), val: '47 reports' },
          { label: tx('Recommended Action', lang), val: tx('Assign extension visit; issue farmer advisory', lang) },
        ].map((row) => (
          <div key={row.label} className="flex items-start gap-4 px-4 py-3">
            <span className="text-sm text-slate-500 w-40 flex-shrink-0">{row.label}</span>
            <span className="text-sm font-medium text-slate-800">{row.val}</span>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-2 gap-3">
        <button onClick={() => nav('focused-area')} className="bg-blue-700 hover:bg-blue-600 text-white font-semibold py-3 rounded-lg text-sm transition-colors">
          {tx('View Cluster Map', lang)}
        </button>
        <button onClick={() => nav('validation')} className="bg-white border border-slate-200 text-slate-700 font-semibold py-3 rounded-lg text-sm hover:bg-slate-50 transition-colors">
          {tx('Review Related Cases', lang)}
        </button>
      </div>
    </div>
  )
}

function OfficerReports({ nav, lang = 'en' }: { nav: (p: OfficerPage) => void; lang?: AppLanguage }) {
  const chartData = [
    { month: 'Mar', cases: 48 }, { month: 'Apr', cases: 62 }, { month: 'May', cases: 74 },
    { month: 'Jun', cases: 95 }, { month: 'Jul', cases: 112 }, { month: 'Aug', cases: 138 },
  ]
  const maxCases = Math.max(...chartData.map((d) => d.cases))

  return (
    <div className="p-4 lg:p-6 max-w-6xl mx-auto">
      <BackButton label={t('backToDashboard', lang)} onClick={() => nav('dashboard')} />
      <h1 className="text-xl font-semibold text-slate-900 mb-4">{t('officerReports', lang)}</h1>

      {/* Summary row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {[
          { label: 'Avg Response Time', val: '6.2 hrs', sub: 'From report to validation' },
          { label: 'Confirmation Rate', val: '69%', sub: 'AI accuracy validated' },
          { label: 'Hotspot Growth', val: '+24%', sub: 'vs last month' },
          { label: 'Preventive Actions', val: '38', sub: 'Interventions assigned' },
        ].map((s) => (
          <div key={s.label} className="bg-white border border-slate-200 rounded-xl p-4">
            <div className="text-xl font-bold text-slate-900 mb-0.5">{s.val}</div>
            <div className="text-sm text-slate-700 font-medium mb-0.5">{s.label}</div>
            <div className="text-xs text-slate-400">{s.sub}</div>
          </div>
        ))}
      </div>

      <div className="grid lg:grid-cols-2 gap-4 mb-4">
        {/* Disease trend chart */}
        <div className="bg-white border border-slate-200 rounded-xl p-4">
          <h2 className="font-semibold text-slate-800 text-sm mb-4">{tx('Disease Reports — Last 6 Months', lang)}</h2>
          <div className="flex items-end gap-2 h-32">
            {chartData.map((d) => (
              <div key={d.month} className="flex-1 flex flex-col items-center gap-1">
                <div className="text-xs text-slate-500">{d.cases}</div>
                <div className="w-full bg-blue-500 rounded-t" style={{ height: `${(d.cases / maxCases) * 80}px` }} />
                <div className="text-xs text-slate-500">{d.month}</div>
              </div>
            ))}
          </div>
        </div>

        {/* District-wise risk */}
        <div className="bg-white border border-slate-200 rounded-xl p-4">
          <h2 className="font-semibold text-slate-800 text-sm mb-3">{tx('District-wise Risk', lang)}</h2>
          <div className="space-y-2">
            {DISTRICT_DATA.slice(0, 5).map((d) => {
              const c = getRiskColor(d.risk)
              return (
                <div key={d.id} className="flex items-center gap-3">
                  <span className="text-sm text-slate-600 w-24">{d.name}</span>
                  <div className="flex-1 bg-slate-100 rounded-full h-2 overflow-hidden">
                    <div className="h-full rounded-full" style={{ width: `${(d.reports / 50) * 100}%`, backgroundColor: c.fill }} />
                  </div>
                  <span className="text-xs text-slate-500 w-12 text-right">{d.reports} rpts</span>
                </div>
              )
            })}
          </div>
        </div>
      </div>

      <div className="grid lg:grid-cols-2 gap-4">
        {/* Confirmed vs pending */}
        <div className="bg-white border border-slate-200 rounded-xl p-4">
          <h2 className="font-semibold text-slate-800 text-sm mb-4">{tx('Case Status Distribution', lang)}</h2>
          <div className="flex items-center gap-4">
            <div className="relative w-28 h-28 flex-shrink-0">
              <svg viewBox="0 0 36 36" className="w-full h-full -rotate-90">
                <circle cx="18" cy="18" r="15.9155" fill="none" stroke="#e2e8f0" strokeWidth="3" />
                <circle cx="18" cy="18" r="15.9155" fill="none" stroke="#22c55e" strokeWidth="3"
                  strokeDasharray="69 31" strokeLinecap="round" />
                <circle cx="18" cy="18" r="15.9155" fill="none" stroke="#f59e0b" strokeWidth="3"
                  strokeDasharray="21 79" strokeDashoffset="-69" strokeLinecap="round" />
              </svg>
              <div className="absolute inset-0 flex items-center justify-center text-sm font-bold text-slate-700">892</div>
            </div>
            <div className="space-y-2">
              {[['Confirmed', '69%', 'bg-green-500'], ['Under Review', '21%', 'bg-amber-400'], ['Pending', '10%', 'bg-slate-300']].map(([l, v, c]) => (
                <div key={l} className="flex items-center gap-2">
                  <div className={`w-2.5 h-2.5 rounded-full ${c}`} />
                  <span className="text-sm text-slate-700">{l}</span>
                  <span className="text-sm font-bold text-slate-900 ml-auto">{v}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Response time */}
        <div className="bg-white border border-slate-200 rounded-xl p-4">
          <h2 className="font-semibold text-slate-800 text-sm mb-3">{tx('Hotspot Growth Trend', lang)}</h2>
          <div className="space-y-2.5">
            {['Rice Blast', 'Pink Bollworm', 'Wheat Rust', 'Leaf Spot'].map((t, i) => {
              const vals = [78, 58, 42, 22]
              return (
                <div key={t} className="flex items-center gap-3">
                  <span className="text-sm text-slate-600 flex-1">{t}</span>
                  <div className="w-24 bg-slate-100 rounded-full h-2 overflow-hidden">
                    <div className={`h-full rounded-full ${i < 2 ? 'bg-red-500' : i === 2 ? 'bg-amber-400' : 'bg-green-500'}`} style={{ width: `${vals[i]}%` }} />
                  </div>
                  <span className="text-xs text-slate-500 w-8 text-right">{vals[i]}%</span>
                </div>
              )
            })}
          </div>
        </div>
      </div>
    </div>
  )
}

function OfficerProfile({ nav, lang = 'en' }: { nav: (p: OfficerPage) => void; lang?: AppLanguage }) {
  const { navigate: globalNav, setLang } = useAppNav()
  return (
    <div className="p-4 lg:p-6 max-w-2xl mx-auto">
      <BackButton label={tx('Back to Dashboard', lang)} onClick={() => nav('dashboard')} />
      <h1 className="text-xl font-semibold text-slate-900 mb-4">{tx('Officer Profile', lang)}</h1>

      <div className="flex items-center gap-4 mb-6">
        <div className="w-16 h-16 bg-blue-700 rounded-full flex items-center justify-center text-white text-2xl font-bold">SO</div>
        <div>
          <div className="font-semibold text-slate-900">Sunita Officer</div>
          <div className="text-slate-500 text-sm">{tx('Extension Officer · Ahmedabad District', lang)}</div>
          <div className="text-blue-600 text-xs mt-0.5">Officer ID: AGO-2241</div>
        </div>
      </div>

      <div className="space-y-3">
        <ProfileSection title={tx('Officer Information', lang)}>
          <ProfileRow label={tx('Name', lang)} val="Sunita Officer" />
          <ProfileRow label={tx('Employee ID', lang)} val="AGO-2241" />
          <ProfileRow label={tx('Department', lang)} val="Agriculture Extension" />
          <ProfileRow label={tx('Role', lang)} val="Senior Extension Officer" />
        </ProfileSection>
        <ProfileSection title={tx('Assignment', lang)}>
          <ProfileRow label={tx('District', lang)} val="Ahmedabad District" />
          <ProfileRow label={tx('Zone', lang)} val="North & Central Gujarat" />
          <ProfileRow label={tx('Cases Validated', lang)} val="234 this year" />
        </ProfileSection>
        <ProfileSection title={tx('Notification Settings', lang)}>
          {[
            { label: 'High Priority Alerts', on: true },
            { label: 'New Validation Requests', on: true },
            { label: 'Regional Hotspot Alerts', on: true },
            { label: 'Daily Summary Report', on: false },
          ].map((n) => (
            <div key={n.label} className="flex items-center justify-between px-4 py-3 border-b border-slate-50 last:border-0">
              <span className="text-sm text-slate-700">{n.label}</span>
              <div className={`w-10 h-5 rounded-full ${n.on ? 'bg-blue-500' : 'bg-slate-200'} relative`}>
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

// ────────────────────────── SHARED ──────────────────────────

function BackButton({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <button onClick={onClick} className="flex items-center gap-1.5 text-blue-700 hover:text-blue-600 text-sm font-medium mb-4 transition-colors">
      <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="m15 18-6-6 6-6" /></svg>
      {label}
    </button>
  )
}

function ProfileSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
      <div className="px-4 py-2.5 bg-slate-50 border-b border-slate-100">
        <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-500">{title}</h3>
      </div>
      {children}
    </div>
  )
}

function ProfileRow({ label, val }: { label: string; val: string }) {
  return (
    <div className="flex items-center justify-between px-4 py-3 border-b border-slate-50 last:border-0">
      <span className="text-sm text-slate-500">{label}</span>
      <span className="text-sm font-medium text-slate-800">{val}</span>
    </div>
  )
}

// Icons
function DashIcon({ className }: { className?: string }) {
  return <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="7" height="7" /><rect x="14" y="3" width="7" height="7" /><rect x="14" y="14" width="7" height="7" /><rect x="3" y="14" width="7" height="7" /></svg>
}
function MapIcon({ className }: { className?: string }) {
  return <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="3 6 9 3 15 6 21 3 21 18 15 21 9 18 3 21" /><line x1="9" y1="3" x2="9" y2="18" /><line x1="15" y1="6" x2="15" y2="21" /></svg>
}
function ValidIcon({ className }: { className?: string }) {
  return <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 11l3 3L22 4" /><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" /></svg>
}
function BellIcon({ className }: { className?: string }) {
  return <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" /><path d="M13.73 21a2 2 0 0 1-3.46 0" /></svg>
}
function ChartBarIcon({ className }: { className?: string }) {
  return <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="20" x2="18" y2="10" /><line x1="12" y1="20" x2="12" y2="4" /><line x1="6" y1="20" x2="6" y2="14" /><line x1="2" y1="20" x2="22" y2="20" /></svg>
}
function UserIcon({ className }: { className?: string }) {
  return <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" /></svg>
}
function ShieldCheckIcon({ className }: { className?: string }) {
  return <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" /><path d="m9 12 2 2 4-4" /></svg>
}
function PinIcon({ className }: { className?: string }) {
  return <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z" /><circle cx="12" cy="10" r="3" /></svg>
}
function MenuIcon({ className }: { className?: string }) {
  return <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="3" y1="6" x2="21" y2="6" /><line x1="3" y1="12" x2="21" y2="12" /><line x1="3" y1="18" x2="21" y2="18" /></svg>
}
function CheckIcon({ className }: { className?: string }) {
  return <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg>
}
function PencilIcon({ className }: { className?: string }) {
  return <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z" /></svg>
}
function AlertIcon({ className }: { className?: string }) {
  return <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m10.29 3.86-8.2 14.15A2 2 0 0 0 3.82 21h16.36a2 2 0 0 0 1.73-3L13.71 3.86a2 2 0 0 0-3.42 0z" /><line x1="12" y1="9" x2="12" y2="13" /><line x1="12" y1="17" x2="12.01" y2="17" /></svg>
}
function ReportIcon({ className }: { className?: string }) {
  return <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><polyline points="14 2 14 8 20 8" /><line x1="16" y1="13" x2="8" y2="13" /><line x1="16" y1="17" x2="8" y2="17" /></svg>
}
function LogoutIcon({ className }: { className?: string }) {
  return <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" /><polyline points="16 17 21 12 16 7" /><line x1="21" y1="12" x2="9" y2="12" /></svg>
}
