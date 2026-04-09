import { useState } from 'react'

export default function AddTopicModal({
  courses,
  onAdd,
  onClose,
  topics = [],          // parent topics for subtopic mode
  onAddSub,             // addSubtopic(courseId, topicId, { id, name })
  subtopicsEnabled = false,
}) {
  const canAddSub = subtopicsEnabled && onAddSub && topics.length > 0
  const [mode, setMode] = useState('topic')  // 'topic' | 'subtopic'

  // Topic mode state
  const [courseId, setCourseId] = useState(courses[0]?.id ?? '')
  const [topicName, setTopicName] = useState('')

  // Subtopic mode state
  const [parentTopicId, setParentTopicId] = useState(topics[0]?.id ?? '')
  const [subName, setSubName] = useState('')

  const [error, setError] = useState('')

  function handleAddTopic() {
    if (!topicName.trim()) { setError('Topic name is required'); return }
    if (!courseId)         { setError('Please select a course'); return }
    const id = `${courseId}-${topicName.trim().toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '')}-${Date.now()}`
    onAdd(courseId, { id, name: topicName.trim(), resources: { courseContent: '', video: '', anki: '', testLink: '' } })
    onClose()
  }

  function handleAddSubtopic() {
    if (!subName.trim())   { setError('Sub-topic name is required'); return }
    const parent = topics.find((t) => t.id === parentTopicId)
    if (!parent)           { setError('Please select a parent topic'); return }
    const id = `sub-${parentTopicId}-${Date.now()}`
    onAddSub(parent.courseId, parentTopicId, { id, name: subName.trim() })
    onClose()
  }

  function switchMode(m) { setMode(m); setError('') }

  return (
    <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal">
        <div className="modal-title">{mode === 'topic' ? 'Add Topic' : 'Add Sub-Topic'}</div>

        {canAddSub && (
          <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
            <button
              className={`btn btn-sm ${mode === 'topic' ? 'btn-primary' : 'btn-secondary'}`}
              onClick={() => switchMode('topic')}
            >
              New Topic
            </button>
            <button
              className={`btn btn-sm ${mode === 'subtopic' ? 'btn-primary' : 'btn-secondary'}`}
              onClick={() => switchMode('subtopic')}
            >
              Sub-Topic to existing
            </button>
          </div>
        )}

        {error && <div className="alert alert-error">{error}</div>}

        {mode === 'topic' ? (
          <>
            <div className="form-group">
              <label className="form-label">Course</label>
              <select className="form-input" value={courseId} onChange={(e) => setCourseId(e.target.value)}>
                {courses.map((c) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label className="form-label">Topic Name</label>
              <input
                className="form-input"
                placeholder="e.g. GKE Node Pools"
                value={topicName}
                onChange={(e) => { setTopicName(e.target.value); setError('') }}
                onKeyDown={(e) => { if (e.key === 'Enter') handleAddTopic() }}
                autoFocus
              />
            </div>

            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={onClose}>Cancel</button>
              <button className="btn btn-primary" onClick={handleAddTopic}>Add Topic</button>
            </div>
          </>
        ) : (
          <>
            <div className="form-group">
              <label className="form-label">Parent Topic</label>
              <select className="form-input" value={parentTopicId} onChange={(e) => setParentTopicId(e.target.value)}>
                {topics.map((t) => (
                  <option key={t.id} value={t.id}>{t.courseName} › {t.name}</option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label className="form-label">Sub-Topic Name</label>
              <input
                className="form-input"
                placeholder="e.g. Auto-scaling Configuration"
                value={subName}
                onChange={(e) => { setSubName(e.target.value); setError('') }}
                onKeyDown={(e) => { if (e.key === 'Enter') handleAddSubtopic() }}
                autoFocus
              />
            </div>

            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={onClose}>Cancel</button>
              <button className="btn btn-primary" onClick={handleAddSubtopic}>Add Sub-Topic</button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
