<script setup>
import { ref } from 'vue'
import { ArrowDown, Heart } from 'lucide-vue-next'
import { content } from './content'
import { useScrollScenes } from './useScrollScenes'
import letterText from './letter.txt?raw'

const root = ref(null)
const { activeScene, reducedMotion } = useScrollScenes(root, { gentle: true })
const paragraphs = letterText.replace(/^\uFEFF/, '').replace(/\r\n?/g, '\n').trim().split(/\n[ \t]*\n+/).filter(Boolean)
let photoIndex = 0
const passages = paragraphs.flatMap((paragraph, paragraphIndex) => {
  const citation = paragraph.match(/\s*(\(에베소서[^)]*\))\s*$/)
  const text = citation ? paragraph.slice(0, citation.index).trimEnd() : paragraph
  const lines = text.split('\n')
  const lastParagraph = paragraphIndex === paragraphs.length - 1
  const split = lines.length > 3 ? (lastParagraph ? Math.floor(lines.length / 2) : Math.ceil(lines.length / 2)) : 0
  const chunks = split ? [lines.slice(0, split), lines.slice(split)] : [lines]
  const photo = !citation && photoIndex < content.places.length ? content.places[photoIndex++] : null
  const position = photoIndex
  return chunks.map((chunk, chunkIndex) => ({
    kind: citation ? 'verse' : lastParagraph && chunkIndex === chunks.length - 1 ? 'closing' : 'passage',
    lines: chunk,
    citation: citation?.[1],
    photo: chunkIndex === 0 ? photo : null,
    photoPosition: position,
  }))
})
const scenes = [{ kind: 'cover' }, ...passages]
</script>

<template>
  <main ref="root" class="scroll-story letter-story" :style="{ '--scene-count': scenes.length }" aria-label="생일 편지">
    <div class="letter-atmosphere" aria-hidden="true"><div class="letter-glow glow-left"></div><div class="letter-glow glow-right"></div><div class="letter-grain"></div><div class="letter-vignette"></div></div>
    <div class="story-viewport">
      <section v-for="(scene, i) in scenes" :key="i" :class="['story-panel', 'letter-panel', `letter-${scene.kind}`]" :aria-hidden="!reducedMotion && activeScene !== i" :inert="!reducedMotion && activeScene !== i">
        <div v-if="scene.kind === 'cover'" class="letter-cover-content"><span class="letter-cover-mark" aria-hidden="true"></span><h1>{{ content.recipient }}</h1></div>
        <div v-else :class="['letter-composition', { 'has-photo': scene.photo, 'photo-on-left': scene.photoPosition % 2 === 1 }]">
          <figure v-if="scene.photo" class="letter-photo story-object" :data-tilt="scene.photoPosition % 2 === 1 ? -1.5 : 1.5"><img :src="scene.photo.image" :alt="`편지에 담은 ${scene.photoPosition}번째 추억 사진`" decoding="async" /></figure>
          <div class="letter-content">
            <blockquote v-if="scene.kind === 'verse'" class="letter-quote"><p class="letter-lines letter-sentence"><span v-for="(line, index) in scene.lines" :key="index" class="letter-line">{{ line }}</span></p><cite class="letter-citation">{{ scene.citation }}</cite></blockquote>
            <p v-else class="letter-lines letter-sentence"><span v-for="(line, index) in scene.lines" :key="index" class="letter-line">{{ line }}</span></p>
            <Heart v-if="scene.kind === 'closing'" class="letter-heart" :size="23" :stroke-width="1" aria-hidden="true" />
          </div>
        </div>
        <ArrowDown v-if="i === 0" class="scroll-cue" :size="22" :stroke-width="1.3" aria-hidden="true" />
      </section>
    </div>
  </main>
</template>
