/**
 * Social icons use Tabler Icons (not MDI) for a consistent set.
 * MDI has no bilibili icon; Tabler covers all configured platforms.
 */
const socialIconMap: Record<string, string> = {
  github: 'i-tabler-brand-github',
  rss: 'i-tabler-rss',
  email: 'i-tabler-mail',
  bilibili: 'i-tabler-brand-bilibili',
}

export function getSocialIconClass(name: string) {
  return socialIconMap[name] ?? `i-tabler-${name}`
}
