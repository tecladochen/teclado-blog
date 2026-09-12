;(() => {
  const stored = localStorage.getItem('theme')
  let theme = 'night'
  if (stored === 'night' || stored === 'day')
    theme = stored
  document.documentElement.dataset.theme = theme
  const themeColor = document.querySelector('meta[name="theme-color"]')
  if (themeColor)
    themeColor.setAttribute('content', theme === 'day' ? '#ebe4d6' : '#131210')

  try {
    const again = sessionStorage.getItem('teclado.visit') === '1'
    document.documentElement.dataset.visit = again ? 'again' : 'first'
    if (!again)
      sessionStorage.setItem('teclado.visit', '1')
  }
  catch {
    document.documentElement.dataset.visit = 'first'
  }

  if (!window.matchMedia('(prefers-reduced-motion: reduce)').matches)
    document.documentElement.classList.add('has-motion')
})()
