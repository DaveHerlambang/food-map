/**
 * Saves a file the browser fetched. iPhones get the share sheet ("Save to
 * Files"), since a plain download is unreliable there, above all from the
 * home screen app; everything else gets an ordinary download. If the share
 * sheet isn't allowed (it needs a fresh tap, and the fetch may take too long),
 * it falls back to the download.
 */
export async function saveFile(file: File): Promise<"shared" | "downloaded" | "cancelled"> {
  const ios =
    /iP(hone|ad|od)/.test(navigator.userAgent) ||
    (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1)
  if (ios && navigator.canShare?.({ files: [file] })) {
    try {
      await navigator.share({ files: [file] })
      return "shared"
    } catch (err) {
      if (err instanceof DOMException && err.name === "AbortError") return "cancelled"
      // NotAllowedError and friends: try a download instead
    }
  }
  const url = URL.createObjectURL(file)
  const a = document.createElement("a")
  a.href = url
  a.download = file.name
  document.body.append(a)
  a.click()
  a.remove()
  setTimeout(() => URL.revokeObjectURL(url), 10_000)
  return "downloaded"
}
