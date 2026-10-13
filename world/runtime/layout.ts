import farm from '../assets/manifest.json'

export const worldSize = farm.wholeWorld
export const activeRegion = farm
export const places = farm.places
export const initialView = places.find(p => p.id === 'home')!
