/**
 * Global undo/redo history for the cert-tracker app.
 *
 * Each "action" is a { undo, redo, label } triple.
 * push()   records a new action and clears the redo stack.
 * undo()   calls the last action's undo fn and moves it to the redo stack.
 * redo()   calls the next action's redo fn and moves it back to the undo stack.
 *
 * Returns:
 *   push(undoFn, redoFn, label)  — record an action
 *   undo() / redo()              — step through history
 *   canUndo / canRedo            — boolean (disable buttons when false)
 *   undoCount / redoCount        — number of levels available
 *   undoLabel / redoLabel        — human-readable label of next undo/redo action
 */
import { useState, useRef, useCallback } from 'react'

const MAX_HISTORY = 50

export function useHistory() {
  const undoStack = useRef([])  // [{ undo, redo, label }, ...]  — top = last
  const redoStack = useRef([])

  // Derived state so components can disable/label buttons reactively
  const [canUndo,   setCanUndo]   = useState(false)
  const [canRedo,   setCanRedo]   = useState(false)
  const [undoCount, setUndoCount] = useState(0)
  const [redoCount, setRedoCount] = useState(0)
  const [undoLabel, setUndoLabel] = useState('')
  const [redoLabel, setRedoLabel] = useState('')

  // Sync all derived state from the ref stacks in one call
  const syncState = useCallback(() => {
    const uLen = undoStack.current.length
    const rLen = redoStack.current.length
    setCanUndo(uLen > 0)
    setCanRedo(rLen > 0)
    setUndoCount(uLen)
    setRedoCount(rLen)
    setUndoLabel(uLen > 0 ? (undoStack.current[uLen - 1].label || '') : '')
    setRedoLabel(rLen > 0 ? (redoStack.current[rLen - 1].label || '') : '')
  }, [])

  const push = useCallback((undoFn, redoFn, label = '') => {
    undoStack.current.push({ undo: undoFn, redo: redoFn, label })
    if (undoStack.current.length > MAX_HISTORY) undoStack.current.shift()
    redoStack.current = []
    syncState()
  }, [syncState])

  const undo = useCallback(() => {
    const item = undoStack.current.pop()
    if (!item) return
    item.undo()
    redoStack.current.push(item)
    syncState()
  }, [syncState])

  const redo = useCallback(() => {
    const item = redoStack.current.pop()
    if (!item) return
    item.redo()
    undoStack.current.push(item)
    syncState()
  }, [syncState])

  return { push, undo, redo, canUndo, canRedo, undoCount, redoCount, undoLabel, redoLabel }
}
