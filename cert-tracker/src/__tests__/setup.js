import '@testing-library/jest-dom'

// ── localStorage mock ─────────────────────────────────────────────────────────
// jsdom includes a basic localStorage, but we reset it between each test
// to ensure full isolation.
beforeEach(() => {
  localStorage.clear()
})

// ── URL.createObjectURL / revokeObjectURL ─────────────────────────────────────
// jsdom does not implement these; mock them so export functions don't throw.
global.URL.createObjectURL = vi.fn(() => 'blob:mock-url')
global.URL.revokeObjectURL = vi.fn()

// ── window.confirm ────────────────────────────────────────────────────────────
// Suppress the "not implemented" jsdom warning; default to true so confirm
// dialogs in SettingsView behave as if the user clicked OK.
global.confirm = vi.fn(() => true)

// ── Silence console.error for known React act() warnings in tests ─────────────
const originalError = console.error
beforeAll(() => {
  console.error = (...args) => {
    if (typeof args[0] === 'string' && args[0].includes('Warning:')) return
    originalError(...args)
  }
})
afterAll(() => {
  console.error = originalError
})
