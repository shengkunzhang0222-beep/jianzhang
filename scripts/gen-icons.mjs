import sharp from 'sharp'
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import path from 'node:path'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const publicDir = path.join(root, 'public')
const iconsDir = path.join(publicDir, 'icons')

const rounded = await readFile(path.join(publicDir, 'favicon.svg'), 'utf8')

const square = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="#3f8ae6"/>
      <stop offset="1" stop-color="#1c5cab"/>
    </linearGradient>
  </defs>
  <rect width="512" height="512" fill="url(#bg)"/>
  <g transform="translate(256 256) scale(0.8) translate(-256 -256)">
    <g fill="none" stroke="#ffffff" stroke-width="34" stroke-linecap="round" stroke-linejoin="round">
      <path d="M158 148 L256 252 L354 148"/>
      <path d="M256 252 V386"/>
      <path d="M180 292 H332"/>
      <path d="M180 340 H332"/>
    </g>
  </g>
</svg>`

async function render(svg, size, file) {
  await sharp(Buffer.from(svg))
    .resize(size, size)
    .png({ compressionLevel: 9 })
    .toFile(path.join(iconsDir, file))
  console.log(`✓ ${file} (${size}×${size})`)
}

await mkdir(iconsDir, { recursive: true })
await render(rounded, 192, 'icon-192.png')
await render(rounded, 512, 'icon-512.png')
await render(square, 512, 'icon-512-maskable.png')
await render(square, 180, path.join('..', 'apple-touch-icon.png'))
await writeFile(path.join(iconsDir, 'icon.svg'), square)
