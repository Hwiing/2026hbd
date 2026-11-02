<script setup>
import { ref } from 'vue'
import { ArrowDown, ArrowRight, Heart, LockKeyhole } from 'lucide-vue-next'
import { useScrollScenes } from './useScrollScenes'
import { content } from './content'

defineProps({ hasProgress: Boolean })
defineEmits(['start'])
const root = ref(null)
const { activeScene, reducedMotion } = useScrollScenes(root)
const scenes = [
  { title: ['너에게 가는', '작은 모험.'], text: '네 번의 도전 끝에, 전하고 싶은 말.', kind: 'envelope' },
  { title: ['우리 사이의', '빈칸을 채워줘.'], text: '기억 속 정답, 두 가지만.', kind: 'quiz' },
  { title: ['이 풍경,', '어디였을까?'], text: '네 장의 사진, 네 곳의 기억.', kind: 'photo' },
  { title: ['귀를 기울이면,', '떠오를 거야.'], text: '익숙한 멜로디의 이름을 맞혀줘.', kind: 'record' },
  { title: ['말랑이를', '만져줘.'], text: '꾹 눌렀다 놓으면, 마음이 말랑해져.', kind: 'squishy' },
  { title: ['네 개의 조각.', '하나의 마음.'], text: '모은 숫자로, 내 편지를 열어줘.', kind: 'lock' },
]
function skipIntro() { window.scrollTo({ top: root.value.offsetTop + root.value.offsetHeight - innerHeight, behavior: 'instant' }) }
</script>

<template>
  <main ref="root" class="scroll-story intro-story" :style="{ '--scene-count': scenes.length }" aria-label="생일 편지 소개">
    <a href="#story-end" class="skip-link" @click.prevent="skipIntro">소개 건너뛰기</a>
    <div class="story-viewport">
      <section v-for="(scene, i) in scenes" :id="i === scenes.length - 1 ? 'story-end' : undefined" :key="scene.kind" :class="['story-panel', 'intro-panel', `scene-${scene.kind}`]" :aria-hidden="!reducedMotion && activeScene !== i" :inert="!reducedMotion && activeScene !== i">
        <div class="story-composition">
          <div class="story-copy">
            <component :is="i === 0 ? 'h1' : 'h2'" class="story-title"><span v-for="line in scene.title" :key="line">{{ line }}</span></component>
            <p>{{ scene.text }}</p>
            <button v-if="scene.kind === 'lock'" class="button primary story-start" @click="$emit('start')">{{ hasProgress ? '이어서 하기' : '시작하기' }}<ArrowRight :size="19" /></button>
          </div>
          <div class="story-art" aria-hidden="true">
            <div v-if="scene.kind === 'envelope'" class="story-object envelope"><div class="letter-peek"><Heart :size="43" :stroke-width="1.4" /><i></i><i></i><i></i></div><div class="envelope-back"></div><div class="envelope-fold"></div><div class="wax-seal"><Heart :size="23" fill="currentColor" /></div></div>
            <div v-else-if="scene.kind === 'quiz'" class="story-object blank-object"><span>너 +</span><span class="blank-space">&nbsp;</span><span>= 우리</span></div>
            <div v-else-if="scene.kind === 'photo'" class="story-object memory-photo"><img :src="content.places[0].image" alt="" /></div>
            <div v-else-if="scene.kind === 'record'" class="story-object record-player intro-record"><div class="record-center"><Heart :size="32" fill="currentColor" /></div></div>
            <div v-else-if="scene.kind === 'squishy'" class="story-object intro-squishy"><div class="squishy" aria-hidden="true"><span class="squishy-highlight"></span><span class="face"><i></i><span>ω</span><i></i></span><span class="cheek cheek-left"></span><span class="cheek cheek-right"></span></div></div>
            <div v-else class="story-object secret-objects"><span v-for="n in 4" :key="n"><LockKeyhole :size="27" :stroke-width="1.2" /></span></div>
          </div>
        </div>
        <div v-if="i === 0" class="intro-scroll-cue"><p>아래로 스크롤 해봐</p><ArrowDown :size="36" :stroke-width="1.5" aria-hidden="true" /></div>
      </section>
    </div>
  </main>
</template>
