import { useState } from 'react'

const FIELDS = [
  { key: 'courseContent', label: '📚 Course Content URL', placeholder: 'https://cloud.google.com/docs/…' },
  { key: 'video',         label: '🎬 Video URL',          placeholder: 'https://www.youtube.com/watch?v=…' },
  { key: 'anki',          label: '🃏 Anki Deck URL',      placeholder: 'https://ankiweb.net/shared/…' },
  { key: 'testLink',      label: '🧪 Practice Test URL',  placeholder: 'https://…' },
]

export default function EditResourceModal({ title, resources = {}, onSave, onClose }) {
  const [form, setForm] = useState({
    courseContent: resources.courseContent || '',
    video:         resources.video         || '',
    anki:          resources.anki          || '',
    testLink:      resources.testLink      || '',
  })

  function set(key, val) { setForm((f) => ({ ...f, [key]: val })) }

  function handleSave() {
    // Trim all values before saving to prevent whitespace-only entries
    const trimmed = Object.fromEntries(
      Object.entries(form).map(([k, v]) => [k, v.trim()])
    )
    onSave(trimmed)
    onClose()
  }

  return (
    <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal modal--wide">
        <div>
          <div className="modal-title">Edit Resources</div>
          {title && <div className="modal-subtitle">{title}</div>}
        </div>

        {FIELDS.map(({ key, label, placeholder }) => {
          const val = form[key]
          const isSet = val.trim().length > 0
          return (
            <div key={key} className="form-group">
              <div className="resource-field-label">
                <label className="form-label">{label}</label>
                {isSet && (
                  <a
                    href={val.trim()}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="resource-field-open"
                    title="Open link in new tab"
                    tabIndex={-1}
                  >
                    ↗ open
                  </a>
                )}
              </div>
              <input
                className={`form-input form-input--url ${isSet ? 'form-input--set' : ''}`}
                type="text"
                placeholder={placeholder}
                value={val}
                onChange={(e) => set(key, e.target.value)}
                title={isSet ? val : ''}
              />
              {isSet && (
                <div className="resource-field-preview" title={val}>
                  {val}
                </div>
              )}
            </div>
          )
        })}

        <div className="modal-footer">
          <button className="btn btn-secondary" onClick={onClose}>Cancel</button>
          <button className="btn btn-primary" onClick={handleSave}>Save</button>
        </div>
      </div>
    </div>
  )
}
