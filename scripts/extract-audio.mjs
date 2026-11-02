import { spawnSync } from 'node:child_process'
import { mkdirSync, writeFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import path from 'node:path'

const ffmpeg = process.argv[2] || 'ffmpeg'
const source = fileURLToPath(new URL('../src/', import.meta.url))
const target = path.join(source, 'audio')
mkdirSync(target, { recursive: true })

function duration(filename) {
  const result = spawnSync(ffmpeg, ['-hide_banner', '-i', path.join(source, filename)], { encoding: 'utf8' })
  if (result.error) throw result.error
  const match = result.stderr.match(/Duration: (\d+):(\d+):([\d.]+)/)
  if (!match || !result.stderr.includes('Audio:')) throw new Error(`No audio found in ${filename}`)
  return Number(match[1]) * 3600 + Number(match[2]) * 60 + Number(match[3])
}
function extract(input, output, options) {
  const result = spawnSync(ffmpeg, ['-hide_banner', '-loglevel', 'error', '-y', ...options.seek || [], '-i', path.join(source, input), '-map', '0:a:0', '-vn', '-map_metadata', '-1', ...options.encode, path.join(target, output)], { encoding: 'utf8' })
  if (result.error) throw result.error
  if (result.status !== 0) throw new Error(result.stderr)
  console.log(`Audio extracted: ${output}`)
}

const diffDurationSeconds = duration('diff.mp4')
const scottDurationSeconds = duration('scott.mp4')
const clipDurationSeconds = 10
if (diffDurationSeconds < clipDurationSeconds * 2) throw new Error('Diff is too short for a 10-second midpoint excerpt')
const clipStartSeconds = Number((diffDurationSeconds / 2).toFixed(3))
extract('scott.mp4', 'scott.mp3', { encode: ['-c:a', 'libmp3lame', '-q:a', '2'] })
extract('diff.mp4', 'diff.mp3', { encode: ['-c:a', 'libmp3lame', '-q:a', '2'] })
// PCM gives the excerpt exactly 10 seconds without compressed-frame padding.
extract('diff.mp4', 'diff-clip.wav', { seek: ['-ss', String(clipStartSeconds)], encode: ['-t', String(clipDurationSeconds), '-c:a', 'pcm_s16le', '-ar', '48000'] })
const metadata = { diffDurationSeconds, scottDurationSeconds, clipStartSeconds, clipDurationSeconds }
writeFileSync(path.join(target, 'metadata.json'), JSON.stringify(metadata, null, 2) + '\n')
console.log(JSON.stringify(metadata))
