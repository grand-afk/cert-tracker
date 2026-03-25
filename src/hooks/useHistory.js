/**
 * Global undo/redo history for the cert-tracker app.
 *
 * Each "action" is a { undo, redo } function pair.
 * push() records a new action and clears the redo stack.
 * undo() calls the last action's undo fn and moves it to the redo stack.
 * redo() calls the next action's redo fn and moves it back to the undo stack.
 */
import { useState, useRef, useCallback } from 'react'

const MAX_HISTORY = 50

export function useHistory() {
  const undoStack = useRef([])  // [{ undo, redo, label }, ...]
  const redoStack = useRef([])

  // Derived state (true/false) so components can disable buttons
  const [canUndo, setCanUndo] = useState(false)
  const [canRedo, setCanRedo] = useState(false)

  const push = useCallback((undoFn, redoFn, label = '') => {
    undoStack.current.push({ undo: undoFn, redo: redoFn, label })
    if (undoStack.current.length > MAX_HISTORY) undoStack.current.shift()
    redoStack.current = []
    setCanUndo(true)
    setCanRedo(false)
  }, [])

  const undo = useCallback(() => {
    const item = undoStack.current.pop()
    if (!item) return
    item.undo()
    redoStack.current.push(item)
    setCanUndo(undoStack.current.length > 0)
    setCanRedo(true)
  }, [])

  const redo = useCallback(() => {
    const item = redoStack.current.pop()
    if (!item) return
    item.redo()
    undoStack.current.push(item)
    setCanUndo(true)
    setCanRedo(redoStack.current.length > 0)
  }, [])

  return { push, undo, redo, canUndo, canRedo }
}
