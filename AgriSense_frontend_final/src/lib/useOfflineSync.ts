import { useState, useEffect } from 'react'

export interface QueueItem {
  id: string
  type: 'crop_scan' | 'alert_acknowledgement' | 'irrigation_action'
  data: any
  timestamp: string
}

const STORAGE_KEY = 'agrisense_offline_queue'

export function getOfflineQueue(): QueueItem[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    return raw ? JSON.parse(raw) : []
  } catch (err) {
    console.error('Failed to read offline queue:', err)
    return []
  }
}

export function saveOfflineQueue(queue: QueueItem[]): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(queue))
  } catch (err) {
    console.error('Failed to save offline queue:', err)
  }
}

export function addToOfflineQueue(type: QueueItem['type'], data: any): QueueItem[] {
  const current = getOfflineQueue()
  const newItem: QueueItem = {
    id: 'queue-' + Date.now() + '-' + Math.random().toString(36).substr(2, 4),
    type,
    data,
    timestamp: new Date().toISOString(),
  }
  const updated = [...current, newItem]
  saveOfflineQueue(updated)
  return updated
}

export function clearOfflineQueue(): void {
  try {
    localStorage.removeItem(STORAGE_KEY)
  } catch (err) {
    console.error('Failed to clear offline queue:', err)
  }
}

export function useOfflineQueueState() {
  const [queue, setQueue] = useState<QueueItem[]>(() => getOfflineQueue())
  const [isSyncing, setIsSyncing] = useState<boolean>(false)
  const [toastMessage, setToastMessage] = useState<string | null>(null)

  const refreshQueue = () => {
    setQueue(getOfflineQueue())
  }

  const addAction = (type: QueueItem['type'], data: any) => {
    const updated = addToOfflineQueue(type, data)
    setQueue(updated)
  }

  const triggerSync = async (): Promise<boolean> => {
    const currentQueue = getOfflineQueue()
    if (currentQueue.length === 0) return false

    setIsSyncing(true)
    // Simulate 1000ms upload latency to cloud
    await new Promise((resolve) => setTimeout(resolve, 1000))

    clearOfflineQueue()
    setQueue([])
    setIsSyncing(false)
    return true
  }

  useEffect(() => {
    const handleStorage = (e: StorageEvent) => {
      if (e.key === STORAGE_KEY) {
        refreshQueue()
      }
    }
    window.addEventListener('storage', handleStorage)
    return () => window.removeEventListener('storage', handleStorage)
  }, [])

  return {
    queue,
    queueCount: queue.length,
    isSyncing,
    toastMessage,
    setToastMessage,
    addAction,
    triggerSync,
    refreshQueue,
  }
}
