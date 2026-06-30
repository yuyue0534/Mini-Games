/**
 * 游戏基础参数集中维护，便于后续统一做数值平衡。
 */
export const GAME_WIDTH = 480
export const GAME_HEIGHT = 720
export const STORAGE_KEY = 'vue3-canvas-plane-war-high-score'

export const PLAYER = {
  width: 44,
  height: 56,
  speed: 330,
  maxHealth: 100,
  fireInterval: 0.18,
  invincibleTime: 0.7,
}

export const BULLET = {
  width: 5,
  height: 14,
  speed: 620,
  damage: 1,
}

export const POWER_UP = {
  size: 22,
  speed: 145,
  spawnChance: 0.18,
  rapidFireDuration: 7,
  rapidFireMultiplier: 0.52,
  healAmount: 24,
}

export const ENEMY_TYPES = [
  {
    id: 'scout',
    label: '侦察机',
    width: 34,
    height: 38,
    health: 1,
    speed: 120,
    score: 90,
    color: '#ff647c',
    spawnWeight: 0.62,
  },
  {
    id: 'fighter',
    label: '截击机',
    width: 46,
    height: 48,
    health: 2,
    speed: 94,
    score: 170,
    color: '#ffad56',
    spawnWeight: 0.28,
  },
  {
    id: 'destroyer',
    label: '重型机',
    width: 62,
    height: 54,
    health: 5,
    speed: 58,
    score: 420,
    color: '#c388ff',
    spawnWeight: 0.10,
  },
]
