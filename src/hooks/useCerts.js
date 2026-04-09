import { useState, useCallback } from 'react'

const CERTS_KEY   = 'certTracker_certs'
const ACTIVE_KEY  = 'certTracker_activeCert'

function genId() {
  return `cert-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`
}

function loadCerts() {
  try {
    const raw = localStorage.getItem(CERTS_KEY)
    if (raw) return JSON.parse(raw)
  } catch {}
  return null
}

function saveCerts(data) {
  try { localStorage.setItem(CERTS_KEY, JSON.stringify(data)) } catch {}
}

function loadActiveId() {
  try { return localStorage.getItem(ACTIVE_KEY) || 'default' } catch { return 'default' }
}

function saveActiveId(id) {
  try { localStorage.setItem(ACTIVE_KEY, id) } catch {}
}

// ── One-time migration: move old un-namespaced keys into the 'default' namespace ──
export function migrateToNamespace() {
  const OLD_MAP = {
    'certTracker_certData':             'certTracker_default_certData',
    'certTracker_progress':             'certTracker_default_progress',
    'certTracker_settings':             'certTracker_default_settings',
    'certTracker_calendar':             'certTracker_default_calendar',
    'certTracker_revisionTechniques':   'certTracker_default_revisionTechniques',
    'certTracker_revTechLastImported':  'certTracker_default_revTechLastImported',
  }
  let migrated = false
  Object.entries(OLD_MAP).forEach(([oldKey, newKey]) => {
    try {
      const oldVal = localStorage.getItem(oldKey)
      const newVal = localStorage.getItem(newKey)
      if (oldVal && !newVal) {
        localStorage.setItem(newKey, oldVal)
        migrated = true
      }
    } catch {}
  })
  // Ensure the certs registry exists after migration
  // Also: if it exists but the default cert still has the placeholder name 'My Certification',
  // auto-sync the real certName from certData so it shows correctly in the switcher.
  function getStoredCertName() {
    try {
      const raw = localStorage.getItem('certTracker_default_certData')
      if (raw) {
        const parsed = JSON.parse(raw)
        if (parsed.certName && parsed.certName !== 'My Certification') return parsed.certName
      }
    } catch {}
    return 'My Certification'
  }

  const existingCerts = localStorage.getItem(CERTS_KEY)
  if (!existingCerts) {
    const defaultCert = { id: 'default', name: getStoredCertName(), emoji: '🎓', createdAt: new Date().toISOString() }
    saveCerts([defaultCert])
  } else {
    // Already exists — patch the name if it's still the generic placeholder
    try {
      const certs = JSON.parse(existingCerts)
      const def = certs.find((c) => c.id === 'default')
      if (def && def.name === 'My Certification') {
        const realName = getStoredCertName()
        if (realName !== 'My Certification') {
          saveCerts(certs.map((c) => c.id === 'default' ? { ...c, name: realName } : c))
        }
      }
    } catch {}
  }
  return migrated
}

function getDefaultCertName() {
  try {
    const raw = localStorage.getItem('certTracker_default_certData')
    if (raw) {
      const parsed = JSON.parse(raw)
      if (parsed.certName) return parsed.certName
    }
  } catch {}
  return 'My Certification'
}

export function useCerts() {
  const [certs, setCertsState] = useState(() => {
    const stored = loadCerts()
    if (stored) return stored
    // First ever load — seed from certData name if available
    const defaults = [{ id: 'default', name: getDefaultCertName(), emoji: '🎓', createdAt: new Date().toISOString() }]
    saveCerts(defaults)
    return defaults
  })

  const [activeCertId, setActiveCertIdState] = useState(loadActiveId)

  const setCerts = useCallback((data) => {
    if (typeof data === 'function') {
      // Updater function: let React call it and capture the result for persistence
      setCertsState((prev) => {
        const next = data(prev)
        saveCerts(next)
        return next
      })
    } else {
      setCertsState(data)
      saveCerts(data)
    }
  }, [])

  const switchCert = useCallback((id) => {
    setActiveCertIdState(id)
    saveActiveId(id)
  }, [])

  const addCert = useCallback((name, emoji = '🎓', existingId = null) => {
    const id = existingId || genId()
    const cert = { id, name, emoji, createdAt: new Date().toISOString() }
    setCerts((prev) => {
      if (prev.find((c) => c.id === id)) return prev  // already registered — no duplicate
      return [...prev, cert]
    })
    return id
  }, [setCerts])

  const renameCert = useCallback((id, name, emoji) => {
    setCerts((prev) => prev.map((c) => c.id === id ? { ...c, name, ...(emoji ? { emoji } : {}) } : c))
  }, [setCerts])

  const deleteCert = useCallback((id, currentActiveCertId, switchFn) => {
    setCerts((prev) => {
      if (prev.length <= 1) return prev  // can't delete last
      const next = prev.filter((c) => c.id !== id)
      if (currentActiveCertId === id) switchFn(next[0].id)
      return next
    })
  }, [setCerts])

  // Guard: if activeCertId no longer in list (e.g. after delete), fall back
  const activeCert = certs.find((c) => c.id === activeCertId) ?? certs[0]
  const safeActiveId = activeCert?.id ?? 'default'

  return { certs, activeCertId: safeActiveId, activeCert, addCert, renameCert, deleteCert, switchCert }
}
