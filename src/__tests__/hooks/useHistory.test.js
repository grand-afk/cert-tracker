import { renderHook, act } from '@testing-library/react'
import { useHistory } from '../../hooks/useHistory'

// ── helpers ───────────────────────────────────────────────────────────────────

function makeCounters() {
  let undone = 0
  let redone = 0
  return {
    undoFn: () => { undone++ },
    redoFn: () => { redone++ },
    get undone() { return undone },
    get redone() { return redone },
  }
}

// ── basic single-action ───────────────────────────────────────────────────────

describe('useHistory — single action', () => {
  it('starts with canUndo=false, canRedo=false', () => {
    const { result } = renderHook(() => useHistory())
    expect(result.current.canUndo).toBe(false)
    expect(result.current.canRedo).toBe(false)
    expect(result.current.undoCount).toBe(0)
    expect(result.current.redoCount).toBe(0)
  })

  it('push enables canUndo and sets undoCount', () => {
    const { result } = renderHook(() => useHistory())
    act(() => { result.current.push(() => {}, () => {}, 'Action A') })
    expect(result.current.canUndo).toBe(true)
    expect(result.current.undoCount).toBe(1)
    expect(result.current.undoLabel).toBe('Action A')
    expect(result.current.canRedo).toBe(false)
  })

  it('undo calls the undo fn and enables canRedo', () => {
    const { result } = renderHook(() => useHistory())
    const c = makeCounters()
    act(() => { result.current.push(c.undoFn, c.redoFn, 'A') })
    act(() => { result.current.undo() })
    expect(c.undone).toBe(1)
    expect(result.current.canUndo).toBe(false)
    expect(result.current.canRedo).toBe(true)
    expect(result.current.redoCount).toBe(1)
  })

  it('redo calls the redo fn and restores canUndo', () => {
    const { result } = renderHook(() => useHistory())
    const c = makeCounters()
    act(() => { result.current.push(c.undoFn, c.redoFn, 'A') })
    act(() => { result.current.undo() })
    act(() => { result.current.redo() })
    expect(c.redone).toBe(1)
    expect(result.current.canUndo).toBe(true)
    expect(result.current.canRedo).toBe(false)
  })

  it('undo on empty stack is a no-op', () => {
    const { result } = renderHook(() => useHistory())
    expect(() => act(() => { result.current.undo() })).not.toThrow()
    expect(result.current.canUndo).toBe(false)
  })

  it('redo on empty stack is a no-op', () => {
    const { result } = renderHook(() => useHistory())
    expect(() => act(() => { result.current.redo() })).not.toThrow()
    expect(result.current.canRedo).toBe(false)
  })
})

// ── multi-level ──────────────────────────────────────────────────────────────

describe('useHistory — multi-level', () => {
  it('supports 3 levels of undo in LIFO order', () => {
    const { result } = renderHook(() => useHistory())
    const order = []

    act(() => {
      result.current.push(() => order.push('undo-A'), () => {}, 'A')
      result.current.push(() => order.push('undo-B'), () => {}, 'B')
      result.current.push(() => order.push('undo-C'), () => {}, 'C')
    })

    expect(result.current.undoCount).toBe(3)
    expect(result.current.undoLabel).toBe('C')

    act(() => { result.current.undo() })
    expect(order).toEqual(['undo-C'])
    expect(result.current.undoCount).toBe(2)
    expect(result.current.undoLabel).toBe('B')

    act(() => { result.current.undo() })
    expect(order).toEqual(['undo-C', 'undo-B'])
    expect(result.current.undoCount).toBe(1)

    act(() => { result.current.undo() })
    expect(order).toEqual(['undo-C', 'undo-B', 'undo-A'])
    expect(result.current.canUndo).toBe(false)
  })

  it('supports 3 levels of redo in LIFO order after full undo', () => {
    const { result } = renderHook(() => useHistory())
    const order = []

    act(() => {
      result.current.push(() => {}, () => order.push('redo-A'), 'A')
      result.current.push(() => {}, () => order.push('redo-B'), 'B')
      result.current.push(() => {}, () => order.push('redo-C'), 'C')
    })
    act(() => { result.current.undo() })
    act(() => { result.current.undo() })
    act(() => { result.current.undo() })

    expect(result.current.redoCount).toBe(3)
    expect(result.current.redoLabel).toBe('A') // stack is LIFO: A was undone last → redone first

    act(() => { result.current.redo() })
    expect(order).toEqual(['redo-A'])
    act(() => { result.current.redo() })
    expect(order).toEqual(['redo-A', 'redo-B'])
    act(() => { result.current.redo() })
    expect(order).toEqual(['redo-A', 'redo-B', 'redo-C'])
    expect(result.current.canRedo).toBe(false)
  })

  it('pushing a new action clears the redo stack', () => {
    const { result } = renderHook(() => useHistory())
    act(() => {
      result.current.push(() => {}, () => {}, 'A')
      result.current.push(() => {}, () => {}, 'B')
    })
    act(() => { result.current.undo() })         // B → redo
    expect(result.current.redoCount).toBe(1)

    act(() => { result.current.push(() => {}, () => {}, 'C') }) // new action
    expect(result.current.redoCount).toBe(0)
    expect(result.current.canRedo).toBe(false)
    expect(result.current.undoCount).toBe(2)     // A + C
  })

  it('interleaved undo/redo works correctly', () => {
    const { result } = renderHook(() => useHistory())
    const undoneLabels = []
    const redonedLabels = []

    act(() => {
      result.current.push(() => undoneLabels.push('A'), () => redonedLabels.push('A'), 'A')
      result.current.push(() => undoneLabels.push('B'), () => redonedLabels.push('B'), 'B')
    })

    act(() => { result.current.undo() })    // undo B
    act(() => { result.current.redo() })    // redo B
    act(() => { result.current.undo() })    // undo B again
    act(() => { result.current.undo() })    // undo A

    expect(undoneLabels).toEqual(['B', 'B', 'A'])
    expect(redonedLabels).toEqual(['B'])
    expect(result.current.canUndo).toBe(false)
    expect(result.current.canRedo).toBe(true)
  })
})

// ── label tracking ────────────────────────────────────────────────────────────

describe('useHistory — label tracking', () => {
  it('undoLabel always reflects the top of the undo stack', () => {
    const { result } = renderHook(() => useHistory())
    act(() => {
      result.current.push(() => {}, () => {}, 'First')
      result.current.push(() => {}, () => {}, 'Second')
    })
    expect(result.current.undoLabel).toBe('Second')
    act(() => { result.current.undo() })
    expect(result.current.undoLabel).toBe('First')
    act(() => { result.current.undo() })
    expect(result.current.undoLabel).toBe('')
  })

  it('redoLabel always reflects the top of the redo stack', () => {
    const { result } = renderHook(() => useHistory())
    act(() => {
      result.current.push(() => {}, () => {}, 'First')
      result.current.push(() => {}, () => {}, 'Second')
    })
    act(() => { result.current.undo() })
    act(() => { result.current.undo() })
    expect(result.current.redoLabel).toBe('First')  // First was undone last → redone next
    act(() => { result.current.redo() })
    expect(result.current.redoLabel).toBe('Second')
  })
})

// ── MAX_HISTORY cap ───────────────────────────────────────────────────────────

describe('useHistory — MAX_HISTORY cap', () => {
  it('caps the undo stack at 50 items', () => {
    const { result } = renderHook(() => useHistory())
    act(() => {
      for (let i = 0; i < 60; i++) {
        result.current.push(() => {}, () => {}, `Action ${i}`)
      }
    })
    expect(result.current.undoCount).toBe(50)
  })
})
