import { ref, watch, onMounted, onBeforeUnmount } from 'vue'

// One media element serves every scene, so tracks can never overlap.
export function useJourneyAudio(track) {
  const audio = ref(null)
  const playing = ref(false)
  const blocked = ref(false)
  const failed = ref(false)
  let enabled = true
  let revision = 0

  async function play(restart = false) {
    const element = audio.value
    if (!element || !track.value || !enabled) return
    const request = revision
    blocked.value = false
    failed.value = false
    if (restart || element.ended) element.currentTime = 0
    try {
      await element.play()
      if (request === revision) playing.value = !element.paused
    } catch (error) {
      if (request !== revision || error.name === 'AbortError') return
      playing.value = false
      if (error.name === 'NotAllowedError') blocked.value = true
      else failed.value = true
    }
  }

  function syncTrack() {
    revision++
    playing.value = false
    blocked.value = false
    failed.value = false
    const element = audio.value
    if (!element) return
    element.pause()
    element.load()
    if (!track.value) return
    element.volume = track.value.volume
    if (enabled) void play()
  }

  function toggle() {
    if (!audio.value) return
    if (playing.value) {
      enabled = false
      revision++
      blocked.value = false
      audio.value.pause()
    } else {
      enabled = true
      if (failed.value) audio.value.load()
      void play()
    }
  }

  function replay() {
    enabled = true
    if (failed.value) audio.value?.load()
    void play(true)
  }

  function resumeOnGesture(event) {
    if (!event.isTrusted || event.target?.closest?.('[data-audio-control]')) return
    if (blocked.value && enabled) void play()
  }
  function onPlaying() { playing.value = true; blocked.value = false; failed.value = false }
  function onStopped() { playing.value = false }
  function onError() { playing.value = false; if (track.value) failed.value = true }

  watch(track, syncTrack, { flush: 'post' })
  onMounted(() => {
    audio.value.addEventListener('playing', onPlaying)
    audio.value.addEventListener('pause', onStopped)
    audio.value.addEventListener('ended', onStopped)
    audio.value.addEventListener('error', onError)
    document.addEventListener('pointerdown', resumeOnGesture, true)
    document.addEventListener('keydown', resumeOnGesture, true)
    syncTrack()
  })
  onBeforeUnmount(() => {
    revision++
    document.removeEventListener('pointerdown', resumeOnGesture, true)
    document.removeEventListener('keydown', resumeOnGesture, true)
    const element = audio.value
    if (!element) return
    element.removeEventListener('playing', onPlaying)
    element.removeEventListener('pause', onStopped)
    element.removeEventListener('ended', onStopped)
    element.removeEventListener('error', onError)
    element.pause()
    element.removeAttribute('src')
    element.load()
  })
  return { audio, playing, blocked, failed, toggle, replay }
}
