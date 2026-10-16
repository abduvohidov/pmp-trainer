import type { Backend } from './types'
import { localBackend } from './local'
import { firebaseBackend, firebaseConfig } from './firebase'
import { claudeBackend, hasClaudeRuntime } from './claude'

/** Pick the backend for this build/runtime. */
export function pickBackend(): Backend {
  if (firebaseConfig()) return firebaseBackend
  if (hasClaudeRuntime()) return claudeBackend
  return localBackend
}

export type { Backend }
