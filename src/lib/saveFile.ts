/** Saves a file the way a download link does: the browser asks where, or drops it in Downloads. */
export function saveFile(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  document.body.append(link)
  link.click()
  link.remove()
  // The click starts the save at once; the address can go.
  setTimeout(() => URL.revokeObjectURL(url), 0)
}
