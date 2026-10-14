/** Keep desktop window resizing independent from the mobile scene gate. */
export function isMobileWorldClient(userAgent: string, touchPoints: number, coarseOnly: boolean) {
  return /Android|iPhone|iPad|iPod|Mobile/i.test(userAgent)
    || (/Macintosh/i.test(userAgent) && touchPoints > 1)
    || coarseOnly
}

export function supportsWorld() {
  const coarseOnly = matchMedia('(pointer: coarse) and (hover: none)').matches
    && !matchMedia('(any-pointer: fine)').matches
  return !isMobileWorldClient(navigator.userAgent, navigator.maxTouchPoints, coarseOnly)
}
