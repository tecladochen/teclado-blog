export type CompanionVariant = 'xiaohei' | 'garden' | 'none'

export interface CompanionProps {
  siteDays: number | null
}

export interface XiaoheiSelection {
  mode: 'fixed' | 'daily'
  fixed: string
  startsOn: string
  enabled: readonly string[]
}

export interface XiaoheiAnimation {
  id: string
  name: string
  characterName?: string
  width: number
  height: number
  count: number
  duration: number
  poster: string
  strip: string
  displayWidth: number
  greetings: readonly string[]
}
