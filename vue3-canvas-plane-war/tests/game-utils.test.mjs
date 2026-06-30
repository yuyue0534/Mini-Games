import assert from 'node:assert/strict'
import test from 'node:test'
import { clamp, difficultyForLevel, levelFromScore, rectsOverlap } from '../src/game/utils.js'

test('clamp constrains values to the supplied range', () => {
  assert.equal(clamp(-3, 0, 10), 0)
  assert.equal(clamp(13, 0, 10), 10)
  assert.equal(clamp(4, 0, 10), 4)
})

test('rectsOverlap detects collision and misses', () => {
  assert.equal(
    rectsOverlap(
      { x: 10, y: 10, width: 20, height: 20 },
      { x: 25, y: 25, width: 20, height: 20 },
    ),
    true,
  )
  assert.equal(
    rectsOverlap(
      { x: 10, y: 10, width: 20, height: 20 },
      { x: 31, y: 10, width: 20, height: 20 },
    ),
    false,
  )
})

test('level and difficulty scale while respecting configured caps', () => {
  assert.equal(levelFromScore(0), 1)
  assert.equal(levelFromScore(1_200), 2)
  assert.equal(levelFromScore(999_999), 99)

  const levelOne = difficultyForLevel(1)
  const levelTwenty = difficultyForLevel(20)
  assert.ok(levelTwenty.enemySpeedMultiplier > levelOne.enemySpeedMultiplier)
  assert.ok(levelTwenty.spawnInterval < levelOne.spawnInterval)
  assert.ok(levelTwenty.spawnInterval >= 0.30)
})
