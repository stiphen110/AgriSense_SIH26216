import React, { useState } from 'react'
import { t, AppLanguage } from '../lib/i18n'

interface Props {
  isOpen: boolean
  onClose: () => void
  nodeId?: string
  edgeModelVersion?: string
  lang?: AppLanguage
}

export function FieldNodeDiagnosticsModal({
  isOpen,
  onClose,
  nodeId = 'AGRI-EDGE-001',
  edgeModelVersion = 'YOLOv8-Nano-Quantized',
  lang = 'en',
}: Props) {
  const [isPinging, setIsPinging] = useState<boolean>(false)
  const [pingResult, setPingResult] = useState<{ latency: number; timestamp: string } | null>(null)

  if (!isOpen) return null

  const handlePing = () => {
    setIsPinging(true)
    setPingResult(null)

    // 200ms simulated BLE/LoRa handshake
    setTimeout(() => {
      setIsPinging(false)
      setPingResult({
        latency: 12,
        timestamp: new Date().toLocaleTimeString(),
      })
    }, 200)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-950/80 backdrop-blur-xs animate-fadeIn">
      {/* Click outside backdrop to close */}
      <div className="absolute inset-0" onClick={onClose} />

      {/* Modal Container */}
      <div className="relative w-full max-w-md bg-stone-900 text-stone-100 rounded-2xl border border-stone-800 shadow-2xl overflow-hidden z-10 p-5 space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-stone-800">
          <div className="flex items-center gap-2">
            <span className="p-1.5 bg-emerald-950 text-emerald-400 border border-emerald-800/80 rounded-lg text-xs font-mono">
              📟
            </span>
            <div>
              <h3 className="text-sm font-bold text-white uppercase tracking-wider">
                {t('diagnosticsTitle', lang) || 'Field Node Diagnostics'}
              </h3>
              <div className="text-xs font-mono text-emerald-400 font-bold">{nodeId}</div>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-stone-800 hover:bg-stone-700 text-stone-400 hover:text-white flex items-center justify-center transition-colors cursor-pointer"
          >
            ✕
          </button>
        </div>

        {/* Hardware Technical Metrics */}
        <div className="space-y-2.5 text-xs">
          {/* Signal Strength */}
          <div className="bg-stone-800/60 p-3 rounded-xl border border-stone-700/50 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-emerald-400">📶</span>
              <span className="font-medium text-stone-300">
                {t('signalStrength', lang) || 'Signal Strength'}
              </span>
            </div>
            <span className="font-mono text-emerald-400 font-bold">
              BLE / LoRa RSSI (-68 dBm, {t('signalStrong', lang) || 'Strong'})
            </span>
          </div>

          {/* Firmware */}
          <div className="bg-stone-800/60 p-3 rounded-xl border border-stone-700/50 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-blue-400">⚡</span>
              <span className="font-medium text-stone-300">
                {t('firmwareVersion', lang) || 'Firmware'}
              </span>
            </div>
            <span className="font-mono text-stone-200">v1.2.4 (Quantized INT8 YOLOv8)</span>
          </div>

          {/* Capacitive Soil Sensor */}
          <div className="bg-stone-800/60 p-3 rounded-xl border border-stone-700/50 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-amber-400">🌱</span>
              <span className="font-medium text-stone-300">
                {t('capacitiveSoilSensor', lang) || 'Capacitive Soil Sensor'}
              </span>
            </div>
            <span className="font-mono text-emerald-400">
              {t('sensorStatusCalibrated', lang) || 'Calibrated (Wet: 1.2V / Dry: 3.0V)'}
            </span>
          </div>

          {/* DHT22 Temp/Humidity */}
          <div className="bg-stone-800/60 p-3 rounded-xl border border-stone-700/50 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-cyan-400">🌡️</span>
              <span className="font-medium text-stone-300">
                {t('dht22Status', lang) || 'DHT22 Temp/Humidity'}
              </span>
            </div>
            <span className="bg-emerald-950 text-emerald-400 border border-emerald-800 text-[10px] font-bold px-2 py-0.5 rounded-md">
              {t('activeState', lang) || 'Active'}
            </span>
          </div>
        </div>

        {/* Action Button & Ping Simulation Result */}
        <div className="pt-2 border-t border-stone-800 space-y-3">
          <button
            onClick={handlePing}
            disabled={isPinging}
            className="w-full bg-emerald-600 hover:bg-emerald-500 disabled:bg-stone-800 text-white font-semibold py-2.5 rounded-xl text-xs transition-all shadow-md flex items-center justify-center gap-2 cursor-pointer"
          >
            {isPinging ? (
              <>
                <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                <span>{t('initiatingHandshake', lang) || 'Initiating Handshake...'}</span>
              </>
            ) : (
              <>
                <span>📡</span>
                <span>{t('pingNodeBtn', lang) || 'Ping Field Node'}</span>
              </>
            )}
          </button>

          {/* Ping Success Badge */}
          {pingResult && (
            <div className="bg-emerald-950/90 border border-emerald-500 text-emerald-300 p-2.5 rounded-xl text-xs text-center font-mono font-bold flex items-center justify-center gap-2 animate-bounce">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping"></span>
              <span>
                {t('nodeResponded', lang) || 'Node Responded'}: {pingResult.latency}ms latency ({pingResult.timestamp})
              </span>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
