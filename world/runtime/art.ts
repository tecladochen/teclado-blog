export async function loadArt(url: string, signal: AbortSignal) {
  const response = await fetch(url, { signal })
  if (!response.ok)
    throw new Error(`Unable to load world art (${response.status}): ${url}`)
  return createImageBitmap(await response.blob())
}
