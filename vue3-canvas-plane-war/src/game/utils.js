/** 将数值限制到指定范围。 */
export function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value))
}

/** 矩形 AABB 碰撞检测，适用于本项目的战机、子弹和补给。 */
export function rectsOverlap(a, b) {
  return (
    a.x < b.x + b.width &&
    a.x + a.width > b.x &&
    a.y < b.y + b.height &&
    a.y + a.height > b.y
  )
}

/** 分数每 1,200 分提升一关，最高展示为 99 关。 */
export function levelFromScore(score) {
  return Math.min(99, Math.floor(score / 1200) + 1)
}

/** 难度随关卡提升，设置上限避免后期完全不可玩。 */
export function difficultyForLevel(level) {
  return {
    enemySpeedMultiplier: Math.min(2.45, 1 + (level - 1) * 0.09),
    spawnInterval: Math.max(0.30, 0.93 - (level - 1) * 0.045),
    enemyHealthBonus: Math.floor((level - 1) / 4),
  }
}

/** 从 localStorage 中安全读取最高分。 */
export function readHighScore(storageKey) {
  try {
    return Number.parseInt(window.localStorage.getItem(storageKey) || '0', 10) || 0
  } catch {
    return 0
  }
}

/** 将最高分持久化；隐私模式下失败也不影响游戏。 */
export function saveHighScore(storageKey, score) {
  try {
    window.localStorage.setItem(storageKey, String(score))
  } catch {
    // 忽略存储不可用的环境，例如部分无痕模式或嵌入式 WebView。
  }
}

/** 用线性插值让数值渐变更平滑。 */
export function lerp(start, end, amount) {
  return start + (end - start) * amount
}
