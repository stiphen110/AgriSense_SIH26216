import { useEffect, useState, createContext, useContext } from 'react'
import Landing from './pages/Landing'
import RoleSelection from './pages/RoleSelection'
import Login from './pages/login'
import SignUp from './pages/SignUp'
import FarmerApp from './farmer/FarmerApp'
import OfficerApp from './officer/OfficerApp'
import { supabase } from './lib/supabase'
import { t, type AppLanguage } from './lib/i18n'
import { useOfflineQueueState, QueueItem } from './lib/useOfflineSync'

export type AppView =
  | 'landing'
  | 'role-selection'
  | 'login-farmer'
  | 'login-officer'
  | 'signup-farmer'
  | 'farmer'
  | 'officer'

export type EdgeMode = 'cloud' | 'edge'

interface AppNavCtx {
  navigate: (v: AppView) => void
  lang: AppLanguage
  setLang: (l: AppLanguage) => void
  edgeMode: EdgeMode
  setEdgeMode: (m: EdgeMode) => void
  queueCount: number
  isSyncing: boolean
  toastMessage: string | null
  setToastMessage: (msg: string | null) => void
  addOfflineAction: (type: QueueItem['type'], data: any) => void
  triggerAutoSync: () => Promise<boolean>
}

export const AppNav = createContext<AppNavCtx>({
  navigate: () => { },
  lang: 'en',
  setLang: () => { },
  edgeMode: 'edge',
  setEdgeMode: () => { },
  queueCount: 0,
  isSyncing: false,
  toastMessage: null,
  setToastMessage: () => { },
  addOfflineAction: () => { },
  triggerAutoSync: async () => false,
})

export const useAppNav = () => useContext(AppNav)

export default function App() {
  const [view, setView] = useState<AppView>('landing')
  const [lang, setLang] = useState<AppLanguage>('en')
  const [edgeMode, setEdgeModeState] = useState<EdgeMode>('edge')

  const {
    queueCount,
    isSyncing,
    toastMessage,
    setToastMessage,
    addAction: addOfflineAction,
    triggerSync,
  } = useOfflineQueueState()

  const triggerAutoSync = async (): Promise<boolean> => {
    const success = await triggerSync()
    if (success) {
      setToastMessage(t('offlineSyncedSuccess', lang) || 'Offline data synced successfully.')
      setTimeout(() => {
        setToastMessage(null)
      }, 4000)
    }
    return success
  }

  const setEdgeMode = (newMode: EdgeMode) => {
    if (edgeMode === 'edge' && newMode === 'cloud') {
      triggerAutoSync()
    }
    setEdgeModeState(newMode)
  }

  useEffect(() => {
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'SIGNED_OUT') {
        setView('landing')
      }
    })

    return () => {
      subscription.unsubscribe()
    }
  }, [])

  return (
    <AppNav.Provider
      value={{
        navigate: setView,
        lang,
        setLang,
        edgeMode,
        setEdgeMode,
        queueCount,
        isSyncing,
        toastMessage,
        setToastMessage,
        addOfflineAction,
        triggerAutoSync,
      }}
    >
      <div className="h-full min-h-screen relative">
        {/* Toast Notification */}
        {toastMessage && (
          <div className="fixed top-16 right-4 z-50 bg-emerald-700 text-white px-4 py-2.5 rounded-xl shadow-lg border border-emerald-500 flex items-center gap-2.5 animate-bounce text-xs font-semibold">
            <span className="text-sm">✅</span>
            <span>{toastMessage}</span>
          </div>
        )}

        {/* Syncing Loading Overlay Banner */}
        {isSyncing && (
          <div className="fixed top-16 right-4 z-50 bg-stone-900 text-amber-400 px-4 py-2 rounded-xl shadow-lg border border-amber-500/50 flex items-center gap-2 text-xs font-semibold">
            <span className="w-3 h-3 border-2 border-amber-400 border-t-transparent rounded-full animate-spin"></span>
            <span>{t('syncingOfflineQueue', lang) || 'Syncing offline queue to cloud...'}</span>
          </div>
        )}

        {/* Public landing / cover page */}
        {view === 'landing' && <Landing lang={lang} setLang={setLang} />}

        {/* Choose Farmer or Officer */}
        {view === 'role-selection' && <RoleSelection lang={lang} />}

        {/* Existing Farmer login */}
        {view === 'login-farmer' && (
          <Login role="FARMER" lang={lang} />
        )}

        {/* New Farmer complete registration */}
        {view === 'signup-farmer' && (
          <SignUp lang={lang} />
        )}

        {/* Existing Officer login */}
        {view === 'login-officer' && (
          <Login role="OFFICER" lang={lang} />
        )}

        {/* Protected application screens reached after authentication */}
        {view === 'farmer' && (
          <FarmerApp initialLang={lang} />
        )}

        {view === 'officer' && (
          <OfficerApp initialLang={lang} />
        )}

      </div>
    </AppNav.Provider>
  )
}