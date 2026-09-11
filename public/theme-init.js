;(() => {
  const stored = localStorage.getItem('theme')
  let theme = 'night'
  if (stored === 'night' || stored === 'day')
    theme = stored
  document.documentElement.dataset.theme = theme
})()
