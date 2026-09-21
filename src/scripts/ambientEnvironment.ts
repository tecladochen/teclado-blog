type AmbientMode = 'none' | 'petals'

interface Petal {
  x: number
  y: number
  speed: number
  alpha: number
  size: number
  drift: number
  phase: number
  rotation: number
  spin: number
}

interface AmbientEnvironment {
  attach: () => void
}

type AmbientWindow = Window & {
  __tecladoAmbient?: AmbientEnvironment
  __tecladoAmbientListenersReady?: boolean
}

const STORAGE_KEY = 'teclado:ambient-mode'
const MODES: AmbientMode[] = ['none', 'petals']

export function setupAmbientEnvironment() {
  const ambientWindow = window as AmbientWindow
  ambientWindow.__tecladoAmbient ??= createAmbientEnvironment()
  ambientWindow.__tecladoAmbient.attach()

  if (!ambientWindow.__tecladoAmbientListenersReady) {
    ambientWindow.__tecladoAmbientListenersReady = true
    document.addEventListener('astro:page-load', () => ambientWindow.__tecladoAmbient?.attach())
  }
}

function createAmbientEnvironment(): AmbientEnvironment {
  let root: HTMLElement | null = null
  let canvas: HTMLCanvasElement | null = null
  let context: CanvasRenderingContext2D | null = null
  let controlsAbortController: AbortController | null = null
  let petals: Petal[] = []
  let mode: AmbientMode = getInitialMode()
  let width = window.innerWidth
  let height = window.innerHeight
  let dpr = 1
  let lastFrame = 0
  let animationFrame = 0
  let switchTimer = 0
  let iconSnapTimer = 0
  let isPageVisible = !document.hidden
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)')
  const isMobile = window.matchMedia('(max-width: 639px)')

  function attach() {
    const nextRoot = document.querySelector<HTMLElement>('[data-ambient-environment]')
    const nextCanvas = nextRoot?.querySelector<HTMLCanvasElement>('[data-ambient-canvas]') ?? null
    if (!nextRoot || !nextCanvas)
      return

    controlsAbortController?.abort()
    controlsAbortController = new AbortController()
    root = nextRoot
    canvas = nextCanvas
    context = canvas.getContext('2d', { alpha: true })

    resize()
    bindControls(controlsAbortController.signal)
    syncInterface()

    startRendering()
  }

  function bindControls(signal: AbortSignal) {
    if (!root)
      return

    const trigger = root.querySelector<HTMLButtonElement>('[data-ambient-trigger]')
    const constrained = reducedMotion.matches || hasSaveDataEnabled()
    if (trigger)
      trigger.disabled = constrained

    trigger?.addEventListener('click', () => setMode(mode === 'none' ? 'petals' : 'none', true), { signal })
    window.addEventListener('resize', resize, { passive: true, signal })
    document.addEventListener(
      'visibilitychange',
      () => {
        isPageVisible = !document.hidden
        lastFrame = performance.now()
        if (isPageVisible)
          startRendering()
        else
          stopRendering()
      },
      { signal },
    )
    reducedMotion.addEventListener(
      'change',
      () => {
        if (reducedMotion.matches)
          setMode('none', false)
        attach()
      },
      { signal },
    )
  }

  function setMode(nextMode: AmbientMode, persist: boolean) {
    const wrapsToStart = mode === 'petals' && nextMode === 'none'
    window.clearTimeout(switchTimer)
    canvas?.classList.add('is-switching')
    petals = []
    context?.clearRect(0, 0, width, height)
    mode = nextMode
    if (mode === 'none')
      stopRendering()
    else
      startRendering()

    if (persist) {
      try {
        localStorage.setItem(STORAGE_KEY, mode)
      }
      catch {
        // Storage is optional; the visual effect still works without it.
      }
    }

    switchTimer = window.setTimeout(() => {
      resetPetals()
      canvas?.classList.remove('is-switching')
    }, 140)
    syncInterface(wrapsToStart)
  }

  function syncInterface(wrapsToStart = false) {
    if (!root)
      return

    root.dataset.mode = mode
    window.clearTimeout(iconSnapTimer)
    root.classList.remove('is-snapping')
    root.style.setProperty('--ambient-index', String(wrapsToStart ? MODES.length : MODES.indexOf(mode)))

    if (wrapsToStart) {
      iconSnapTimer = window.setTimeout(() => {
        if (!root)
          return
        root.classList.add('is-snapping')
        root.style.setProperty('--ambient-index', '0')
        void root.offsetWidth
        root.classList.remove('is-snapping')
      }, 460)
    }

    const nextMode: AmbientMode = mode === 'none' ? 'petals' : 'none'
    const labels: Record<AmbientMode, string> = { none: '无', petals: '花瓣' }
    const trigger = root.querySelector<HTMLButtonElement>('[data-ambient-trigger]')
    trigger?.setAttribute('aria-label', `当前环境：${labels[mode]}，点击切换到${labels[nextMode]}`)
    trigger?.setAttribute('title', `${labels[mode]} · 点击切换到${labels[nextMode]}`)
  }

  function resize() {
    if (!canvas || !context)
      return

    width = window.innerWidth
    height = window.innerHeight
    dpr = Math.min(window.devicePixelRatio || 1, 1.5)
    canvas.width = Math.round(width * dpr)
    canvas.height = Math.round(height * dpr)
    canvas.style.width = `${width}px`
    canvas.style.height = `${height}px`
    context.setTransform(dpr, 0, 0, dpr, 0, 0)
    resetPetals()
  }

  function resetPetals() {
    petals = []
    if (mode === 'none')
      return

    const screenArea = width * height
    const mobile = isMobile.matches
    const count = clamp(Math.round(screenArea / 40000), mobile ? 10 : 16, mobile ? 16 : 28)
    petals = Array.from({ length: count }, () => createPetal(true))
  }

  function createPetal(initial: boolean): Petal {
    return {
      x: randomBetween(-40, width),
      y: initial ? Math.random() * height : randomBetween(-90, -12),
      speed: randomBetween(30, 68),
      alpha: randomBetween(0.38, 0.68),
      size: randomBetween(4.5, 9),
      drift: randomBetween(18, 42),
      phase: Math.random() * Math.PI * 2,
      rotation: Math.random() * Math.PI * 2,
      spin: randomBetween(-1.5, 1.5),
    }
  }

  function render(now: number) {
    animationFrame = 0
    if (!context || !canvas || !isPageVisible || mode === 'none') {
      context?.clearRect(0, 0, width, height)
      lastFrame = now
      return
    }

    animationFrame = window.requestAnimationFrame(render)
    const targetFrameDuration = 1000 / 30
    if (now - lastFrame < targetFrameDuration)
      return

    const delta = Math.min((now - lastFrame) / 1000 || 0, 0.04)
    lastFrame = now
    context.clearRect(0, 0, width, height)
    const dark = document.documentElement.classList.contains('dark')

    petals.forEach((petal, index) => {
      petal.y += petal.speed * delta
      petal.x += Math.sin(now / 900 + petal.phase) * petal.drift * delta
      petal.rotation += petal.spin * delta
      drawPetal(petal, dark)

      const outside = petal.y > height + 100
        || petal.y < -120
        || petal.x > width + 120
        || petal.x < -140
      if (outside)
        petals[index] = createPetal(false)
    })
  }

  function startRendering() {
    if (!animationFrame && context && canvas && isPageVisible && mode === 'petals') {
      lastFrame = performance.now()
      animationFrame = window.requestAnimationFrame(render)
    }
  }

  function stopRendering() {
    if (animationFrame)
      window.cancelAnimationFrame(animationFrame)
    animationFrame = 0
    context?.clearRect(0, 0, width, height)
  }

  function drawPetal(petal: Petal, dark: boolean) {
    if (!context)
      return

    context.save()
    context.translate(petal.x, petal.y)
    context.rotate(petal.rotation)
    context.beginPath()
    context.ellipse(0, 0, petal.size, petal.size * 0.5, 0, 0, Math.PI * 2)
    context.fillStyle = dark
      ? `rgba(221, 198, 193, ${petal.alpha * 0.78})`
      : `rgba(174, 126, 117, ${petal.alpha * 0.52})`
    context.fill()
    context.beginPath()
    context.moveTo(-petal.size * 0.55, 0)
    context.lineTo(petal.size * 0.55, 0)
    context.strokeStyle = dark ? 'rgba(237, 221, 216, 0.28)' : 'rgba(112, 73, 68, 0.2)'
    context.lineWidth = 0.55
    context.stroke()
    context.restore()
  }

  return { attach }
}

function getInitialMode(): AmbientMode {
  const queryValue = new URLSearchParams(window.location.search).get('ambient')
  if (queryValue !== null && MODES.includes(queryValue as AmbientMode))
    return queryValue as AmbientMode
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches || hasSaveDataEnabled())
    return 'none'

  try {
    const saved = localStorage.getItem(STORAGE_KEY)
    if (saved && MODES.includes(saved as AmbientMode))
      return saved as AmbientMode
  }
  catch {
    // Use the default when storage is unavailable.
  }
  return 'petals'
}

function hasSaveDataEnabled() {
  const connection = (navigator as Navigator & { connection?: { saveData?: boolean } }).connection
  return connection?.saveData === true
}

function randomBetween(min: number, max: number) {
  return min + Math.random() * (max - min)
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value))
}
