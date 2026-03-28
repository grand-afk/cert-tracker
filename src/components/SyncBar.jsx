import { useRef, useState, useEffect } from 'react'

function fmtRelative(iso) {
  if (!iso) return null
  const diff = Math.floor((Date.now() - new Date(iso).getTime()) / 1000)
  if (diff < 5)  return 'just now'
  if (diff < 60) return `${diff}s ago`
  const m = Math.floor(diff / 60)
  if (m < 60)    return `${m}m ago`
  const h = Math.floor(m / 60)
  if (h < 24)    return `${h}h ago`
  return new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })
}

function fmtFull(iso) {
  if (!iso) return '—'
  return new Date(iso).toLocaleString('en-GB', {
    day: 'numeric', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit', second: '2-digit',
  })
}

function shortPath(p) {
  if (!p) return ''
  const parts = p.replace(/\\/g, '/').split('/')
  return parts.length > 3 ? `…/${parts.slice(-2).join('/')}` : p
}

// ── SyncBar ──────────────────────────────────────────────────────────────────
// Provides "Save" (export full data to JSON) and "Load" (import full data from JSON)
// Uses the File System Access API (showSaveFilePicker / showOpenFilePicker) in
// supported browsers (Chrome/Edge desktop). Falls back to <a download> + <input file>
// for Safari, Firefox, iOS. The syncFilePath setting is shown as a reminder of
// where the user keeps their sync file — browsers cannot write to an arbitrary path.
export default function SyncBar({
  certData, progress, calendar,
  importData, importProgress, restoreCalendar,
  stampLastExported, stampLastImported,
  lastSaved, lastExported, lastImported,
  syncFilePath,
}) {
  const fileInputRef = useRef(null)
  const [saving, setSaving]   = useState(false)
  const [loading, setLoading] = useState(false)
  const [flash, setFlash]     = useState(null) // { type: 'ok'|'err', msg }
  const [, setTick] = useState(0) // force re-render so relative timestamps stay fresh

  // Tick every 30s so "just now" → "30s ago" etc. refreshes automatically
  useEffect(() => {
    const id = setInterval(() => setTick((t) => t + 1), 30_000)
    return () => clearInterval(id)
  }, [])

  function showFlash(type, msg) {
    setFlash({ type, msg })
    setTimeout(() => setFlash(null), 3500)
  }

  // ── Save (export full bundle) ───────────────────────────────────────────────
  async function handleSave() {
    setSaving(true)
    try {
      const bundle = {
        _type: 'cert-tracker-full',
        version: 1,
        exportedAt: new Date().toISOString(),
        certData,
        progress,
        calendar,
      }
      const json = JSON.stringify(bundle, null, 2)

      if (typeof window.showSaveFilePicker === 'function') {
        // Chrome / Edge: let user pick exact save location
        try {
          const handle = await window.showSaveFilePicker({
            suggestedName: 'cert-tracker-sync.json',
            types: [{ description: 'JSON backup', accept: { 'application/json': ['.json'] } }],
          })
          const writable = await handle.createWritable()
          await writable.write(json)
          await writable.close()
        } catch (e) {
          if (e.name === 'AbortError') return // user cancelled — don't stamp
          fallbackDownload(json)
        }
      } else {
        fallbackDownload(json)
      }

      stampLastExported?.()
      showFlash('ok', 'Saved ✓')
    } catch (e) {
      showFlash('err', `Save failed: ${e.message}`)
    } finally {
      setSaving(false)
    }
  }

  function fallbackDownload(json) {
    const blob = new Blob([json], { type: 'application/json' })
    const url  = URL.createObjectURL(blob)
    const a    = Object.assign(document.createElement('a'), {
      href: url,
      download: 'cert-tracker-sync.json',
    })
    a.click()
    URL.revokeObjectURL(url)
  }

  // ── Load (import full bundle) ───────────────────────────────────────────────
  async function handleLoad() {
    if (typeof window.showOpenFilePicker === 'function') {
      // Chrome / Edge: native file picker
      try {
        const [handle] = await window.showOpenFilePicker({
          types: [{ description: 'JSON backup', accept: { 'application/json': ['.json'] } }],
          multiple: false,
        })
        const file = await handle.getFile()
        const text = await file.text()
        processImport(text)
      } catch (e) {
        if (e.name !== 'AbortError') fallbackOpenPicker()
      }
    } else {
      fallbackOpenPicker()
    }
  }

  function fallbackOpenPicker() {
    fileInputRef.current?.click()
  }

  function handleFileInput(e) {
    const file = e.target.files[0]; if (!file) return
    const reader = new FileReader()
    reader.onload = (ev) => processImport(ev.target.result)
    reader.readAsText(file)
    e.target.value = ''
  }

  function processImport(text) {
    setLoading(true)
    try {
      const raw = JSON.parse(text)
      if (raw._type === 'cert-tracker-full') {
        if (raw.certData)  importData(JSON.stringify(raw.certData))
        if (raw.progress)  importProgress(raw.progress)
        if (raw.calendar)  restoreCalendar?.(raw.calendar)
      } else {
        // Fallback: treat as structure-only export
        importData(text)
      }
      stampLastImported?.()
      showFlash('ok', 'Loaded ✓')
    } catch (e) {
      showFlash('err', `Load failed: ${e.message}`)
    } finally {
      setLoading(false)
    }
  }

  // Live relative timestamps — recalc on each render
  const savedRel    = fmtRelative(lastSaved)
  const exportedRel = fmtRelative(lastExported)
  const importedRel = fmtRelative(lastImported)

  return (
    <div className="sync-bar">
      {/* Hidden fallback file input for browsers without File System Access API */}
      <input ref={fileInputRef} type="file" accept=".json,application/json"
             style={{ display: 'none' }} onChange={handleFileInput} />

      <div className="sync-bar-actions">
        <button
          className={`sync-btn sync-btn--save${saving ? ' sync-btn--busy' : ''}`}
          onClick={handleSave}
          disabled={saving || loading}
          title={`Save all data to JSON file\n${syncFilePath ? `Sync path: ${syncFilePath}` : 'Use Chrome/Edge to save to a chosen folder; other browsers save to Downloads'}`}
        >
          {saving ? '⏳' : '💾'} Save
        </button>
        <button
          className={`sync-btn sync-btn--load${loading ? ' sync-btn--busy' : ''}`}
          onClick={handleLoad}
          disabled={saving || loading}
          title="Load all data from a JSON backup file (replaces current data)"
        >
          {loading ? '⏳' : '📂'} Load
        </button>
        {syncFilePath && (
          <span className="sync-path-hint" title={`Sync file path: ${syncFilePath}`}>
            📁 {shortPath(syncFilePath)}
          </span>
        )}
      </div>

      <div className="sync-bar-stamps">
        {savedRel && (
          <span className="sync-stamp sync-stamp--saved" title={`Last local change: ${fmtFull(lastSaved)}`}>
            <span className="sync-stamp-icon">✎</span>
            {savedRel}
          </span>
        )}
        {exportedRel && (
          <span className="sync-stamp sync-stamp--exported" title={`Last saved to file: ${fmtFull(lastExported)}`}>
            <span className="sync-stamp-icon">↑</span>
            {exportedRel}
          </span>
        )}
        {importedRel && (
          <span className="sync-stamp sync-stamp--imported" title={`Last loaded from file: ${fmtFull(lastImported)}`}>
            <span className="sync-stamp-icon">↓</span>
            {importedRel}
          </span>
        )}
      </div>

      {flash && (
        <span className={`sync-flash sync-flash--${flash.type}`}>{flash.msg}</span>
      )}
    </div>
  )
}
