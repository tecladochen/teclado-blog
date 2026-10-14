import { mkdir } from 'node:fs/promises'
import { dirname, resolve } from 'node:path'
import process from 'node:process'
import sharp from 'sharp'

const [source, destination, edge, leftNeighbor] = process.argv.slice(2)
if (!source || !destination || !['above', 'below', 'right'].includes(edge ?? ''))
  throw new Error('Usage: prepare-adjacency-template.ts SOURCE DESTINATION above|below|right')
const metadata = await sharp(source).metadata()
if (metadata.width! < 2160 || metadata.height! < 720)
  throw new Error('Source is smaller than the native work crop')
const parent = await sharp(source).extract({ left: Math.floor((metadata.width! - 2160) / 2), top: Math.floor((metadata.height! - 720) / 2), width: 2160, height: 720 }).png().toBuffer()
const width = edge === 'right' ? 216 : 2160
const height = edge === 'right' ? 720 : 144
const strip = await sharp(parent).extract({ left: edge === 'right' ? 1944 : 0, top: edge === 'below' ? 576 : 0, width, height }).png().toBuffer()
const pieces = [{ input: strip, left: 0, top: edge === 'above' ? 576 : 0 }]
if (leftNeighbor) {
  const left = await sharp(leftNeighbor).extract({ left: 1944, top: 0, width: 216, height: 720 }).png().toBuffer()
  pieces.push({ input: left, left: 0, top: 0 })
}
await mkdir(dirname(resolve(destination)), { recursive: true })
await sharp({ create: { width: 2160, height: 720, channels: 3, background: '#dddccf' } }).composite(pieces).png().toFile(destination)
