import { useState, useCallback, useEffect, useRef } from 'react'

const DRIVE_SCOPE          = 'https://www.googleapis.com/auth/drive.file'
const DRIVE_READONLY_SCOPE = 'https://www.googleapis.com/auth/drive.readonly'
const GIS_URL              = 'https://accounts.google.com/gsi/client'
const DRIVE_API   = 'https://www.googleapis.com/drive/v3'
const UPLOAD_API  = 'https://www.googleapis.com/upload/drive/v3'

// ── localStorage helpers ───────────────────────────────────────────────────
const load  = (k, fallback = null) => { try { const v = localStorage.getItem(k); return v ? JSON.parse(v) : fallback } catch { return fallback } }
const save  = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)) } catch {} }
const clear = (k) => { try { localStorage.removeItem(k) } catch {} }

// ── GIS script loader ──────────────────────────────────────────────────────
let gisLoaded = false
let gisCallbacks = []

function loadGIS() {
  if (gisLoaded) return Promise.resolve()
  return new Promise((resolve, reject) => {
    gisCallbacks.push(resolve)
    if (document.getElementById('gis-script')) return
    const s = document.createElement('script')
    s.id  = 'gis-script'
    s.src = GIS_URL
    s.async = true
    s.defer = true
    s.onload  = () => { gisLoaded = true; gisCallbacks.forEach(cb => cb()); gisCallbacks = [] }
    s.onerror = () => gisCallbacks.forEach((_, i, a) => { if (i === 0) reject(new Error('Failed to load Google Identity Services')); a.length = 0 })
    document.head.appendChild(s)
  })
}

// ── Drive REST helpers (no gapi required) ─────────────────────────────────
async function driveReq(method, url, token, body, contentType) {
  const res = await fetch(url, {
    method,
    headers: {
      Authorization: `Bearer ${token}`,
      ...(contentType ? { 'Content-Type': contentType } : {}),
    },
    body,
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: { message: res.statusText } }))
    throw new Error(err?.error?.message || `Drive API error ${res.status}`)
  }
  // 204 No Content
  if (res.status === 204) return null
  return res.json()
}

async function searchFile(token, name) {
  const q = encodeURIComponent(`name='${name}' and trashed=false and mimeType='application/json'`)
  const data = await driveReq('GET', `${DRIVE_API}/files?q=${q}&fields=files(id,name,modifiedTime)&pageSize=1`, token)
  return data?.files?.[0] || null
}

async function createFile(token, name, content) {
  const metadata = { name, mimeType: 'application/json' }
  const form = new FormData()
  form.append('metadata', new Blob([JSON.stringify(metadata)], { type: 'application/json' }))
  form.append('file',     new Blob([content],                  { type: 'application/json' }))
  const data = await driveReq('POST', `${UPLOAD_API}/files?uploadType=multipart&fields=id,name`, token, form)
  return data?.id
}

async function updateFile(token, fileId, content) {
  // Use multipart so we can update both content and metadata (forces modifiedTime bump)
  const metadata = { modifiedTime: new Date().toISOString() }
  const form = new FormData()
  form.append('metadata', new Blob([JSON.stringify(metadata)], { type: 'application/json' }))
  form.append('file',     new Blob([content],                  { type: 'application/json' }))
  await driveReq('PATCH', `${UPLOAD_API}/files/${fileId}?uploadType=multipart`, token, form)
}

async function readFile(token, fileId) {
  const res = await fetch(`${DRIVE_API}/files/${fileId}?alt=media`, {
    headers: { Authorization: `Bearer ${token}` },
  })
  if (!res.ok) throw new Error(`Drive read error ${res.status}`)
  return res.json()
}

// ── Hook ───────────────────────────────────────────────────────────────────
export function useDriveSync({ certId, certName, buildExportBundle, applyImportBundle }) {
  // Client ID is global (same GCP app for all certs)
  const [clientId, setClientIdState] = useState(() => load('certTracker_googleClientId', ''))
  // Auth state
  const [authState, setAuthState]     = useState('idle') // idle | loading | unauthed | authed | error
  const [userEmail, setUserEmail]     = useState(() => load('certTracker_googleEmail', ''))
  const [accessToken, setAccessToken] = useState(null)
  const tokenExpiresAt = useRef(0)
  const tokenClientRef = useRef(null)
  // Per-cert Drive file ID
  const [driveFileId, setDriveFileIdState] = useState(() => load(`certTracker_${certId}_driveFileId`, null))
  // Shared file ID (another user's file ID to load from)
  const [sharedFileId, setSharedFileIdState] = useState(() => load(`certTracker_${certId}_sharedFileId`, ''))
  // Sync state
  const [syncing, setSyncing]             = useState(false)
  const [lastSync, setLastSync]           = useState(() => load(`certTracker_${certId}_driveLastSync`, null))
  const [syncError, setSyncError]         = useState(null)
  // Shared-load state (separate so it doesn't block the main sync buttons)
  const [loadingShared, setLoadingShared] = useState(false)
  const [sharedError, setSharedError]     = useState(null)
  // Readonly token (for loading shared files)
  const readonlyClientRef    = useRef(null)
  const [readonlyToken, setReadonlyToken] = useState(null)
  const readonlyExpiresAt    = useRef(0)

  const setDriveFileId = useCallback((id) => {
    setDriveFileIdState(id)
    if (id) save(`certTracker_${certId}_driveFileId`, id)
    else    clear(`certTracker_${certId}_driveFileId`)
  }, [certId])

  const setSharedFileId = useCallback((id) => {
    setSharedFileIdState(id)
    if (id) save(`certTracker_${certId}_sharedFileId`, id)
    else    clear(`certTracker_${certId}_sharedFileId`)
  }, [certId])

  // ── Save client ID ─────────────────────────────────────────────────────
  const setClientId = useCallback((id) => {
    setClientIdState(id)
    save('certTracker_googleClientId', id)
    // Reset auth state so user re-connects with new ID
    setAuthState(id ? 'unauthed' : 'idle')
    setAccessToken(null)
    tokenClientRef.current = null
  }, [])

  // ── Token refresh callback ─────────────────────────────────────────────
  const handleTokenResponse = useCallback((resp) => {
    if (resp.error) {
      setAuthState('unauthed')
      setSyncError(resp.error_description || resp.error)
      return
    }
    setAccessToken(resp.access_token)
    tokenExpiresAt.current = Date.now() + (resp.expires_in - 60) * 1000
    setAuthState('authed')
    setSyncError(null)
    // Decode email from token hint if available
    if (resp.authuser !== undefined) {
      // email comes from the tokenClient hint — stored separately if user info was fetched
    }
  }, [])

  // ── Initialise GIS when clientId is set ───────────────────────────────
  const initGIS = useCallback(async () => {
    if (!clientId) { setAuthState('idle'); return }
    setAuthState('loading')
    try {
      await loadGIS()
      tokenClientRef.current = window.google.accounts.oauth2.initTokenClient({
        client_id:      clientId,
        scope:          DRIVE_SCOPE,
        callback:       handleTokenResponse,
        error_callback: (err) => { setAuthState('unauthed'); setSyncError(err.message) },
      })
      readonlyClientRef.current = window.google.accounts.oauth2.initTokenClient({
        client_id:      clientId,
        scope:          DRIVE_READONLY_SCOPE,
        callback:       (resp) => {
          if (!resp.error) {
            setReadonlyToken(resp.access_token)
            readonlyExpiresAt.current = Date.now() + (resp.expires_in - 60) * 1000
          }
        },
        error_callback: (err) => { setSharedError(err.message) },
      })
      // Try a silent token refresh — succeeds without any popup if the user
      // has previously consented (Google caches the session in browser cookies).
      // This restores the 'authed' state after an F5 / page reload.
      try {
        await new Promise((resolve, reject) => {
          const client = tokenClientRef.current
          const prev = client.callback
          client.callback = (resp) => {
            client.callback = prev
            if (resp.error) reject(new Error(resp.error))
            else { handleTokenResponse(resp); resolve() }
          }
          client.requestAccessToken({ prompt: '' })
          // If GIS doesn't call back within 3 s assume no cached session
          setTimeout(() => reject(new Error('silent timeout')), 3000)
        })
      } catch {
        // Silent refresh failed — user will need to click Connect
        setAuthState('unauthed')
      }
    } catch (err) {
      setAuthState('error')
      setSyncError(err.message)
    }
  }, [clientId, handleTokenResponse])

  useEffect(() => { if (clientId) initGIS() }, [clientId, initGIS])

  // ── Request / refresh access token ────────────────────────────────────
  const getToken = useCallback(async (interactive = false) => {
    if (accessToken && Date.now() < tokenExpiresAt.current) return accessToken
    if (!tokenClientRef.current) throw new Error('Google auth not initialised. Enter your Client ID in Settings → Google Drive.')
    return new Promise((resolve, reject) => {
      const prev = tokenClientRef.current.callback
      tokenClientRef.current.callback = (resp) => {
        tokenClientRef.current.callback = prev
        if (resp.error) reject(new Error(resp.error_description || resp.error))
        else { handleTokenResponse(resp); resolve(resp.access_token) }
      }
      tokenClientRef.current.requestAccessToken({ prompt: interactive ? 'consent' : '' })
    })
  }, [accessToken, handleTokenResponse])

  // ── Connect (interactive sign-in) ─────────────────────────────────────
  const connect = useCallback(async () => {
    setSyncError(null)
    try {
      await getToken(true)
    } catch (err) {
      setSyncError(err.message)
      setAuthState('unauthed')
    }
  }, [getToken])

  // ── Disconnect ────────────────────────────────────────────────────────
  const disconnect = useCallback(() => {
    if (accessToken) {
      try { window.google?.accounts?.oauth2?.revoke(accessToken, () => {}) } catch {}
    }
    setAccessToken(null)
    tokenExpiresAt.current = 0
    setAuthState(clientId ? 'unauthed' : 'idle')
    setUserEmail('')
    clear('certTracker_googleEmail')
  }, [accessToken, clientId])

  // ── Save to Drive ──────────────────────────────────────────────────────
  const saveToDrive = useCallback(async () => {
    setSyncing(true); setSyncError(null)
    try {
      const token   = await getToken(false)
      const bundle  = buildExportBundle()
      const content = JSON.stringify({ ...bundle, savedAt: new Date().toISOString() }, null, 2)
      const fileName = `cert-tracker-${(certName || certId).replace(/[^\w-]/g, '_')}.json`

      let fileId = driveFileId
      if (!fileId) {
        const existing = await searchFile(token, fileName)
        fileId = existing?.id || null
      }

      if (fileId) {
        await updateFile(token, fileId, content)
      } else {
        fileId = await createFile(token, fileName, content)
      }

      setDriveFileId(fileId)
      const ts = new Date().toISOString()
      setLastSync(ts)
      save(`certTracker_${certId}_driveLastSync`, ts)
    } catch (err) {
      setSyncError(err.message)
      if (err.message?.includes('401') || err.message?.includes('invalid_token')) {
        setAccessToken(null)
        setAuthState('unauthed')
      }
    } finally { setSyncing(false) }
  }, [getToken, buildExportBundle, certName, certId, driveFileId, setDriveFileId])

  // ── Get readonly token (for shared files) ─────────────────────────────
  const getReadonlyToken = useCallback(async () => {
    if (readonlyToken && Date.now() < readonlyExpiresAt.current) return readonlyToken
    if (!readonlyClientRef.current) throw new Error('Google auth not initialised. Enter your Client ID in Settings → Google Drive.')
    return new Promise((resolve, reject) => {
      const prev = readonlyClientRef.current.callback
      readonlyClientRef.current.callback = (resp) => {
        readonlyClientRef.current.callback = prev
        if (resp.error) reject(new Error(resp.error_description || resp.error))
        else {
          setReadonlyToken(resp.access_token)
          readonlyExpiresAt.current = Date.now() + (resp.expires_in - 60) * 1000
          resolve(resp.access_token)
        }
      }
      readonlyClientRef.current.requestAccessToken({ prompt: '' })
    })
  }, [readonlyToken])

  // ── Load from a shared file ID (another user's Drive file) ────────────
  const loadFromSharedFile = useCallback(async (fileId) => {
    if (!fileId?.trim()) return
    setLoadingShared(true); setSharedError(null)
    try {
      const token = await getReadonlyToken()
      const data  = await readFile(token, fileId.trim())
      if (data._type !== 'cert-tracker-full') throw new Error('Unexpected file format — is this a cert-tracker Drive file?')
      applyImportBundle(data)
      const ts = new Date().toISOString()
      setLastSync(ts)
      save(`certTracker_${certId}_driveLastSync`, ts)
    } catch (err) {
      setSharedError(err.message)
    } finally { setLoadingShared(false) }
  }, [getReadonlyToken, applyImportBundle, certId])

  // ── Load from Drive ────────────────────────────────────────────────────
  const loadFromDrive = useCallback(async () => {
    setSyncing(true); setSyncError(null)
    try {
      const token = await getToken(false)

      let fileId = driveFileId
      if (!fileId) {
        const fileName = `cert-tracker-${(certName || certId).replace(/[^\w-]/g, '_')}.json`
        const existing = await searchFile(token, fileName)
        if (!existing) throw new Error('No Drive file found for this cert. Save to Drive first.')
        fileId = existing.id
        setDriveFileId(fileId)
      }

      const data = await readFile(token, fileId)
      if (data._type !== 'cert-tracker-full') throw new Error('Unexpected file format in Drive.')
      applyImportBundle(data)

      const ts = new Date().toISOString()
      setLastSync(ts)
      save(`certTracker_${certId}_driveLastSync`, ts)
    } catch (err) {
      setSyncError(err.message)
      if (err.message?.includes('401') || err.message?.includes('invalid_token')) {
        setAccessToken(null)
        setAuthState('unauthed')
      }
    } finally { setSyncing(false) }
  }, [getToken, certId, certName, driveFileId, setDriveFileId, applyImportBundle])

  return {
    // Config
    clientId, setClientId,
    // Auth
    authState, userEmail, connect, disconnect,
    // Personal sync
    driveFileId, syncing, lastSync, syncError,
    saveToDrive, loadFromDrive,
    isReady: authState === 'authed',
    // Shared load
    sharedFileId, setSharedFileId,
    loadingShared, sharedError, loadFromSharedFile,
  }
}
