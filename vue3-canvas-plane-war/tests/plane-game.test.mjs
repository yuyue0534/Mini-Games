import assert from 'node:assert/strict'
import test from 'node:test'
import { PlaneGame } from '../src/game/PlaneGame.js'

// PlaneGame 依赖 Canvas 2D API。这里用最小化的无绘制 mock，专注测试游戏规则而非像素输出。
function createMockCanvas() {
  const gradient = { addColorStop() {} }
  const context = new Proxy({}, {
    get(_, property) {
      if (property === 'createLinearGradient' || property === 'createRadialGradient') return () => gradient
      return () => {}
    },
    set() {
      return true
    },
  })

  return {
    clientWidth: 480,
    width: 480,
    height: 720,
    getContext: () => context,
    getBoundingClientRect: () => ({ left: 0, top: 0, width: 480, height: 720 }),
  }
}

function createGame(callbacks = {}) {
  global.window = { devicePixelRatio: 1 }
  const sound = {
    unlock() {},
    playShoot() {},
    playHit() {},
    playExplosion() {},
    playPickup() {},
    playGameOver() {},
  }
  return new PlaneGame(createMockCanvas(), { soundManager: sound, ...callbacks })
}

test('player bullet destroys an enemy and awards score', () => {
  const game = createGame()
  game.gameState = 'playing'
  game.enemies = [{
    x: 100,
    y: 100,
    width: 34,
    height: 38,
    health: 1,
    maxHealth: 1,
    score: 90,
    color: '#ff647c',
  }]
  game.bullets = [{ x: 112, y: 108, width: 5, height: 14, damage: 1 }]

  game.resolveCollisions()

  assert.equal(game.score, 90)
  assert.equal(game.enemies.length, 0)
  assert.equal(game.bullets.length, 0)
  assert.ok(game.particles.length > 0)
})

test('collecting rapid-fire supply enables the player buff', () => {
  const game = createGame()
  game.gameState = 'playing'
  game.powerUps = [{
    type: 'rapid',
    x: game.player.x + 5,
    y: game.player.y + 5,
    width: 22,
    height: 22,
    speed: 145,
    rotation: 0,
  }]

  game.resolveCollisions()

  assert.ok(game.player.rapidFireFor > 0)
  assert.equal(game.powerUps.length, 0)
  assert.equal(game.score, 65)
})

test('lethal player damage ends the round and notifies the UI', () => {
  let result = null
  const game = createGame({ onGameOver: (payload) => { result = payload } })
  game.gameState = 'playing'
  game.player.health = 10
  game.score = 680

  game.damagePlayer(20, 120, 300)

  assert.equal(game.gameState, 'gameover')
  assert.equal(result.score, 680)
  assert.equal(result.level, 1)
})
