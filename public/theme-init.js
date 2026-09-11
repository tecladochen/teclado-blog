;(() => {
  const stored = localStorage.getItem('theme')
  let theme = 'day'
  if (stored === 'night' || stored === 'day')
    theme = stored
  else if (window.matchMedia('(prefers-color-scheme: dark)').matches)
    theme = 'night'
  document.documentElement.dataset.theme = theme
})()
