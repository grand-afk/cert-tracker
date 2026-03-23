import { useState } from 'react'

export default function AddTermModal({ courses, onAdd, onClose }) {
  const [term, setTerm]   = useState('')
  const [def, setDef]     = useState('')
  const [selectedCids, setSelectedCids] = useState([])
  const [error, setError] = useState('')

  function toggleCourse(id) {
    setSelectedCids((prev) => prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id])
  }

  function handleAdd() {
    if (!term.trim()) { setError('Term is required'); return }
    const id = `term-${term.trim().toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '')}-${Date.now()}`
    onAdd({
      id,
      term: term.trim(),
      definition: def.trim(),
      courses: selectedCids,
      resources: { courseContent: '', video: '', anki: '', testLink: '' },
    })
    onClose()
  }

  return (
    <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal">
        <div className="modal-title">Add Term</div>
        {error && <div className="alert alert-error">{error}</div>}

        <div className="form-group">
          <label className="form-label">Term</label>
          <input className="form-input" placeholder="e.g. Kubernetes Pod"
            value={term} onChange={(e) => { setTerm(e.target.value); setError('') }}
            onKeyDown={(e) => { if (e.key === 'Enter') handleAdd() }} autoFocus />
        </div>
        <div className="form-group">
          <label className="form-label">Definition</label>
          <textarea className="form-input" placeholder="Brief definition…" rows={3}
            value={def} onChange={(e) => setDef(e.target.value)} />
        </div>
        <div className="form-group">
          <label className="form-label">Courses (optional)</label>
          <div className="course-checkbox-list">
            {courses.map((c) => (
              <label key={c.id} className="course-checkbox-item">
                <input type="checkbox" checked={selectedCids.includes(c.id)}
                  onChange={() => toggleCourse(c.id)} />
                <span className="course-badge__dot" style={{ background: c.color, display: 'inline-block', width: 8, height: 8, borderRadius: '50%', margin: '0 4px' }} />
                {c.name}
              </label>
            ))}
          </div>
        </div>
        <div className="modal-footer">
          <button className="btn btn-secondary" onClick={onClose}>Cancel</button>
          <button className="btn btn-primary" onClick={handleAdd}>Add Term</button>
        </div>
      </div>
    </div>
  )
}
