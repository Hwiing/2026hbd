import { test, expect } from '@playwright/test'
import { readFileSync } from 'node:fs'

async function scrollToScene(page, selector, index) {
  const story = page.locator(selector)
  const count = await story.locator('.story-panel').count()
  await story.evaluate((element, { index, count }) => {
    const range = element.offsetHeight - innerHeight
    window.scrollTo({ top: element.offsetTop + range * Math.min(1, (index + .65) / count), behavior: 'instant' })
  }, { index, count })
  const panel = story.locator('.story-panel').nth(index)
  await expect(panel).toHaveAttribute('aria-hidden', 'false')
  await expect(panel).toHaveCSS('opacity', '1')
  return panel
}

test('native scrolling changes the pinned scene and reverses correctly', async ({ page }) => {
  const errors = []
  page.on('pageerror', error => errors.push(error.message))
  await page.goto('/')
  await expect(page.locator('.brand')).toHaveText('HBD Yuni')
  await page.evaluate(() => document.fonts.ready)
  await expect(page.getByRole('heading', { name: '너에게 가는 작은 모험.' })).toBeVisible()
  await page.screenshot({ path: 'test-results/intro-desktop.png' })
  await expect(page.locator('.landing-nav, .ticker, .stage-grid, .how, .site-footer')).toHaveCount(0)
  await page.mouse.wheel(0, 1650)
  await expect(page.locator('.scene-quiz')).toHaveCSS('opacity', '1')
  await expect(page.locator('.scene-envelope')).toHaveCSS('visibility', 'hidden')
  expect((await page.locator('.story-viewport').boundingBox()).y).toBe(0)
  await page.keyboard.press('PageDown')
  await expect(page.locator('.scene-photo')).toHaveCSS('opacity', '1')
  await page.screenshot({ path: 'test-results/photo-intro-desktop.png' })
  await page.mouse.wheel(0, -1000)
  await expect(page.locator('.scene-quiz')).toHaveCSS('opacity', '1')
  await scrollToScene(page, '.intro-story', 5)
  await page.getByRole('button', { name: '시작하기', exact: true }).click()
  await expect(page.locator('#answer')).toBeVisible()
  expect(await page.evaluate(() => scrollY)).toBe(0)
  await expect(page.locator('.lab-sidebar, .assessment-footer')).toHaveCount(0)
  await page.screenshot({ path: 'test-results/quiz-desktop.png' })
  await page.getByRole('button', { name: '처음 화면으로' }).click()
  await expect(page.locator('.scene-envelope')).toHaveCSS('opacity', '1')
  await scrollToScene(page, '.intro-story', 3)
  await expect(page.locator('.scene-record')).toHaveCSS('opacity', '1')
  expect(errors).toEqual([])
})

test('four gates still award cards, preserve progress, and unlock the scroll letter', async ({ page }) => {
  test.setTimeout(60000)
  const errors = []
  page.on('pageerror', error => errors.push(error.message))
  await page.goto('/')
  await scrollToScene(page, '.intro-story', 5)
  await page.getByRole('button', { name: '시작하기', exact: true }).click()
  const audio = page.locator('audio')
  await expect(audio).toHaveAttribute('data-track', 'scott')
  await expect.poll(() => audio.evaluate(el => !el.paused && el.currentTime > 0)).toBe(true)
  expect(await audio.evaluate(el => el.loop)).toBe(true)
  const scottTime = await audio.evaluate(el => el.currentTime)
  await page.locator('#answer').fill('틀린 답')
  await page.getByRole('button', { name: '정답 확인' }).click()
  await expect(page.getByRole('alert')).toContainText('조금만 더')
  await page.getByRole('button', { name: '힌트', exact: true }).click()
  await expect(page.locator('.hint-message')).toBeVisible()
  await expect(page.locator('.question-count')).toHaveText('1 / 2')
  await expect(page.locator('.quiz-citation')).toHaveText('(에베소서 2장 10절)')
  await page.screenshot({ path: 'test-results/verse-quiz-desktop.png' })
  for (const answer of ['예비', '직선']) {
    await page.locator('#answer').fill(answer)
    await page.getByRole('button', { name: '정답 확인' }).click()
    if (answer === '예비') {
      await expect(page.locator('.question-count')).toHaveText('2 / 2')
      await expect(page.locator('.quiz-question')).toContainText('돌아갈 수도 느리게 갈 수도 있지만')
    }
  }
  await expect(page.locator('.reward-card strong')).toHaveText('1')
  await expect(audio).toHaveAttribute('data-track', 'scott')
  expect(await audio.evaluate(el => el.currentTime)).toBeGreaterThanOrEqual(scottTime)
  await page.getByRole('dialog').getByRole('button', { name: '다음으로', exact: true }).click()
  const places = [
    { answer: '보드게임카페', initials: 'ㅂㄷㄱㅇㅋㅍ' },
    { answer: '고우즈온', initials: 'ㄱㅇㅈㅇ' },
    { answer: '롯데시티호텔김포공항', initials: 'ㄹㄷㅅㅌㅎㅌ ㄱㅍㄱㅎ' },
    { answer: '한쿡 서울타워점', initials: 'ㅎㅋ ㅅㅇㅌㅇㅈ' },
  ]
  for (const [index, place] of places.entries()) {
    await expect(page.locator('.question-count')).toHaveText(`${index + 1} / 4`)
    await expect(page.locator('#answer')).toHaveAttribute('placeholder', place.initials)
    await expect(page.locator('#answer')).toHaveValue('')
    await expect(page.locator('.place-scene img')).toHaveAttribute('src', new RegExp(`photo${index + 1}`))
    await expect.poll(() => page.locator('.place-scene img').evaluate(el => el.complete && el.naturalWidth > 0)).toBe(true)
    if (index === 0) {
      await page.locator('#answer').fill('이탈리아')
      await page.getByRole('button', { name: '정답 확인' }).click()
      await expect(page.getByRole('alert')).toBeVisible()
      await expect(page.locator('.question-count')).toHaveText('1 / 4')
      await page.screenshot({ path: 'test-results/place-quiz-desktop.png' })
    }
    await page.locator('#answer').fill(place.answer)
    await page.getByRole('button', { name: '정답 확인' }).click()
    if (index < places.length - 1) await expect(page.getByRole('dialog')).toHaveCount(0)
  }
  await expect(page.locator('.reward-card strong')).toHaveText('0')
  await expect(audio).toHaveAttribute('data-track', 'scott')
  expect(await audio.evaluate(el => el.paused)).toBe(false)
  await page.getByRole('dialog').getByRole('button', { name: '다음으로', exact: true }).click()
  await expect(audio).toHaveAttribute('data-track', 'diff-clip')
  await expect.poll(() => audio.evaluate(el => !el.paused && el.currentTime > 0)).toBe(true)
  expect(await audio.evaluate(el => el.duration)).toBeCloseTo(10, 3)
  expect(await audio.evaluate(el => el.loop)).toBe(false)
  await expect(page.locator('video')).toHaveCount(0)
  await expect(page.locator('#answer')).toHaveCount(0)
  await page.screenshot({ path: 'test-results/song-choice-desktop.png' })
  await page.getByRole('button', { name: 'La La Land', exact: true }).click()
  await expect(page.getByRole('alert')).toContainText('다른 곡')
  await expect(page.getByRole('dialog')).toHaveCount(0)
  await expect.poll(() => audio.evaluate(el => el.ended), { timeout: 12000 }).toBe(true)
  expect(await audio.evaluate(el => el.currentTime)).toBeCloseTo(10, 3)
  await page.getByRole('button', { name: '10초 다시 듣기' }).click()
  await expect.poll(() => audio.evaluate(el => !el.paused && el.currentTime < 2)).toBe(true)
  await page.getByRole('button', { name: 'Stardust', exact: true }).click()
  await expect(page.locator('.reward-card strong')).toHaveText('3')
  await expect(audio).toHaveAttribute('data-track', 'silent')
  await page.getByRole('dialog').getByRole('button', { name: '다음으로', exact: true }).click()
  await expect(audio).toHaveAttribute('data-track', 'silent')
  expect(await audio.evaluate(el => el.paused)).toBe(true)
  await page.locator('button.squishy').focus()
  await page.screenshot({ path: 'test-results/squishy-desktop.png' })
  for (let i = 0; i < 8; i++) {
    await page.keyboard.down('Space')
    await page.waitForTimeout(i === 0 ? 1950 : 1150)
    await page.keyboard.up('Space')
    await page.waitForTimeout(750)
    if (await page.getByRole('dialog').isVisible()) break
  }
  await expect(page.locator('.reward-card strong')).toHaveText('1')
  await page.getByRole('button', { name: '편지로 가기' }).click()
  await expect(page.locator('.vault-cards')).toHaveText('1031')
  await page.locator('#pin').fill('1111')
  await page.getByRole('button', { name: '편지 열기' }).click()
  await expect(page.getByRole('alert')).toContainText('순서대로')
  await page.locator('#pin').fill('1031')
  await page.getByRole('button', { name: '편지 열기' }).click()
  await expect(page.getByText('마음이 열리는 중.')).toBeVisible()
  await expect(page.getByRole('heading', { name: '내가 가장 좋아하는 너에게' })).toBeVisible()
  await expect(audio).toHaveAttribute('data-track', 'diff-full')
  await expect.poll(() => audio.evaluate(el => !el.paused && el.currentTime > 0)).toBe(true)
  expect(await audio.evaluate(el => el.duration)).toBeGreaterThan(190)
  expect(await audio.evaluate(el => el.loop)).toBe(false)
  await expect(page.locator('.letter-controls, .read-all, .letter-kicker')).toHaveCount(0)
  const sourceLetter = readFileSync(new URL('../src/letter.txt', import.meta.url), 'utf8')
  const displayedLetter = (await page.locator('.letter-content').allTextContents()).join('')
  expect(displayedLetter.replace(/\s/g, '')).toBe(sourceLetter.replace(/\s/g, ''))
  await expect(page.locator('.letter-photo')).toHaveCount(4)
  const firstLine = await scrollToScene(page, '.letter-story', 1)
  await expect(firstLine.locator('.letter-sentence')).toContainText('자기야! 앞으로 자기가 할 일에 대한')
  await expect(firstLine.locator('.letter-line').last()).toHaveCSS('opacity', '1')
  await page.screenshot({ path: 'test-results/letter-opening-desktop.png' })
  const count = await page.locator('.letter-panel').count()
  const lastLine = await scrollToScene(page, '.letter-story', count - 1)
  await expect(lastLine.locator('.letter-sentence')).toContainText('자기의 시간은 어떻게 되던 나와 함께하기에 헛되지 않다고 얘기해주고 싶어')
  await expect(lastLine.locator('.letter-line').last()).toHaveCSS('opacity', '1')
  await page.screenshot({ path: 'test-results/letter-desktop.png' })
  await scrollToScene(page, '.letter-story', 2)
  await expect(page.locator('.letter-panel').nth(2)).toContainText('누구에게나 그 사람만이 할 수 있고')
  await page.reload()
  await scrollToScene(page, '.intro-story', 5)
  await page.getByRole('button', { name: '이어서 하기', exact: true }).click()
  await expect(page.locator('#pin')).toBeVisible()
  await page.getByRole('button', { name: '처음부터', exact: true }).click()
  await page.getByRole('button', { name: '다시 시작', exact: true }).click()
  await expect(page.locator('.stage-number')).toHaveText('01 / 04')
  await expect(page.locator('#answer')).toBeVisible()
  expect(errors).toEqual([])
})

test('letter photos and original paragraphs fit small screens and reduced motion', async ({ page }) => {
  test.setTimeout(60000)
  await page.setViewportSize({ width: 390, height: 844 })
  await page.addInitScript(() => localStorage.setItem('birthday-lab-v1', JSON.stringify({ solved: [true, true, true, true] })))
  await page.goto('/')
  await scrollToScene(page, '.intro-story', 5)
  await page.getByRole('button', { name: '이어서 하기', exact: true }).click()
  await page.locator('#pin').fill('1031')
  await page.getByRole('button', { name: '편지 열기' }).click()
  await expect(page.locator('.letter-cover-content h1')).toBeVisible()
  const panels = page.locator('.letter-panel')
  for (let photo = 1; photo <= 4; photo++) {
    const index = await panels.evaluateAll((elements, number) => elements.findIndex(panel => panel.querySelector(`img[src*="photo${number}"]`)), photo)
    expect(index).toBeGreaterThan(0)
    const panel = await scrollToScene(page, '.letter-story', index)
    const image = panel.locator('.letter-photo img')
    await expect.poll(() => image.evaluate(el => el.complete && el.naturalWidth > 0)).toBe(true)
    await expect(panel.locator('.letter-line').last()).toHaveCSS('opacity', '1')
    const box = await panel.locator('.letter-composition').boundingBox()
    expect(box.y).toBeGreaterThanOrEqual(61)
    expect(box.y + box.height).toBeLessThanOrEqual(844)
  }
  const verseIndex = await panels.evaluateAll(elements => elements.findIndex(panel => panel.classList.contains('letter-verse')))
  const verse = await scrollToScene(page, '.letter-story', verseIndex)
  await expect(verse.locator('.letter-citation')).toHaveText('(에베소서 2장 10절)')
  const box = await verse.locator('.letter-composition').boundingBox()
  expect(box.y + box.height).toBeLessThanOrEqual(844)
  await page.screenshot({ path: 'test-results/letter-verse-mobile.png' })
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
  await page.emulateMedia({ reducedMotion: 'reduce' })
  for (const panel of await panels.all()) {
    await expect(panel).toHaveAttribute('aria-hidden', 'false')
    await expect(panel).toHaveCSS('opacity', '1')
  }
  for (const line of await page.locator('.letter-line').all()) await expect(line).toHaveCSS('opacity', '1')
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
})

test('autoplay denial can be resumed and music can be muted without restarting', async ({ page }) => {
  await page.addInitScript(() => {
    const original = HTMLMediaElement.prototype.play
    let initialAttempt = true
    HTMLMediaElement.prototype.play = function () {
      if (initialAttempt) {
        initialAttempt = false
        return Promise.reject(new DOMException('User gesture required', 'NotAllowedError'))
      }
      return original.call(this)
    }
  })
  await page.goto('/')
  const audio = page.locator('audio')
  await page.getByRole('button', { name: '소리 켜기', exact: true }).click()
  await expect.poll(() => audio.evaluate(el => !el.paused && el.currentTime > 0)).toBe(true)
  await page.getByRole('button', { name: '음악 끄기', exact: true }).click()
  const pausedAt = await audio.evaluate(el => el.currentTime)
  await page.keyboard.press('PageDown')
  expect(await audio.evaluate(el => el.paused)).toBe(true)
  await page.getByRole('button', { name: '음악 켜기', exact: true }).click()
  await expect.poll(() => audio.evaluate(el => !el.paused)).toBe(true)
  expect(await audio.evaluate(el => el.currentTime)).toBeGreaterThanOrEqual(pausedAt)
})

test('reduced motion exposes a readable static story on smaller screens', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 })
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await page.goto('/')
  await expect(page.locator('.intro-panel')).toHaveCount(6)
  for (const panel of await page.locator('.intro-panel').all()) {
    await expect(panel).toHaveAttribute('aria-hidden', 'false')
    await expect(panel).toHaveCSS('opacity', '1')
  }
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
  await page.screenshot({ path: 'test-results/intro-mobile.png' })
  await page.getByRole('button', { name: '시작하기', exact: true }).click()
  await expect(page.locator('#answer')).toBeVisible()
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
  await page.screenshot({ path: 'test-results/quiz-mobile.png' })
})
