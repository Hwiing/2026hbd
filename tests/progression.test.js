import test from 'node:test'
import assert from 'node:assert/strict'
import { content, matchesAnswer, isUnlocked } from '../src/content.js'

test('answers allow spacing and punctuation but reject unrelated guesses', () => {
  assert.equal(matchesAnswer(' 보드 게임 카페! ', content.places[0].answers), true)
  assert.equal(matchesAnswer('롯데시티호텔김포공항', content.places[2].answers), true)
  assert.equal(matchesAnswer('생일', content.quizzes[0].answers), false)
  assert.equal(matchesAnswer('', content.quizzes[1].answers), false)
})
test('the final lock requires all four gates and the correct code', () => {
  assert.equal(isUnlocked([true, true, true, false], '1031'), false)
  assert.equal(isUnlocked([true, true, true, true], '1030'), false)
  assert.equal(isUnlocked([true, true, true, true], '1031'), true)
  assert.equal(isUnlocked([], '1031'), false)
})
