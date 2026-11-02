<script setup>
import { ref, computed, onMounted, onUnmounted, nextTick, watch } from 'vue'
import { ArrowRight, LockKeyhole, Volume2, VolumeX, Play, RotateCcw } from 'lucide-vue-next'
import IntroStory from './IntroStory.vue'
import ScrollLetter from './ScrollLetter.vue'
import { content, matchesAnswer, isUnlocked } from './content'
import { useJourneyAudio } from './useJourneyAudio'
import { useSquishySound } from './useSquishySound'
const stages = [
  { name: '우리의 빈칸' },
  { name: '여기, 기억나?' },
  { name: '우리의 플레이리스트' },
  { name: '말랑한 마음' },
]
let saved = null
try { saved = JSON.parse(localStorage.getItem('birthday-lab-v1')) } catch {}
const solved = ref(Array.isArray(saved?.solved) && saved.solved.length === 4 ? saved.solved.map(Boolean) : [false, false, false, false])
const screen = ref('landing'), active = ref(0), quizIndex = ref(0), answer = ref(''), feedback = ref(''), hint = ref(false), reward = ref(null), pin = ref(''), unlocking = ref(false), pressure = ref(0), affection = ref(0), pressing = ref(false), resetDialog = ref(false)
const completed = computed(() => solved.value.filter(Boolean).length)
const currentQuiz = computed(() => content.quizzes[quizIndex.value])
const placeIndex = ref(0)
const currentPlace = computed(() => content.places[placeIndex.value])
const allDone = computed(() => completed.value === 4)
const stage = computed(() => stages[active.value])
const heartStyle = computed(() => ({ transform: `scale(${1 + pressure.value * .002}, ${1 - pressure.value * .003}) rotate(${pressing.value ? -3 : 0}deg)` }))
const selectedAudio = computed(() => {
  if (screen.value === 'letter') return content.music.letter
  if (screen.value === 'landing' || (screen.value === 'lab' && active.value < 2)) return content.music.scott
  if (screen.value === 'lab' && active.value === 2 && reward.value === null) return content.music.clip
  return null
})
const { audio: journeyAudio, playing: audioPlaying, blocked: audioBlocked, failed: audioFailed, toggle: toggleAudio, replay: replayAudio } = useJourneyAudio(selectedAudio)
const audioLabel = computed(() => audioFailed.value ? '음악 다시 시도' : audioPlaying.value ? '음악 끄기' : audioBlocked.value ? '소리 켜기' : '음악 켜기')
useSquishySound(pressing, computed(() => screen.value === 'lab' && active.value === 3 && !solved.value[3] && reward.value === null && !resetDialog.value))
let timer
const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
watch(solved, value => { try { localStorage.setItem('birthday-lab-v1', JSON.stringify({ solved: value })) } catch {} }, { deep: true })
watch(resetDialog, async opened => { if (opened) { await nextTick(); document.querySelector('.reset-modal .secondary')?.focus() } })
async function start() {
  screen.value = 'lab'; selectStage(Math.min(solved.value.findIndex(v => !v) < 0 ? 4 : solved.value.findIndex(v => !v), 4))
  await nextTick(); window.scrollTo({ top: 0, behavior: 'instant' }); focusStage()
}
async function home() { pressing.value = false; screen.value = 'landing'; await nextTick(); window.scrollTo({ top: 0, behavior: 'instant' }) }
function focusStage() {
  const assessment = document.querySelector('.assessment')
  if (!assessment?.contains(document.activeElement)) assessment?.querySelector('.stage-title')?.focus({ preventScroll: true })
}
function selectStage(index) {
  if (index > completed.value) return
  active.value = index; answer.value = ''; feedback.value = ''; hint.value = false; quizIndex.value = 0; placeIndex.value = 0; pressure.value = 0; affection.value = 0; pressing.value = false
}
function award(index) {
  if (solved.value[index]) return
  pressing.value = false; solved.value[index] = true; reward.value = index; feedback.value = ''
  nextTick(() => document.querySelector('.reward-next')?.focus())
}
function continueStage() { const next = reward.value + 1; reward.value = null; selectStage(next) }
function submit() {
  if (active.value > 1) return
  const answers = active.value === 0 ? currentQuiz.value.answers : currentPlace.value.answers
  if (!answer.value.trim()) { feedback.value = '답을 한 글자라도 적어줘.'; return }
  if (!matchesAnswer(answer.value, answers)) { feedback.value = '조금만 더 생각해볼까? 힌트를 열어봐도 좋아.'; return }
  if (active.value === 0 && quizIndex.value < content.quizzes.length - 1) quizIndex.value++
  else if (active.value === 1 && placeIndex.value < content.places.length - 1) placeIndex.value++
  else { award(active.value); return }
  answer.value = ''; hint.value = false; feedback.value = ''; nextTick(() => document.querySelector('#answer')?.focus())
}
function chooseSong(id) {
  if (id !== content.song.correctId) { feedback.value = '다른 곡이야. 한 번 더 들어볼까?'; return }
  award(2)
}
function startPress(event) {
  if (active.value !== 3 || solved.value[3] || reward.value !== null) return
  event?.preventDefault(); event?.currentTarget?.setPointerCapture?.(event.pointerId); pressing.value = true
}
function endPress() { pressing.value = false }
function reset() { solved.value = [false,false,false,false]; resetDialog.value = false; selectStage(0); pin.value = '' }
async function unlock() {
  if (!isUnlocked(solved.value, pin.value)) { feedback.value = allDone.value ? '모은 카드를 순서대로 다시 확인해봐.' : '아직 모으지 못한 카드가 있어.'; return }
  unlocking.value = true
  await new Promise(resolve => setTimeout(resolve, reduceMotion ? 100 : 1900)); screen.value = 'letter'; unlocking.value = false; await nextTick(); window.scrollTo({ top: 0, behavior: 'instant' })
}
function keyRelease(event) { if (event.code === 'Space' || event.code === 'Enter') endPress() }
onMounted(() => {
  timer = setInterval(() => {
    if (screen.value !== 'lab' || active.value !== 3 || solved.value[3] || reward.value !== null) return
    pressure.value = Math.max(0, Math.min(100, pressure.value + (pressing.value ? 1.4 : -1.9)))
    if (pressure.value >= 28 && pressure.value <= 72) affection.value = Math.min(100, affection.value + .6)
    else if (pressure.value > 85) affection.value = Math.max(0, affection.value - .35)
    if (affection.value >= 100) award(3)
  }, 50)
  window.addEventListener('pointerup', endPress); window.addEventListener('keyup', keyRelease); window.addEventListener('blur', endPress)
})
onUnmounted(() => { clearInterval(timer); window.removeEventListener('pointerup', endPress); window.removeEventListener('keyup', keyRelease); window.removeEventListener('blur', endPress) })
</script>

<template>
  <div :class="['app', { 'letter-mode': screen === 'letter' }]">
    <audio ref="journeyAudio" :src="selectedAudio?.src" :loop="selectedAudio?.loop || false" :data-track="selectedAudio?.id || 'silent'" preload="auto"></audio>
    <header class="site-header" :inert="reward !== null || resetDialog || unlocking">
      <button class="brand" @click="home" aria-label="처음 화면으로">HBD Yuni</button>
      <div class="header-actions">
        <button v-if="selectedAudio" class="audio-toggle" data-audio-control :aria-label="audioLabel" :title="audioLabel" @click="toggleAudio"><Volume2 v-if="audioPlaying" :size="18" :stroke-width="1.5" /><VolumeX v-else :size="18" :stroke-width="1.5" /></button>
        <button v-if="screen === 'lab'" class="reset-button" @click="resetDialog = true" aria-label="처음부터" title="처음부터"><RotateCcw :size="17" :stroke-width="1.5" /></button>
      </div>
    </header>

    <IntroStory v-if="screen === 'landing'" :has-progress="completed > 0" @start="start" />

    <main v-else-if="screen === 'lab'" class="lab-shell" :inert="reward !== null || resetDialog || unlocking">
      <Transition name="page-scene" mode="out-in" @after-enter="focusStage">
        <section :key="active" class="assessment">
          <template v-if="active < 4">
            <div class="assessment-copy">
              <span class="stage-number">0{{ active + 1 }} / 04</span>
              <h1 class="stage-title" tabindex="-1">{{ stage.name }}</h1>
              <p class="stage-intro">{{ ['빈칸 두 개에, 우리의 기억을.', '사진 속 네 곳을 기억해줘.', '10초만 듣고, 이 곡을 골라줘.', '누르고, 잠깐 쉬고. 초록 구간을 유지해줘.'][active] }}</p>
            </div>
            <form v-if="active < 2" class="assessment-form" @submit.prevent="submit">
              <Transition v-if="active === 0" name="question" mode="out-in">
                <div :key="quizIndex" class="quiz-scene">
                  <p :class="['quiz-question', { 'long-passage': currentQuiz.citation }]">{{ currentQuiz.before }}<span class="blank-line">{{ answer || '____' }}</span>{{ currentQuiz.after }}</p>
                  <p v-if="currentQuiz.citation" class="quiz-citation">{{ currentQuiz.citation }}</p>
                </div>
              </Transition>
              <Transition v-else-if="active === 1" name="question" mode="out-in">
                <figure :key="placeIndex" class="place-scene"><img :src="currentPlace.image" :alt="currentPlace.alt"></figure>
              </Transition>
              <label for="answer" class="sr-only">{{ active === 0 ? '빈칸 정답' : active === 1 ? '장소 이름' : '노래 제목' }}</label>
              <div class="answer-row"><input id="answer" v-model="answer" autocomplete="off" :placeholder="active === 0 ? currentQuiz.initials : currentPlace.initials" @input="feedback = ''"><button class="button answer-submit" type="submit" aria-label="정답 확인"><ArrowRight :size="23" :stroke-width="1.5" /></button></div>
              <div class="hint-row"><button type="button" class="text-button" @click="hint = !hint">{{ hint ? '힌트 접기' : '힌트' }}</button><span v-if="active < 2" class="question-count">{{ active === 0 ? quizIndex + 1 : placeIndex + 1 }} / {{ active === 0 ? content.quizzes.length : content.places.length }}</span></div>
              <p v-if="hint" class="hint-message">{{ active === 0 ? currentQuiz.hint : `초성: ${currentPlace.initials}` }}</p>
              <p v-if="feedback" class="feedback" role="alert">{{ feedback }}</p>
            </form>
            <div v-else-if="active === 2" class="song-choice-scene">
              <div class="song-options"><button v-for="option in content.song.options" :key="option.id" class="song-option" :data-choice="option.id" :aria-label="option.label" @click="chooseSong(option.id)"><img :src="option.image" alt="" /></button></div>
              <button class="play-button" data-audio-control :disabled="audioPlaying" @click="replayAudio"><Volume2 v-if="audioPlaying" :size="17" /><Play v-else :size="17" />{{ audioPlaying ? '재생 중 · 10초' : '10초 다시 듣기' }}</button>
              <p v-if="audioFailed" class="feedback" role="alert">음악을 불러오지 못했어. 다시 듣기를 눌러줘.</p>
              <p v-if="feedback" class="feedback" role="alert">{{ feedback }}</p>
            </div>
            <div v-else class="squishy-scene">
              <div class="squishy-floor"><button class="squishy" :style="heartStyle" aria-label="말랑이 누르기. 마우스 또는 스페이스 키를 누른 뒤 놓으세요." @pointerdown="startPress" @pointerup="endPress" @pointercancel="endPress" @lostpointercapture="endPress" @keydown.space.prevent="pressing = true" @keyup.space.prevent="endPress" @keydown.enter.prevent="pressing = true" @keyup.enter.prevent="endPress" @blur="endPress"><span class="squishy-highlight"></span><span class="face"><i></i><span>{{ pressure > 80 ? '﹏' : pressure > 28 ? 'ᴗ' : 'ω' }}</span><i></i></span><span class="cheek cheek-left"></span><span class="cheek cheek-right"></span></button></div>
              <div class="pressure-scale" role="meter" aria-label="누르는 세기, 28에서 72가 적당합니다" :aria-valuenow="Math.floor(pressure)" aria-valuemin="0" aria-valuemax="100"><span class="sweet-spot"></span><i :style="{ left: `${pressure}%` }"></i></div>
              <p class="squishy-caption" aria-live="polite">{{ pressure > 80 ? '조금만 살살.' : pressure >= 28 && pressure <= 72 ? '지금 좋아.' : '꾹 눌렀다가, 놓아줘.' }}</p>
              <div class="affection-bar" role="progressbar" :aria-valuenow="Math.floor(affection)" aria-valuemin="0" aria-valuemax="100" aria-label="다정함 충전"><i :style="{ width: `${affection}%` }"></i></div>
            </div>
          </template>
          <div v-else class="vault-scene">
            <h1 class="stage-title" tabindex="-1">이제, 마음을 열어줘.</h1>
            <div class="vault-cards"><span v-for="(digit, i) in content.digits" :key="i">{{ solved[i] ? digit : '?' }}</span></div>
            <form @submit.prevent="unlock"><label for="pin" class="sr-only">네 자리 비밀번호</label><input id="pin" v-model="pin" type="text" inputmode="numeric" pattern="[0-9]{4}" maxlength="4" autocomplete="off" class="pin-input" placeholder="· · · ·" @input="pin = pin.replace(/\D/g, ''); feedback = ''"><button class="button primary unlock-button" :disabled="!allDone || unlocking || pin.length !== 4">편지 열기<ArrowRight :size="18" /></button></form>
            <p v-if="feedback" class="feedback" role="alert">{{ feedback }}</p>
          </div>
        </section>
      </Transition>
    </main>

    <ScrollLetter v-else />

    <Transition name="modal"><div v-if="reward !== null" class="modal-backdrop" role="dialog" aria-modal="true" aria-labelledby="reward-title"><div class="reward-modal"><h2 id="reward-title">{{ ['첫 번째', '두 번째', '세 번째', '마지막'][reward] }} 조각.</h2><div class="reward-card"><strong>{{ content.digits[reward] }}</strong></div><button class="button primary reward-next" @click="continueStage">{{ reward === 3 ? '편지로 가기' : '다음으로' }}<ArrowRight :size="18" /></button></div></div></Transition>
    <Transition name="modal"><div v-if="resetDialog" class="modal-backdrop" role="dialog" aria-modal="true" aria-labelledby="reset-title" @keydown.esc="resetDialog = false"><div class="reset-modal"><h2 id="reset-title">처음부터 다시 할까?</h2><p>모아둔 카드가 초기화돼.</p><div><button class="button secondary" @click="resetDialog = false">계속할래</button><button class="button primary" @click="reset">다시 시작</button></div></div></div></Transition>
    <Transition name="modal"><div v-if="unlocking" class="unlock-overlay" role="status" aria-live="polite"><div class="unlock-rings"><LockKeyhole :size="47" :stroke-width="1" /></div><p>마음이 열리는 중.</p></div></Transition>
  </div>
</template>
