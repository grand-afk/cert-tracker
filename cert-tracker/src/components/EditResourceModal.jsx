import { useState } from 'react'

export default function EditResourceModal({ title, resources = {}, onSave, onClose }) {
  const [form, setForm] = useState({
    courseContent: resources.courseContent || '',
    video:         resources.video         || '',
    anki:          resources.anki          || '',
    testLink:      resources.testLink      || '',
  })

  function set(key, val) { setForm((f) => ({ ...f, [key]: val })) }

  function handleSave() { onSave(form); onClose() }

  return (
    <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal">
        <div>
          <div className="modal-title">Edit Resources</div>
          {title && <div className="modal-subtitle">{title}</div>}
        </div>

        {[
          { key: 'courseContent', label: '📚 Course Content URL', placeholder: 'https://cloud.google.com/docs/...' },
          { key: 'video',         label: '🎬 Video URL',          placeholder: 'https://www.youtube.com/...' },
          { key: 'anki',          label: '🃏 Anki Deck URL',      placeholder: 'https://ankiweb.net/shared/...' },
          { key: 'testLink',      label: '🧪 Practice Test URL',  placeholder: 'https://...' },
        ].map(({ key, label, placeholder }) => (
          <div key={key} className="form-group">
            <label className="form-label">{label}</label>
            <input
              className="form-input"
              type="url"
              placeholder={placeholder}
              value={form[key]}
              onChange={(e) => set(key, e.target.value)}
            />
          </div>
        ))}

        <div className="modal-footer">
          <button className="btn btn-secondary" onClick={onClose}>Cancel</button>
          <button className="btn btn-primary" onClick={handleSave}>Save</button>
        </div>
      </div>
    </div>
  )
}
