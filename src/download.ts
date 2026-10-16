/** Save a generated file: via the artifact `downloads` capability when running inside claude.ai, else a blob link. */
export async function saveFile(filename: string, content: string, type: string) {
  const w = window as Window & { claude?: { use: (n: string) => Promise<unknown> } }
  if (w.claude?.use) {
    try {
      const dl = (await w.claude.use('downloads')) as { save: (o: { filename: string; data: Blob }) => Promise<unknown> } | null
      if (dl) {
        await dl.save({ filename, data: new Blob([content], { type }) })
        return
      }
    } catch {
      /* viewer declined or unavailable — fall through */
    }
  }
  const a = document.createElement('a')
  a.href = URL.createObjectURL(new Blob([content], { type }))
  a.download = filename
  a.click()
  setTimeout(() => URL.revokeObjectURL(a.href), 1000)
}
