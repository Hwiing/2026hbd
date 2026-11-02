import { watch, onBeforeUnmount } from 'vue'

// A soft downward squish and an upward spring, synthesized locally.
export function useSquishySound(pressing, enabled) {
  let context
  let noiseBuffer
  let revision = 0
  const voices = new Set()

  function stopVoices() {
    revision++
    for (const voice of [...voices]) voice.stop()
  }

  function synthesize(released) {
    if (voices.size >= 3) voices.values().next().value.stop()
    const now = context.currentTime
    const duration = released ? .2 : .28
    const tone = context.createOscillator()
    const body = context.createGain()
    const noise = context.createBufferSource()
    const filter = context.createBiquadFilter()
    const texture = context.createGain()
    const output = context.createGain()
    output.gain.value = .14
    output.connect(context.destination)

    tone.type = 'sine'
    tone.frequency.setValueAtTime(released ? 210 : 390, now)
    if (released) {
      tone.frequency.exponentialRampToValueAtTime(490, now + .075)
      tone.frequency.exponentialRampToValueAtTime(310, now + duration)
    } else tone.frequency.exponentialRampToValueAtTime(125, now + duration)
    body.gain.setValueAtTime(0, now)
    body.gain.linearRampToValueAtTime(released ? .5 : .65, now + .018)
    body.gain.exponentialRampToValueAtTime(.0001, now + duration)
    tone.connect(body)
    body.connect(output)

    noise.buffer = noiseBuffer
    filter.type = 'bandpass'
    filter.Q.value = .6
    filter.frequency.setValueAtTime(released ? 950 : 700, now)
    filter.frequency.exponentialRampToValueAtTime(released ? 1300 : 230, now + duration)
    texture.gain.setValueAtTime(0, now)
    texture.gain.linearRampToValueAtTime(released ? .04 : .1, now + .015)
    texture.gain.exponentialRampToValueAtTime(.0001, now + duration)
    noise.connect(filter)
    filter.connect(texture)
    texture.connect(output)

    const nodes = [tone, body, noise, filter, texture, output]
    let finished = false
    const voice = {
      stop() {
        if (finished) return
        finished = true
        tone.onended = null
        for (const source of [tone, noise]) { try { source.stop() } catch {} }
        for (const node of nodes) node.disconnect()
        voices.delete(voice)
      },
    }
    voices.add(voice)
    tone.onended = () => voice.stop()
    tone.start(now)
    noise.start(now)
    tone.stop(now + duration + .025)
    noise.stop(now + duration + .025)
  }

  async function play(released) {
    if (!enabled.value) return
    const request = ++revision
    try {
      if (!context) {
        const AudioContext = window.AudioContext || window.webkitAudioContext
        if (!AudioContext) return
        context = new AudioContext()
        noiseBuffer = context.createBuffer(1, Math.ceil(context.sampleRate * .35), context.sampleRate)
        const samples = noiseBuffer.getChannelData(0)
        for (let i = 0; i < samples.length; i++) samples[i] = Math.random() * 2 - 1
      }
      if (context.state === 'suspended') await context.resume()
      if (request === revision && enabled.value && context.state === 'running') synthesize(released)
    } catch {
      // Audio availability must not interrupt the touch interaction.
    }
  }

  // One sound per press/release edge; holding or keyboard repeat stays quiet.
  watch(pressing, down => { void play(!down) }, { flush: 'sync' })
  watch(enabled, value => { if (!value) stopVoices() }, { flush: 'sync' })
  onBeforeUnmount(() => {
    stopVoices()
    if (context && context.state !== 'closed') void context.close().catch(() => {})
  })
}
