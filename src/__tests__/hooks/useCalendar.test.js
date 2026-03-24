import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useCalendar } from '../../hooks/useCalendar'

beforeEach(() => {
  localStorage.clear()
})

describe('useCalendar', () => {
  it('starts with empty calendar', () => {
    const { result } = renderHook(() => useCalendar())
    expect(result.current.calendar).toEqual({})
  })

  it('addSlot adds a slot to a date', () => {
    const { result } = renderHook(() => useCalendar())
    act(() => {
      result.current.addSlot('2026-03-24', { topicId: 'topic-1', startTime: '09:00', durationMins: 30 })
    })
    const day = result.current.getDay('2026-03-24')
    expect(day.slots).toHaveLength(1)
    expect(day.slots[0].topicId).toBe('topic-1')
  })

  it('removeSlot removes a slot', () => {
    const { result } = renderHook(() => useCalendar())
    act(() => {
      result.current.addSlot('2026-03-24', { topicId: 'topic-1', startTime: '09:00', durationMins: 30 })
    })
    const slotId = result.current.getDay('2026-03-24').slots[0].id
    act(() => {
      result.current.removeSlot('2026-03-24', slotId)
    })
    expect(result.current.getDay('2026-03-24').slots).toHaveLength(0)
  })

  it('clearDay removes all slots for a date', () => {
    const { result } = renderHook(() => useCalendar())
    act(() => {
      result.current.addSlot('2026-03-24', { topicId: 't1', startTime: '09:00', durationMins: 30 })
      result.current.addSlot('2026-03-24', { topicId: 't2', startTime: '09:30', durationMins: 30 })
    })
    act(() => { result.current.clearDay('2026-03-24') })
    expect(result.current.getDay('2026-03-24').slots).toHaveLength(0)
  })

  it('setStudyHours sets study hours for a date', () => {
    const { result } = renderHook(() => useCalendar())
    act(() => { result.current.setStudyHours('2026-03-24', 3) })
    expect(result.current.getDay('2026-03-24').studyHours).toBe(3)
  })

  it('updateSlotDuration updates duration (min 15)', () => {
    const { result } = renderHook(() => useCalendar())
    act(() => {
      result.current.addSlot('2026-03-24', { topicId: 't1', startTime: '09:00', durationMins: 30 })
    })
    const slotId = result.current.getDay('2026-03-24').slots[0].id
    act(() => { result.current.updateSlotDuration('2026-03-24', slotId, 5) })
    expect(result.current.getDay('2026-03-24').slots[0].durationMins).toBe(15)
  })

  it('moveSlot moves slot between dates', () => {
    const { result } = renderHook(() => useCalendar())
    act(() => {
      result.current.addSlot('2026-03-24', { topicId: 't1', startTime: '09:00', durationMins: 30 })
    })
    const slotId = result.current.getDay('2026-03-24').slots[0].id
    act(() => { result.current.moveSlot('2026-03-24', slotId, '2026-03-25', '10:00') })
    expect(result.current.getDay('2026-03-24').slots).toHaveLength(0)
    expect(result.current.getDay('2026-03-25').slots).toHaveLength(1)
    expect(result.current.getDay('2026-03-25').slots[0].startTime).toBe('10:00')
  })

  it('autoFill respects maxSessions limit', () => {
    const { result } = renderHook(() => useCalendar())
    const topics = [
      { id: 't1' }, { id: 't2' }, { id: 't3' }, { id: 't4' }, { id: 't5' }
    ]
    const getSm2Card = () => null
    const getTopicMins = () => null
    act(() => {
      result.current.autoFill('2026-03-24', topics, 30, getTopicMins, getSm2Card, '09:00', 3)
    })
    const day = result.current.getDay('2026-03-24')
    expect(day.slots.length).toBeLessThanOrEqual(3)
  })
})
