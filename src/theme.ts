export type Theme = 'system' | 'light' | 'dark'

export function getTheme(): Theme {
  try {
    return (localStorage.getItem('pmp.theme') as Theme) || 'system'
  } catch {
    return 'system'
  }
}

export function applyTheme(t: Theme = getTheme()) {
  const root = document.documentElement
  if (t === 'system') delete root.dataset.theme
  else root.dataset.theme = t
}

export function setTheme(t: Theme) {
  try {
    localStorage.setItem('pmp.theme', t)
  } catch {
    /* ignore */
  }
  applyTheme(t)
}
