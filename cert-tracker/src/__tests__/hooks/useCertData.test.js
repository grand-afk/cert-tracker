import { describe, it, expect, beforeEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useCertData } from '../../hooks/useCertData'
import sampleData from '../../data/sample.json'

describe('useCertData', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  it('loads sample data when localStorage is empty', () => {
    const { result } = renderHook(() => useCertData())
    expect(result.current.certData.certName).toBe(sampleData.certName)
    expect(result.current.certData.courses).toHaveLength(sampleData.courses.length)
  })

  it('loads persisted data from localStorage', () => {
    const custom = { certName: 'AWS SAA', courses: [], terminology: [], targetDate: '' }
    localStorage.setItem('certTracker_certData', JSON.stringify(custom))
    const { result } = renderHook(() => useCertData())
    expect(result.current.certData.certName).toBe('AWS SAA')
  })

  // ── setCertName ───────────────────────────────────────────────────────────
  describe('setCertName', () => {
    it('updates the cert name', () => {
      const { result } = renderHook(() => useCertData())
      act(() => { result.current.setCertName('AWS Solutions Architect') })
      expect(result.current.certData.certName).toBe('AWS Solutions Architect')
    })

    it('persists the cert name to localStorage', () => {
      const { result } = renderHook(() => useCertData())
      act(() => { result.current.setCertName('Azure Fundamentals') })
      const stored = JSON.parse(localStorage.getItem('certTracker_certData'))
      expect(stored.certName).toBe('Azure Fundamentals')
    })
  })

  // ── setTargetDate ─────────────────────────────────────────────────────────
  describe('setTargetDate', () => {
    it('updates the target date', () => {
      const { result } = renderHook(() => useCertData())
      act(() => { result.current.setTargetDate('2026-12-31') })
      expect(result.current.certData.targetDate).toBe('2026-12-31')
    })
  })

  // ── updateTopicResources ──────────────────────────────────────────────────
  describe('updateTopicResources', () => {
    it('updates resources for a specific topic id', () => {
      const { result } = renderHook(() => useCertData())
      const newResources = {
        courseContent: 'https://cloud.google.com/gke',
        video: 'https://youtube.com/gke',
        anki: 'https://ankiweb.net/gke',
      }
      // Use the first topic of the first course
      const firstTopicId = sampleData.courses[0].topics[0].id
      act(() => { result.current.updateTopicResources(firstTopicId, newResources) })

      const updatedTopic = result.current.certData.courses[0].topics[0]
      expect(updatedTopic.resources).toEqual(newResources)
    })

    it('does not affect other topics', () => {
      const { result } = renderHook(() => useCertData())
      const firstTopicId = sampleData.courses[0].topics[0].id
      const secondTopicId = sampleData.courses[0].topics[1].id
      act(() => {
        result.current.updateTopicResources(firstTopicId, { courseContent: 'https://test.com', video: '', anki: '' })
      })
      const secondTopic = result.current.certData.courses[0].topics.find((t) => t.id === secondTopicId)
      expect(secondTopic.resources.courseContent).toBe('')
    })

    it('silently ignores an unknown topic id', () => {
      const { result } = renderHook(() => useCertData())
      expect(() =>
        act(() => { result.current.updateTopicResources('non-existent', { courseContent: '', video: '', anki: '' }) })
      ).not.toThrow()
    })
  })

  // ── updateTermResources ───────────────────────────────────────────────────
  describe('updateTermResources', () => {
    it('updates resources for a specific term id', () => {
      const { result } = renderHook(() => useCertData())
      const firstTermId = sampleData.terminology[0].id
      const newResources = { courseContent: 'https://docs.com', video: '', anki: '' }
      act(() => { result.current.updateTermResources(firstTermId, newResources) })
      const updatedTerm = result.current.certData.terminology[0]
      expect(updatedTerm.resources.courseContent).toBe('https://docs.com')
    })
  })

  // ── importData ────────────────────────────────────────────────────────────
  describe('importData', () => {
    it('imports valid JSON and replaces cert data', () => {
      const { result } = renderHook(() => useCertData())
      const newCert = JSON.stringify({
        certName: 'Imported Cert',
        targetDate: '2027-01-01',
        courses: [{ id: 'c1', name: 'Course 1', color: '#fff', topics: [] }],
        terminology: [],
      })
      act(() => { result.current.importData(newCert) })
      expect(result.current.certData.certName).toBe('Imported Cert')
      expect(result.current.certData.courses).toHaveLength(1)
    })

    it('throws for JSON missing certName', () => {
      const { result } = renderHook(() => useCertData())
      const bad = JSON.stringify({ courses: [] })
      expect(() => act(() => { result.current.importData(bad) })).toThrow('Invalid cert data')
    })

    it('throws for JSON missing courses array', () => {
      const { result } = renderHook(() => useCertData())
      const bad = JSON.stringify({ certName: 'Test', courses: 'not-an-array' })
      expect(() => act(() => { result.current.importData(bad) })).toThrow('Invalid cert data')
    })

    it('throws for malformed JSON', () => {
      const { result } = renderHook(() => useCertData())
      expect(() => act(() => { result.current.importData('{invalid json') })).toThrow()
    })
  })

  // ── resetToSample ─────────────────────────────────────────────────────────
  describe('resetToSample', () => {
    it('resets cert data back to sample data', () => {
      const { result } = renderHook(() => useCertData())
      act(() => { result.current.setCertName('Changed Name') })
      act(() => { result.current.resetToSample() })
      expect(result.current.certData.certName).toBe(sampleData.certName)
    })
  })

  // ── getAllTopics ───────────────────────────────────────────────────────────
  describe('getAllTopics', () => {
    it('returns a flat array of all topics with course metadata', () => {
      const { result } = renderHook(() => useCertData())
      const topics = result.current.getAllTopics()
      const expectedTotal = sampleData.courses.reduce((sum, c) => sum + c.topics.length, 0)
      expect(topics).toHaveLength(expectedTotal)
    })

    it('attaches courseId, courseName, and courseColor to each topic', () => {
      const { result } = renderHook(() => useCertData())
      const topics = result.current.getAllTopics()
      const first = topics[0]
      expect(first).toHaveProperty('courseId')
      expect(first).toHaveProperty('courseName')
      expect(first).toHaveProperty('courseColor')
      expect(first.courseId).toBe(sampleData.courses[0].id)
      expect(first.courseName).toBe(sampleData.courses[0].name)
    })

    it('preserves original topic fields (id, name, resources)', () => {
      const { result } = renderHook(() => useCertData())
      const topics = result.current.getAllTopics()
      expect(topics[0]).toHaveProperty('id')
      expect(topics[0]).toHaveProperty('name')
      expect(topics[0]).toHaveProperty('resources')
    })
  })

  // ── getCourseById ─────────────────────────────────────────────────────────
  describe('getCourseById', () => {
    it('returns the correct course for a valid id', () => {
      const { result } = renderHook(() => useCertData())
      const course = result.current.getCourseById('gke')
      expect(course).toBeDefined()
      expect(course.name).toBe('GKE')
    })

    it('returns undefined for an unknown id', () => {
      const { result } = renderHook(() => useCertData())
      expect(result.current.getCourseById('unknown')).toBeUndefined()
    })
  })

  // ── addTopic ──────────────────────────────────────────────────────────────
  describe('addTopic', () => {
    it('adds a new topic to the specified course', () => {
      const { result } = renderHook(() => useCertData())
      const courseId = sampleData.courses[0].id
      act(() => { result.current.addTopic(courseId, { id: 'gke-new-topic', name: 'New Topic' }) })
      const course = result.current.certData.courses.find((c) => c.id === courseId)
      expect(course.topics.some((t) => t.id === 'gke-new-topic')).toBe(true)
    })

    it('new topic appears with the provided name', () => {
      const { result } = renderHook(() => useCertData())
      const courseId = sampleData.courses[0].id
      act(() => { result.current.addTopic(courseId, { id: 'gke-test-add', name: 'Test Add Topic' }) })
      const course = result.current.certData.courses.find((c) => c.id === courseId)
      const added = course.topics.find((t) => t.id === 'gke-test-add')
      expect(added.name).toBe('Test Add Topic')
    })

    it('new topic gets empty resources if none provided', () => {
      const { result } = renderHook(() => useCertData())
      const courseId = sampleData.courses[0].id
      act(() => { result.current.addTopic(courseId, { id: 'gke-no-res', name: 'No Resources' }) })
      const course = result.current.certData.courses.find((c) => c.id === courseId)
      const added = course.topics.find((t) => t.id === 'gke-no-res')
      expect(added.resources).toBeDefined()
      expect(added.resources.courseContent).toBe('')
    })

    it('does not affect other courses', () => {
      const { result } = renderHook(() => useCertData())
      const courseId = sampleData.courses[0].id
      const otherCourseId = sampleData.courses[1].id
      const countBefore = result.current.certData.courses.find((c) => c.id === otherCourseId).topics.length
      act(() => { result.current.addTopic(courseId, { id: 'gke-only', name: 'GKE Only' }) })
      const countAfter = result.current.certData.courses.find((c) => c.id === otherCourseId).topics.length
      expect(countAfter).toBe(countBefore)
    })

    it('persists added topic to localStorage', () => {
      const { result } = renderHook(() => useCertData())
      const courseId = sampleData.courses[0].id
      act(() => { result.current.addTopic(courseId, { id: 'gke-persist', name: 'Persist Topic' }) })
      const stored = JSON.parse(localStorage.getItem('certTracker_certData'))
      const course = stored.courses.find((c) => c.id === courseId)
      expect(course.topics.some((t) => t.id === 'gke-persist')).toBe(true)
    })

    it('increases topic count by 1', () => {
      const { result } = renderHook(() => useCertData())
      const courseId = sampleData.courses[0].id
      const countBefore = result.current.certData.courses.find((c) => c.id === courseId).topics.length
      act(() => { result.current.addTopic(courseId, { id: 'gke-count', name: 'Count Topic' }) })
      const countAfter = result.current.certData.courses.find((c) => c.id === courseId).topics.length
      expect(countAfter).toBe(countBefore + 1)
    })
  })

  // ── deleteTopic ───────────────────────────────────────────────────────────
  describe('deleteTopic', () => {
    it('removes the topic with the given id from the course', () => {
      const { result } = renderHook(() => useCertData())
      const courseId = sampleData.courses[0].id
      const topicId  = sampleData.courses[0].topics[0].id
      act(() => { result.current.deleteTopic(courseId, topicId) })
      const course = result.current.certData.courses.find((c) => c.id === courseId)
      expect(course.topics.some((t) => t.id === topicId)).toBe(false)
    })

    it('decreases topic count by 1', () => {
      const { result } = renderHook(() => useCertData())
      const courseId = sampleData.courses[0].id
      const countBefore = result.current.certData.courses.find((c) => c.id === courseId).topics.length
      const topicId  = sampleData.courses[0].topics[0].id
      act(() => { result.current.deleteTopic(courseId, topicId) })
      const countAfter = result.current.certData.courses.find((c) => c.id === courseId).topics.length
      expect(countAfter).toBe(countBefore - 1)
    })

    it('does not affect other topics in the same course', () => {
      const { result } = renderHook(() => useCertData())
      const courseId = sampleData.courses[0].id
      const topics   = sampleData.courses[0].topics
      const topicToDelete = topics[0].id
      const topicToKeep   = topics[1].id
      act(() => { result.current.deleteTopic(courseId, topicToDelete) })
      const course = result.current.certData.courses.find((c) => c.id === courseId)
      expect(course.topics.some((t) => t.id === topicToKeep)).toBe(true)
    })

    it('does not affect other courses', () => {
      const { result } = renderHook(() => useCertData())
      const courseId      = sampleData.courses[0].id
      const otherCourseId = sampleData.courses[1].id
      const countBefore   = result.current.certData.courses.find((c) => c.id === otherCourseId).topics.length
      act(() => { result.current.deleteTopic(courseId, sampleData.courses[0].topics[0].id) })
      const countAfter = result.current.certData.courses.find((c) => c.id === otherCourseId).topics.length
      expect(countAfter).toBe(countBefore)
    })

    it('silently ignores an unknown topic id without throwing', () => {
      const { result } = renderHook(() => useCertData())
      const courseId = sampleData.courses[0].id
      const countBefore = result.current.certData.courses.find((c) => c.id === courseId).topics.length
      expect(() =>
        act(() => { result.current.deleteTopic(courseId, 'non-existent-topic') })
      ).not.toThrow()
      const countAfter = result.current.certData.courses.find((c) => c.id === courseId).topics.length
      expect(countAfter).toBe(countBefore)
    })

    it('persists deletion to localStorage', () => {
      const { result } = renderHook(() => useCertData())
      const courseId = sampleData.courses[0].id
      const topicId  = sampleData.courses[0].topics[0].id
      act(() => { result.current.deleteTopic(courseId, topicId) })
      const stored = JSON.parse(localStorage.getItem('certTracker_certData'))
      const course = stored.courses.find((c) => c.id === courseId)
      expect(course.topics.some((t) => t.id === topicId)).toBe(false)
    })
  })

  // ── updateCourse ──────────────────────────────────────────────────────────
  describe('updateCourse', () => {
    it('updates the key field of a course', () => {
      const { result } = renderHook(() => useCertData())
      const courseId = sampleData.courses[0].id
      act(() => { result.current.updateCourse(courseId, { key: 'X' }) })
      const course = result.current.certData.courses.find((c) => c.id === courseId)
      expect(course.key).toBe('X')
    })

    it('updates the hidden field of a course', () => {
      const { result } = renderHook(() => useCertData())
      const courseId = sampleData.courses[0].id
      act(() => { result.current.updateCourse(courseId, { hidden: true }) })
      const course = result.current.certData.courses.find((c) => c.id === courseId)
      expect(course.hidden).toBe(true)
    })

    it('does not affect other courses', () => {
      const { result } = renderHook(() => useCertData())
      const courseId = sampleData.courses[0].id
      const otherCourseId = sampleData.courses[1].id
      act(() => { result.current.updateCourse(courseId, { hidden: true }) })
      const other = result.current.certData.courses.find((c) => c.id === otherCourseId)
      expect(other.hidden).toBeFalsy()
    })

    it('persists changes to localStorage', () => {
      const { result } = renderHook(() => useCertData())
      const courseId = sampleData.courses[0].id
      act(() => { result.current.updateCourse(courseId, { key: 'Z' }) })
      const stored = JSON.parse(localStorage.getItem('certTracker_certData'))
      const course = stored.courses.find((c) => c.id === courseId)
      expect(course.key).toBe('Z')
    })
  })

  // ── addTerm ───────────────────────────────────────────────────────────────
  describe('addTerm', () => {
    it('adds a new term to terminology', () => {
      const { result } = renderHook(() => useCertData())
      act(() => { result.current.addTerm({ id: 'term-new', term: 'New Term', definition: 'def', courses: [] }) })
      expect(result.current.certData.terminology.some((t) => t.id === 'term-new')).toBe(true)
    })

    it('new term appears with the provided data', () => {
      const { result } = renderHook(() => useCertData())
      act(() => { result.current.addTerm({ id: 'term-xyz', term: 'XYZ', definition: 'Test Def', courses: ['gke'] }) })
      const term = result.current.certData.terminology.find((t) => t.id === 'term-xyz')
      expect(term.term).toBe('XYZ')
      expect(term.definition).toBe('Test Def')
      expect(term.courses).toContain('gke')
    })

    it('increases terminology count by 1', () => {
      const { result } = renderHook(() => useCertData())
      const countBefore = result.current.certData.terminology.length
      act(() => { result.current.addTerm({ id: 'term-count', term: 'Count', definition: '', courses: [] }) })
      expect(result.current.certData.terminology.length).toBe(countBefore + 1)
    })

    it('persists new term to localStorage', () => {
      const { result } = renderHook(() => useCertData())
      act(() => { result.current.addTerm({ id: 'term-persist', term: 'Persist', definition: '', courses: [] }) })
      const stored = JSON.parse(localStorage.getItem('certTracker_certData'))
      expect(stored.terminology.some((t) => t.id === 'term-persist')).toBe(true)
    })
  })

  // ── deleteTerm ────────────────────────────────────────────────────────────
  describe('deleteTerm', () => {
    it('removes a term by id', () => {
      const { result } = renderHook(() => useCertData())
      const termId = sampleData.terminology[0].id
      act(() => { result.current.deleteTerm(termId) })
      expect(result.current.certData.terminology.some((t) => t.id === termId)).toBe(false)
    })

    it('decreases terminology count by 1', () => {
      const { result } = renderHook(() => useCertData())
      const countBefore = result.current.certData.terminology.length
      const termId = sampleData.terminology[0].id
      act(() => { result.current.deleteTerm(termId) })
      expect(result.current.certData.terminology.length).toBe(countBefore - 1)
    })

    it('does not affect other terms', () => {
      const { result } = renderHook(() => useCertData())
      const termToDelete = sampleData.terminology[0].id
      const termToKeep   = sampleData.terminology[1].id
      act(() => { result.current.deleteTerm(termToDelete) })
      expect(result.current.certData.terminology.some((t) => t.id === termToKeep)).toBe(true)
    })

    it('silently ignores unknown term id', () => {
      const { result } = renderHook(() => useCertData())
      const countBefore = result.current.certData.terminology.length
      expect(() => act(() => { result.current.deleteTerm('non-existent') })).not.toThrow()
      expect(result.current.certData.terminology.length).toBe(countBefore)
    })

    it('persists deletion to localStorage', () => {
      const { result } = renderHook(() => useCertData())
      const termId = sampleData.terminology[0].id
      act(() => { result.current.deleteTerm(termId) })
      const stored = JSON.parse(localStorage.getItem('certTracker_certData'))
      expect(stored.terminology.some((t) => t.id === termId)).toBe(false)
    })
  })
})
