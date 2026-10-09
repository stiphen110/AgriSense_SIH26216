import React, { useState, useEffect } from 'react'
import { t, AppLanguage } from '../lib/i18n'
import { useAppNav } from '../App'
import { useAudioAdvisory } from '../lib/useAudioAdvisory'
import { FieldNodeDiagnosticsModal } from './FieldNodeDiagnosticsModal'

export interface TelemetryData {
  hardware_node: {
    node_id: string
    status: string
    battery_level: number
    last_sync: string
    edge_model_version: string
  }
  current_readings: {
    soil_moisture_percent: number
    ambient_temperature_c: number
    humidity_percent: number
    soil_temperature_c: number
  }
  smart_irrigation: {
    water_stress_index: number
    irrigation_status: string
    recommendation: string
  }
  environmental_risks: {
    heat_stress_warning: boolean
    drought_risk: boolean
    flood_risk: boolean
    disease_outbreak_risk: boolean
  }
  edge_vision_alerts?: Array<{
    id: string
    type: string
    confidence: number
    description: string
    action_required: boolean
  }>
  hourly_history?: Array<{
    time: string
    soil_moisture: number
    temperature: number
  }>
}

interface Props {
  lang?: AppLanguage
}

// Battery Icon helper with dynamic fill based on battery_level
function BatteryIcon({ level, className = 'w-5 h-5' }: { level: number; className?: string }) {
  const isLow = level <= 25
  const isMedium = level > 25 && level <= 60
  const fillColor = isLow ? 'fill-red-500' : isMedium ? 'fill-amber-500' : 'fill-emerald-500'
  const width = Math.max(2, Math.min(14, Math.round((level / 100) * 14)))

  return (
    <div className={`relative inline-flex items-center gap-1 ${className}`}>
      <svg className="w-6 h-6 text-stone-700" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <rect x="2" y="6" width="16" height="12" rx="2" ry="2" />
        <line x1="20" y1="10" x2="20" y2="14" strokeWidth="2" strokeLinecap="round" />
        <rect x="3.5" y="7.5" width={width} height="9" rx="1" className={fillColor} stroke="none" />
      </svg>
      <span className="text-xs font-bold text-stone-800">{level}%</span>
    </div>
  )
}

// Radial Gauge for percentages & temperatures
function RadialGauge({
  value,
  max = 100,
  label,
  unit = '%',
  color = 'emerald',
}: {
  value: number
  max?: number
  label: string
  unit?: string
  color?: 'emerald' | 'blue' | 'amber' | 'orange'
}) {
  const percentage = Math.min(100, Math.max(0, (value / max) * 100))
  const strokeDasharray = 251.2 // 2 * pi * 40
  const strokeDashoffset = strokeDasharray - (strokeDasharray * percentage) / 100

  const colorMap = {
    emerald: { stroke: 'stroke-emerald-600', bg: 'bg-emerald-50', text: 'text-emerald-700' },
    blue: { stroke: 'stroke-blue-600', bg: 'bg-blue-50', text: 'text-blue-700' },
    amber: { stroke: 'stroke-amber-500', bg: 'bg-amber-50', text: 'text-amber-700' },
    orange: { stroke: 'stroke-orange-500', bg: 'bg-orange-50', text: 'text-orange-700' },
  }

  const activeColor = colorMap[color] || colorMap.emerald

  return (
    <div className="flex flex-col items-center bg-white border border-stone-200/80 rounded-2xl p-4 shadow-sm hover:shadow-md transition-shadow">
      <div className="relative w-24 h-24 flex items-center justify-center mb-2">
        <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
          <circle
            cx="50"
            cy="50"
            r="40"
            className="stroke-stone-100"
            strokeWidth="10"
            fill="transparent"
          />
          <circle
            cx="50"
            cy="50"
            r="40"
            className={`${activeColor.stroke} transition-all duration-700 ease-out`}
            strokeWidth="10"
            strokeDasharray={strokeDasharray}
            strokeDashoffset={strokeDashoffset}
            strokeLinecap="round"
            fill="transparent"
          />
        </svg>
        <div className="absolute flex flex-col items-center justify-center text-center">
          <span className="text-lg font-bold text-stone-900 leading-none">
            {value}
            <span className="text-xs font-normal text-stone-500 ml-0.5">{unit}</span>
          </span>
        </div>
      </div>
      <span className="text-xs font-medium text-stone-600 text-center">{label}</span>
    </div>
  )
}

export function EdgeTelemetryDashboard({ lang = 'en' }: Props) {
  const { edgeMode, addOfflineAction } = useAppNav()
  const { speak: speakAdvisory, isPlaying: isAudioPlaying } = useAudioAdvisory(lang)
  const [telemetry, setTelemetry] = useState<TelemetryData | null>(null)
  const [loading, setLoading] = useState<boolean>(true)
  const [error, setError] = useState<string | null>(null)
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null)
  const [diagnosticsOpen, setDiagnosticsOpen] = useState<boolean>(false)
  const [smsModalOpen, setSmsModalOpen] = useState<boolean>(false)
  const [smsTextPayload, setSmsTextPayload] = useState<string>('')

  const fetchTelemetry = async () => {
    try {
      const response = await fetch('/telemetry_mock.json?t=' + Date.now())
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }
      const data: TelemetryData = await response.json()
      setTelemetry(data)
      setLastUpdated(new Date())
      setError(null)
    } catch (err: any) {
      console.error('Failed to fetch telemetry data:', err)
      setError(err?.message || 'Failed to connect to edge node')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchTelemetry()
    // Poll every 5 seconds for live demo responsiveness
    const intervalId = setInterval(() => {
      fetchTelemetry()
    }, 5000)

    return () => clearInterval(intervalId)
  }, [])

  if (loading && !telemetry) {
    return (
      <div className="bg-white border border-stone-200 rounded-2xl p-6 shadow-sm animate-pulse space-y-4">
        <div className="h-6 bg-stone-200 rounded w-1/3"></div>
        <div className="h-20 bg-stone-100 rounded-xl"></div>
        <div className="grid grid-cols-3 gap-3">
          <div className="h-28 bg-stone-100 rounded-xl"></div>
          <div className="h-28 bg-stone-100 rounded-xl"></div>
          <div className="h-28 bg-stone-100 rounded-xl"></div>
        </div>
      </div>
    )
  }

  if (error && !telemetry) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-2xl p-4 text-red-700 text-sm flex items-center justify-between">
        <span>{t('telemetryFetchError', lang) || 'Unable to load edge node telemetry.'}</span>
        <button
          onClick={fetchTelemetry}
          className="bg-red-600 text-white px-3 py-1 rounded-lg text-xs font-semibold hover:bg-red-700"
        >
          {t('retry', lang) || 'Retry'}
        </button>
      </div>
    )
  }

  if (!telemetry) return null

  const { hardware_node, current_readings, smart_irrigation, environmental_risks, edge_vision_alerts } = telemetry

  const isIrrigateNow = smart_irrigation.recommendation.toLowerCase().includes('irrigate')
  const hasEnvironmentalRisks =
    environmental_risks.heat_stress_warning ||
    environmental_risks.drought_risk ||
    environmental_risks.flood_risk ||
    environmental_risks.disease_outbreak_risk

  return (
    <div className="space-y-4 my-4">
      {/* Header section with live indicator */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="relative flex h-3 w-3">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500"></span>
          </div>
          <h2 className="text-base font-bold text-stone-900 tracking-tight">
            {t('telemetryHeader', lang)}
          </h2>
          <span className="bg-emerald-100 text-emerald-800 text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider">
            {t('edgeLive', lang)}
          </span>
        </div>
        {lastUpdated && (
          <span className="text-[11px] text-stone-500 font-medium">
            {t('lastSynced', lang)}: {lastUpdated.toLocaleTimeString()}
          </span>
        )}
      </div>

      {/* 5. Environmental Risk Banners */}
      {hasEnvironmentalRisks && (
        <div className="space-y-2">
          {environmental_risks.heat_stress_warning && (
            <div className="bg-gradient-to-r from-orange-500 to-amber-600 text-white p-3.5 rounded-xl shadow-sm flex items-center justify-between">
              <div className="flex items-center gap-3">
                <span className="p-1.5 bg-white/20 rounded-lg">🔥</span>
                <div>
                  <h4 className="font-bold text-xs uppercase tracking-wide">
                    {t('heatStressWarningTitle', lang)}
                  </h4>
                  <p className="text-xs text-orange-100">
                    {t('heatStressWarningDesc', lang)}
                  </p>
                </div>
              </div>
              <span className="bg-white/20 text-white text-[10px] font-bold px-2 py-1 rounded-md">
                {t('activeAlert', lang)}
              </span>
            </div>
          )}

          {environmental_risks.drought_risk && (
            <div className="bg-gradient-to-r from-amber-600 to-red-600 text-white p-3.5 rounded-xl shadow-sm flex items-center justify-between">
              <div className="flex items-center gap-3">
                <span className="p-1.5 bg-white/20 rounded-lg">☀️</span>
                <div>
                  <h4 className="font-bold text-xs uppercase tracking-wide">
                    {t('droughtRiskTitle', lang)}
                  </h4>
                  <p className="text-xs text-amber-100">
                    {t('droughtRiskDesc', lang)}
                  </p>
                </div>
              </div>
              <span className="bg-white/20 text-white text-[10px] font-bold px-2 py-1 rounded-md">
                {t('highRisk', lang)}
              </span>
            </div>
          )}
        </div>
      )}

      {/* 2. Hardware Status Card */}
      <div className="bg-stone-900 text-white rounded-2xl p-4 shadow-md relative overflow-hidden">
        <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/10 rounded-full blur-2xl pointer-events-none"></div>
        <div className="flex items-center justify-between pb-3 border-b border-stone-800 mb-3">
          <div className="flex items-center gap-2.5">
            <button
              onClick={() => setDiagnosticsOpen(true)}
              className="w-8 h-8 rounded-lg bg-stone-800 hover:bg-stone-700 flex items-center justify-center border border-stone-700 transition-colors cursor-pointer"
              title={t('clickForDiagnostics', lang) || 'Click for Field Node Diagnostics'}
            >
              <span className="text-emerald-400 font-mono text-xs">📶</span>
            </button>
            <button
              onClick={() => setDiagnosticsOpen(true)}
              className="text-left group cursor-pointer"
              title={t('clickForDiagnostics', lang) || 'Click for Field Node Diagnostics'}
            >
              <div className="text-xs font-semibold text-stone-300 group-hover:text-emerald-300 transition-colors flex items-center gap-1">
                <span>{t('nodeIdLabel', lang)}</span>
                <span className="text-[10px] text-stone-500 group-hover:text-emerald-400">⚙️</span>
              </div>
              <div className="text-sm font-bold font-mono text-emerald-400 group-hover:underline flex items-center gap-1.5">
                <span>{hardware_node.node_id}</span>
                <span className="text-[9px] bg-emerald-950 text-emerald-300 border border-emerald-800/80 px-1.5 py-0.2 rounded font-sans font-bold uppercase">
                  {t('diagnosticsBtn', lang) || 'Inspect'}
                </span>
              </div>
            </button>
          </div>
          <div className="flex items-center gap-3">
            <BatteryIcon level={hardware_node.battery_level} />
            <span className="bg-emerald-950 text-emerald-300 border border-emerald-800 text-[11px] font-semibold px-2.5 py-1 rounded-full flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
              {t('localConnection', lang)}
            </span>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2 text-xs text-stone-400">
          <div>
            <span className="text-stone-500">{t('edgeModelLabel', lang)}:</span>{' '}
            <span className="text-stone-200 font-mono">{hardware_node.edge_model_version}</span>
          </div>
          <div className="text-right">
            <span className="text-stone-500">{t('statusLabel', lang)}:</span>{' '}
            <span className="text-emerald-400 font-medium capitalize">{hardware_node.status}</span>
          </div>
        </div>
      </div>

      {/* 4. Smart Irrigation Panel */}
      <div
        className={`rounded-2xl p-4 border transition-all ${
          isIrrigateNow
            ? 'bg-gradient-to-br from-amber-50 to-orange-50 border-orange-300 shadow-sm'
            : 'bg-gradient-to-br from-emerald-50 to-teal-50 border-emerald-200 shadow-sm'
        }`}
      >
        <div className="flex items-start justify-between mb-3">
          <div>
            <span className="text-xs font-bold uppercase tracking-wider text-stone-500">
              {t('smartIrrigationTitle', lang)}
            </span>
            <h3 className="text-lg font-extrabold text-stone-900 flex items-center gap-2 mt-0.5">
              💧 {smart_irrigation.recommendation === 'Irrigate Now'
                ? t('irrigateNow', lang)
                : smart_irrigation.recommendation === 'Delay Irrigation'
                ? t('delayIrrigation', lang)
                : smart_irrigation.recommendation}
            </h3>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                const recText = smart_irrigation.recommendation === 'Irrigate Now'
                  ? t('irrigateNow', lang)
                  : smart_irrigation.recommendation === 'Delay Irrigation'
                  ? t('delayIrrigation', lang)
                  : smart_irrigation.recommendation
                const textToRead = `${t('smartIrrigationTitle', lang)}. ${t('recommendation', lang)}: ${recText}. ${t('waterStressIndex', lang)}: ${(smart_irrigation.water_stress_index * 100).toFixed(0)} percent.`
                speakAdvisory(textToRead)
              }}
              className={`p-1.5 rounded-xl border flex items-center gap-1 text-xs font-semibold transition-all cursor-pointer ${
                isAudioPlaying
                  ? 'bg-amber-600 text-white border-amber-700 animate-pulse shadow-md'
                  : 'bg-white hover:bg-stone-50 text-stone-700 border-stone-300 shadow-2xs'
              }`}
              title={isAudioPlaying ? (t('stopAudio', lang) || 'Stop Audio') : (t('listenAdvisory', lang) || 'Listen to Advisory')}
            >
              <span className="text-sm">{isAudioPlaying ? '🔊' : '📢'}</span>
              <span className="hidden sm:inline">
                {isAudioPlaying ? (t('stopAudio', lang) || 'Stop') : (t('listenAdvisory', lang) || 'Listen')}
              </span>
            </button>

            <span
              className={`px-3 py-1 rounded-full text-xs font-extrabold tracking-wide uppercase shadow-sm ${
                isIrrigateNow
                  ? 'bg-orange-600 text-white animate-pulse'
                  : 'bg-emerald-600 text-white'
              }`}
            >
              {isIrrigateNow ? t('actionRequired', lang) : t('safeState', lang)}
            </span>
          </div>
        </div>

        <div className="space-y-2 mt-2 pt-2 border-t border-stone-200/60">
          <div className="flex justify-between text-xs font-medium">
            <span className="text-stone-600">{t('waterStressIndex', lang)}</span>
            <span className="font-bold text-stone-800">
              {(smart_irrigation.water_stress_index * 100).toFixed(0)}%
            </span>
          </div>
          <div className="w-full bg-stone-200 rounded-full h-2.5 overflow-hidden">
            <div
              className={`h-2.5 rounded-full transition-all duration-500 ${
                smart_irrigation.water_stress_index > 0.7
                  ? 'bg-orange-500'
                  : smart_irrigation.water_stress_index > 0.4
                  ? 'bg-amber-500'
                  : 'bg-emerald-500'
              }`}
              style={{ width: `${smart_irrigation.water_stress_index * 100}%` }}
            ></div>
          </div>
          <div className="flex justify-between text-[11px] text-stone-500 pt-1">
            <span>{t('statusLabel', lang)}: <strong className="text-stone-700 uppercase">{smart_irrigation.irrigation_status}</strong></span>
            <span>{t('soilTemp', lang)}: <strong className="text-stone-700">{current_readings.soil_temperature_c}°C</strong></span>
          </div>
          <div className="pt-2 border-t border-stone-200/40 flex flex-wrap items-center justify-end gap-2">
            <button
              onClick={() => {
                const moistureVal = current_readings.soil_moisture_percent ?? 25
                let smsMsg = `[AgriSense Alert] Field-1: Soil moisture is ${moistureVal}%. Irrigate Cotton crop immediately.`
                if (lang === 'hi') {
                  smsMsg = `[AgriSense Alert] खेत-1: मिट्टी में नमी ${moistureVal}% है। कपास की फसल के लिए तुरंत सिंचाई करें।`
                } else if (lang === 'gu') {
                  smsMsg = `[AgriSense Alert] ખેતર-1: જમીનમાં ભેજ ${moistureVal}% છે. કપાસના પાક માટે તાત્કાલિક પાણી આપો.`
                }
                setSmsTextPayload(smsMsg)
                setSmsModalOpen(true)
                if (edgeMode === 'edge') {
                  addOfflineAction('sms_dispatch', { payload: smsMsg, timestamp: new Date().toISOString() })
                }
              }}
              className="bg-amber-600 hover:bg-amber-700 text-white text-xs font-semibold px-3 py-1 rounded-lg shadow-2xs transition-colors flex items-center gap-1.5 cursor-pointer"
              title={t('sendSmsBtn', lang) || 'Send to Basic Feature Phone'}
            >
              <span>📱</span>
              <span>{t('sendSmsBtn', lang) || 'Send to Basic Feature Phone'}</span>
            </button>

            <button
              onClick={() => {
                addOfflineAction('irrigation_action', {
                  recommendation: smart_irrigation.recommendation,
                  water_stress_index: smart_irrigation.water_stress_index,
                  timestamp: new Date().toISOString(),
                })
              }}
              className="bg-white/80 hover:bg-white text-stone-800 border border-stone-300 text-xs font-semibold px-3 py-1 rounded-lg shadow-2xs transition-colors flex items-center gap-1.5 cursor-pointer"
            >
              <span>📥</span>
              <span>{edgeMode === 'edge' ? (t('queueOfflineAction', lang) || 'Queue Offline Action') : (t('logIrrigationAction', lang) || 'Log Irrigation Action')}</span>
            </button>
          </div>
        </div>
      </div>

      {/* 3. Sensor Gauges */}
      <div>
        <h3 className="text-xs font-bold text-stone-600 uppercase tracking-wide mb-2 px-1">
          {t('sensorReadingsTitle', lang)}
        </h3>
        <div className="grid grid-cols-3 gap-2.5">
          <RadialGauge
            value={current_readings.soil_moisture_percent}
            label={t('soilMoisture', lang)}
            unit="%"
            color={current_readings.soil_moisture_percent < 40 ? 'orange' : 'emerald'}
          />
          <RadialGauge
            value={current_readings.ambient_temperature_c}
            max={50}
            label={t('ambientTemp', lang)}
            unit="°C"
            color={current_readings.ambient_temperature_c > 35 ? 'amber' : 'blue'}
          />
          <RadialGauge
            value={current_readings.humidity_percent}
            label={t('humidity', lang)}
            unit="%"
            color="blue"
          />
        </div>
      </div>

      {/* Edge Vision Detections (if present) */}
      {edge_vision_alerts && edge_vision_alerts.length > 0 && (
        <div className="bg-white border border-stone-200 rounded-2xl p-4 shadow-sm">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-base">📸</span>
            <h4 className="text-xs font-bold uppercase tracking-wide text-stone-700">
              {t('edgeVisionTitle', lang)}
            </h4>
          </div>
          {edge_vision_alerts.map((alert) => (
            <div key={alert.id} className="bg-amber-50 border border-amber-200 rounded-xl p-3 flex items-start justify-between">
              <div>
                <div className="text-xs font-bold text-amber-900">{alert.description}</div>
                <div className="text-[11px] text-amber-700 mt-0.5">
                  {t('confidenceLabel', lang)}: {(alert.confidence * 100).toFixed(0)}%
                </div>
              </div>
              <span className="bg-amber-200 text-amber-900 text-[10px] font-bold px-2 py-0.5 rounded">
                {t('actionRequired', lang)}
              </span>
            </div>
          ))}
        </div>
      )}

      {/* Field Node Diagnostics Modal */}
      <FieldNodeDiagnosticsModal
        isOpen={diagnosticsOpen}
        onClose={() => setDiagnosticsOpen(false)}
        nodeId={hardware_node.node_id}
        edgeModelVersion={hardware_node.edge_model_version}
        lang={lang}
      />

      {/* Simulated SMS Dispatched Modal */}
      {smsModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-950/80 backdrop-blur-xs animate-fadeIn">
          <div className="absolute inset-0" onClick={() => setSmsModalOpen(false)} />
          <div className="relative w-full max-w-sm bg-stone-900 text-stone-100 rounded-2xl border border-stone-800 p-5 shadow-2xl space-y-3.5 z-10">
            <div className="flex items-center justify-between pb-2 border-b border-stone-800">
              <div className="flex items-center gap-2 text-xs font-bold text-emerald-400">
                <span className="p-1 bg-emerald-950 border border-emerald-800 rounded">📱</span>
                <span>{t('smsDispatchedTitle', lang) || 'SMS Dispatched (Feature Phone GSM)'}</span>
              </div>
              <button
                onClick={() => setSmsModalOpen(false)}
                className="w-7 h-7 rounded-full bg-stone-800 hover:bg-stone-700 text-stone-400 hover:text-white flex items-center justify-center transition-colors cursor-pointer text-xs"
              >
                ✕
              </button>
            </div>

            <div className="text-[11px] text-stone-400">
              {t('smsTargetNumber', lang) || 'Sent to registered mobile: +91 98765 43210'}
            </div>

            <div className="bg-stone-950 border border-emerald-500/40 p-3.5 rounded-xl font-mono text-xs text-emerald-300 leading-relaxed shadow-inner">
              {smsTextPayload}
            </div>

            <div className="flex justify-between items-center text-[10px] text-stone-500 font-mono">
              <span>GSM 7-bit Plain Text</span>
              <span>{smsTextPayload.length} / 160 Chars</span>
            </div>

            <button
              onClick={() => setSmsModalOpen(false)}
              className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-semibold py-2 rounded-xl text-xs transition-colors cursor-pointer"
            >
              {t('navClose', lang) || 'Close'}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
