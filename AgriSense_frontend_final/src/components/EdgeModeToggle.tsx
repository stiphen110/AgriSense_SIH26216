import React from 'react'
import { useAppNav } from '../App'
import { t, AppLanguage } from '../lib/i18n'

interface Props {
  lang?: AppLanguage
}

export function EdgeModeToggle({ lang = 'en' }: Props) {
  const { edgeMode, setEdgeMode, queueCount, isSyncing, triggerAutoSync } = useAppNav()

  const isEdge = edgeMode === 'edge'

  return (
    <div className="flex items-center gap-2">
      {/* Toggle Button Container */}
      <div className="bg-stone-100 p-0.5 rounded-lg border border-stone-200 flex items-center">
        <button
          onClick={() => setEdgeMode('cloud')}
          className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-semibold transition-all ${
            !isEdge
              ? 'bg-white text-blue-700 shadow-xs border border-stone-200/60'
              : 'text-stone-500 hover:text-stone-800'
          }`}
          title={t('cloudSyncTooltip', lang) || 'Cloud Sync Mode'}
        >
          <span className="text-xs">☁️</span>
          <span className="hidden sm:inline">{t('cloudSync', lang)}</span>
        </button>

        <button
          onClick={() => setEdgeMode('edge')}
          className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-semibold transition-all ${
            isEdge
              ? 'bg-emerald-600 text-white shadow-xs'
              : 'text-stone-500 hover:text-stone-800'
          }`}
          title={t('edgeNodeTooltip', lang) || 'Edge Node Only Mode'}
        >
          <span className="text-xs">📡</span>
          <span className="hidden sm:inline">{t('edgeNodeOnly', lang)}</span>
        </button>
      </div>

      {/* Visual Badge when Edge Node Only is Active */}
      {isEdge && (
        <span className="bg-emerald-50 text-emerald-800 border border-emerald-200/80 text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
          <span>{t('localNetworkBadge', lang)}</span>
        </span>
      )}

      {/* Pending Offline Sync Badge */}
      {queueCount > 0 && (
        <button
          onClick={() => triggerAutoSync()}
          disabled={isSyncing}
          className="bg-amber-100 text-amber-900 border border-amber-300 text-[11px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1 hover:bg-amber-200 transition-colors animate-pulse cursor-pointer"
          title={t('pendingSyncTooltip', lang) || 'Click to sync offline items'}
        >
          <span>☁️</span>
          <span>{queueCount} {t('pendingSync', lang)}</span>
        </button>
      )}
    </div>
  )
}
