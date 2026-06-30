<script setup>
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import { PlaneGame } from '../game/PlaneGame'
import { SoundManager } from '../game/SoundManager'
import { STORAGE_KEY } from '../game/constants'
import { readHighScore, saveHighScore } from '../game/utils'

const canvasRef = ref(null)
const gameState = ref('idle')
const isSoundEnabled = ref(true)
const gameStats = ref({
  score: 0,
  level: 1,
  health: 100,
  rapidFireRemaining: 0,
})
const highScore = ref(readHighScore(STORAGE_KEY))

let game = null
let soundManager = null

const primaryButtonLabel = computed(() => {
  if (gameState.value === 'playing') return '暂停任务'
  if (gameState.value === 'paused') return '继续任务'
  if (gameState.value === 'gameover') return '重新起飞'
  return '开始任务'
})

const stateLabel = computed(() => ({
  idle: '待命',
  playing: '作战中',
  paused: '已暂停',
  gameover: '任务失败',
}[gameState.value]))

function handlePrimaryAction() {
  if (!game) return
  if (gameState.value === 'paused') game.resume()
  else if (gameState.value === 'playing') game.pause()
  else if (gameState.value === 'gameover') game.restart()
  else game.start()
}

function toggleSound() {
  isSoundEnabled.value = !isSoundEnabled.value
  soundManager?.setEnabled(isSoundEnabled.value)
}

function setDirection(direction, isDown) {
  game?.setDirection(direction, isDown)
}

function handleKeyDown(event) {
  const relevantKeys = ['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'w', 'a', 's', 'd', 'W', 'A', 'S', 'D']
  if (relevantKeys.includes(event.key)) {
    event.preventDefault()
    game?.setKey(event.key, true)
  }

  if (event.code === 'Space') {
    event.preventDefault()
    if (gameState.value === 'playing' || gameState.value === 'paused') game?.togglePause()
  }
}

function handleKeyUp(event) {
  game?.setKey(event.key, false)
}

function handleCanvasPointerDown(event) {
  event.currentTarget.setPointerCapture?.(event.pointerId)
  game?.setPointer(true, event.clientX, event.clientY)
}

function handleCanvasPointerMove(event) {
  if (event.buttons === 1 || event.pointerType === 'touch') {
    game?.setPointer(true, event.clientX, event.clientY)
  }
}

function handleCanvasPointerEnd() {
  game?.setPointer(false)
}

function handleVisibilityChange() {
  game?.onVisibilityChange(document.hidden)
}

function handleResize() {
  game?.resizeCanvas()
}

onMounted(() => {
  soundManager = new SoundManager()
  game = new PlaneGame(canvasRef.value, {
    soundManager,
    onStateChange: (nextState) => {
      gameState.value = nextState
    },
    onStatsChange: (nextStats) => {
      gameStats.value = nextStats
    },
    onGameOver: ({ score }) => {
      if (score > highScore.value) {
        highScore.value = score
        saveHighScore(STORAGE_KEY, score)
      }
    },
  })

  window.addEventListener('keydown', handleKeyDown)
  window.addEventListener('keyup', handleKeyUp)
  window.addEventListener('resize', handleResize)
  document.addEventListener('visibilitychange', handleVisibilityChange)
})

onBeforeUnmount(() => {
  window.removeEventListener('keydown', handleKeyDown)
  window.removeEventListener('keyup', handleKeyUp)
  document.removeEventListener('visibilitychange', handleVisibilityChange)
  game?.destroy()
})
</script>

<template>
  <section class="game-card" aria-label="星际空战游戏">
    <header class="game-toolbar">
      <div>
        <p class="toolbar-kicker">训练任务</p>
        <p class="mission-title">深空拦截 · {{ stateLabel }}</p>
      </div>
      <button
        class="icon-button"
        type="button"
        :aria-label="isSoundEnabled ? '关闭音效' : '开启音效'"
        :title="isSoundEnabled ? '关闭音效' : '开启音效'"
        @click="toggleSound"
      >
        {{ isSoundEnabled ? '🔊' : '🔇' }}
      </button>
    </header>

    <div class="stats-bar" aria-label="游戏数据">
      <div class="stat-item">
        <span>得分</span>
        <strong>{{ gameStats.score.toLocaleString() }}</strong>
      </div>
      <div class="stat-item">
        <span>关卡</span>
        <strong>{{ gameStats.level }}</strong>
      </div>
      <div class="stat-item">
        <span>最高分</span>
        <strong>{{ highScore.toLocaleString() }}</strong>
      </div>
    </div>

    <div class="canvas-wrap">
      <canvas
        ref="canvasRef"
        class="game-canvas"
        width="480"
        height="720"
        aria-label="星际空战 Canvas 游戏画面"
        @pointerdown="handleCanvasPointerDown"
        @pointermove="handleCanvasPointerMove"
        @pointerup="handleCanvasPointerEnd"
        @pointercancel="handleCanvasPointerEnd"
        @pointerleave="handleCanvasPointerEnd"
      />
    </div>

    <div class="game-actions">
      <button class="primary-button" type="button" @click="handlePrimaryAction">
        {{ primaryButtonLabel }}
      </button>
      <button
        class="secondary-button"
        type="button"
        :disabled="gameState !== 'playing' && gameState !== 'paused'"
        @click="game?.togglePause()"
      >
        {{ gameState === 'paused' ? '继续' : '暂停' }}
      </button>
    </div>

    <div class="control-layout">
      <div class="control-help">
        <strong>操作方式</strong>
        <p>键盘：方向键 / WASD；空格暂停。也可按住画面或使用下方触控方向键移动。</p>
      </div>

      <div class="d-pad" aria-label="触控方向键">
        <button
          class="direction-button direction-up"
          type="button"
          aria-label="向上移动"
          @pointerdown.prevent="setDirection('up', true)"
          @pointerup.prevent="setDirection('up', false)"
          @pointerleave="setDirection('up', false)"
          @pointercancel="setDirection('up', false)"
        >▲</button>
        <button
          class="direction-button direction-left"
          type="button"
          aria-label="向左移动"
          @pointerdown.prevent="setDirection('left', true)"
          @pointerup.prevent="setDirection('left', false)"
          @pointerleave="setDirection('left', false)"
          @pointercancel="setDirection('left', false)"
        >◀</button>
        <button
          class="direction-button direction-right"
          type="button"
          aria-label="向右移动"
          @pointerdown.prevent="setDirection('right', true)"
          @pointerup.prevent="setDirection('right', false)"
          @pointerleave="setDirection('right', false)"
          @pointercancel="setDirection('right', false)"
        >▶</button>
        <button
          class="direction-button direction-down"
          type="button"
          aria-label="向下移动"
          @pointerdown.prevent="setDirection('down', true)"
          @pointerup.prevent="setDirection('down', false)"
          @pointerleave="setDirection('down', false)"
          @pointercancel="setDirection('down', false)"
        >▼</button>
      </div>
    </div>

    <footer class="pickup-guide">
      <span><b class="pickup-icon pickup-heal">+</b> 红色补给：恢复耐久</span>
      <span><b class="pickup-icon pickup-rapid">⚡</b> 金色补给：强化火力</span>
    </footer>
  </section>
</template>

<style scoped>
.game-card {
  width: min(100%, 590px);
  justify-self: center;
  overflow: hidden;
  border: 1px solid rgba(157, 215, 255, 0.2);
  border-radius: 24px;
  background: rgba(8, 22, 39, 0.9);
  box-shadow: 0 32px 90px rgba(0, 0, 0, 0.36);
  backdrop-filter: blur(18px);
}

.game-toolbar,
.stats-bar,
.game-actions,
.control-layout,
.pickup-guide {
  padding-inline: clamp(16px, 3vw, 24px);
}

.game-toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 18px;
  padding-block: 18px 14px;
}

.toolbar-kicker,
.mission-title { margin: 0; }

.toolbar-kicker {
  color: #81c8f2;
  font-size: 0.7rem;
  font-weight: 800;
  letter-spacing: 0.12em;
}

.mission-title {
  margin-top: 4px;
  font-size: 1rem;
  font-weight: 800;
}

.icon-button,
.secondary-button,
.direction-button {
  border: 1px solid rgba(153, 210, 245, 0.22);
  color: #dff4ff;
  background: rgba(20, 60, 88, 0.6);
  cursor: pointer;
}

.icon-button {
  width: 38px;
  height: 38px;
  border-radius: 12px;
  font-size: 1rem;
}

.icon-button:hover,
.secondary-button:hover:not(:disabled),
.direction-button:hover { background: rgba(34, 86, 120, 0.8); }

.stats-bar {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 9px;
  padding-bottom: 14px;
}

.stat-item {
  min-width: 0;
  padding: 10px 11px;
  border: 1px solid rgba(149, 207, 242, 0.12);
  border-radius: 12px;
  background: rgba(4, 16, 29, 0.64);
}

.stat-item span,
.stat-item strong { display: block; }
.stat-item span { color: #7da1b9; font-size: 0.69rem; font-weight: 700; }
.stat-item strong { overflow: hidden; margin-top: 3px; color: #f1fbff; font-size: 1.03rem; text-overflow: ellipsis; }

.canvas-wrap {
  overflow: hidden;
  margin: 0 12px;
  border: 1px solid rgba(145, 211, 255, 0.2);
  border-radius: 17px;
  background: #07111f;
  touch-action: none;
}

.game-canvas {
  display: block;
  width: 100%;
  height: auto;
  cursor: crosshair;
  touch-action: none;
  user-select: none;
}

.game-actions {
  display: grid;
  grid-template-columns: 1fr auto;
  gap: 10px;
  padding-block: 14px 12px;
}

.primary-button,
.secondary-button {
  min-height: 44px;
  border-radius: 12px;
  font-weight: 800;
  transition: transform 0.15s ease, background 0.15s ease;
}

.primary-button {
  border: 0;
  color: #062035;
  background: linear-gradient(130deg, #66e8ff, #8cbdff);
  cursor: pointer;
}

.primary-button:hover { transform: translateY(-1px); background: linear-gradient(130deg, #a2f0ff, #adcfff); }
.secondary-button { min-width: 80px; }
.secondary-button:disabled { cursor: not-allowed; opacity: 0.42; }

.control-layout {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 18px;
  padding-bottom: 14px;
}

.control-help { max-width: 305px; }
.control-help strong { font-size: 0.78rem; }
.control-help p { margin: 4px 0 0; color: #9db6c8; font-size: 0.72rem; line-height: 1.65; }

.d-pad {
  display: grid;
  grid-template-columns: repeat(3, 31px);
  grid-template-rows: repeat(2, 29px);
  gap: 4px;
}

.direction-button {
  display: grid;
  width: 31px;
  height: 29px;
  place-items: center;
  border-radius: 8px;
  font-size: 0.7rem;
  touch-action: none;
}
.direction-up { grid-column: 2; grid-row: 1; }
.direction-left { grid-column: 1; grid-row: 2; }
.direction-right { grid-column: 3; grid-row: 2; }
.direction-down { grid-column: 2; grid-row: 2; }

.pickup-guide {
  display: flex;
  flex-wrap: wrap;
  gap: 10px 18px;
  padding-block: 11px 16px;
  border-top: 1px solid rgba(149, 207, 242, 0.1);
  color: #91afc3;
  font-size: 0.72rem;
}

.pickup-icon {
  display: inline-grid;
  width: 17px;
  height: 17px;
  place-items: center;
  margin-right: 4px;
  border-radius: 4px;
  color: #13233c;
  font-size: 0.72rem;
}
.pickup-heal { background: #ff8080; }
.pickup-rapid { background: #ffe172; }

@media (max-width: 430px) {
  .game-card { border-radius: 18px; }
  .game-toolbar, .stats-bar, .game-actions, .control-layout, .pickup-guide { padding-inline: 14px; }
  .canvas-wrap { margin-inline: 9px; }
  .control-layout { align-items: flex-end; }
  .control-help { max-width: 230px; }
  .pickup-guide { font-size: 0.68rem; }
}
</style>
