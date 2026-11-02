import { ref, onMounted, onUnmounted, nextTick } from 'vue'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'

gsap.registerPlugin(ScrollTrigger)

// Native page scrolling drives one sticky viewport. No wheel interception:
// scrollbar dragging, trackpads, touch, and keyboard scrolling all work.
export function useScrollScenes(root, { gentle = false } = {}) {
  const activeScene = ref(0)
  const reducedMotion = ref(window.matchMedia('(prefers-reduced-motion: reduce)').matches)
  let media

  onMounted(async () => {
    await nextTick()
    media = gsap.matchMedia()
    media.add({ motion: '(prefers-reduced-motion: no-preference)', reduce: '(prefers-reduced-motion: reduce)' }, context => {
      reducedMotion.value = context.conditions.reduce
      if (context.conditions.reduce || !root.value) return
      const panels = gsap.utils.toArray(root.value.querySelectorAll('.story-panel'))
      gsap.set(panels, { autoAlpha: 0, yPercent: gentle ? 4 : 12 })
      gsap.set(panels[0], { autoAlpha: 1, yPercent: 0 })
      if (gentle) gsap.set(root.value.querySelectorAll('.letter-line'), { opacity: 0, y: 12 })
      const timeline = gsap.timeline({
        onUpdate() { activeScene.value = Math.min(panels.length - 1, Math.floor(this.time())) },
        scrollTrigger: {
          trigger: root.value,
          start: 'top top',
          end: 'bottom bottom',
          scrub: gentle ? 1.15 : .65,
          invalidateOnRefresh: true,
        },
      })
      panels.slice(1).forEach((panel, offset) => {
        const index = offset + 1
        timeline.to(panels[index - 1], { autoAlpha: 0, yPercent: gentle ? -4 : -12, duration: gentle ? .6 : .45, ease: 'power1.in' }, index - (gentle ? .3 : .35))
        timeline.to(panel, { autoAlpha: 1, yPercent: 0, duration: gentle ? .75 : .65, ease: 'power2.out' }, index - (gentle ? .3 : .15))
        const visual = panel.querySelector('.story-object')
        const tilt = gentle ? Number(visual?.dataset.tilt || 0) : 0
        if (visual) timeline.fromTo(visual, { scale: gentle ? .96 : .88, rotation: gentle ? tilt + .8 : 6 }, { scale: 1, rotation: tilt, duration: gentle ? .95 : .8, ease: 'power2.out', immediateRender: false }, index - .15)
        if (gentle) {
          const lines = panel.querySelectorAll('.letter-line')
          if (lines.length) timeline.to(lines, { opacity: 1, y: 0, duration: .5, stagger: .07, ease: 'power1.out' }, index - .05)
        }
      })
      timeline.to({}, { duration: panels.length - timeline.duration() })
      if (gentle) gsap.from(panels[0].querySelector('.letter-cover-content'), { opacity: 0, y: 14, duration: 1.8, ease: 'power2.out' })
    }, root.value)
    ScrollTrigger.refresh()
  })

  onUnmounted(() => media?.revert())
  return { activeScene, reducedMotion }
}
