import {
  BULLET,
  ENEMY_TYPES,
  GAME_HEIGHT,
  GAME_WIDTH,
  PLAYER,
  POWER_UP,
} from './constants.js'
import {
  clamp,
  difficultyForLevel,
  levelFromScore,
  rectsOverlap,
} from './utils.js'

/**
 * Canvas 游戏运行时。
 * 负责实体更新、碰撞、绘制和游戏循环；Vue 仅负责外层 UI 与状态展示。
 */
export class PlaneGame {
  constructor(canvas, { onStateChange, onStatsChange, onGameOver, soundManager }) {
    this.canvas = canvas
    this.ctx = canvas.getContext('2d')
    this.onStateChange = onStateChange
    this.onStatsChange = onStatsChange
    this.onGameOver = onGameOver
    this.sound = soundManager

    this.dpr = Math.min(window.devicePixelRatio || 1, 2)
    this.animationFrameId = null
    this.lastTime = 0
    this.gameState = 'idle'
    this.keys = new Set()
    this.pointer = { active: false, x: 0, y: 0 }
    this.manualDirections = { up: false, down: false, left: false, right: false }
    this.statsTick = 0
    this.stars = this.createStars()

    this.resizeCanvas()
    this.reset()
    this.draw()
  }

  resizeCanvas() {
    const cssWidth = this.canvas.clientWidth || GAME_WIDTH
    const cssHeight = (cssWidth / GAME_WIDTH) * GAME_HEIGHT

    this.canvas.width = Math.round(cssWidth * this.dpr)
    this.canvas.height = Math.round(cssHeight * this.dpr)
    this.ctx.setTransform(this.dpr * (cssWidth / GAME_WIDTH), 0, 0, this.dpr * (cssWidth / GAME_WIDTH), 0, 0)
  }

  reset() {
    this.player = {
      x: GAME_WIDTH / 2 - PLAYER.width / 2,
      y: GAME_HEIGHT - 95,
      width: PLAYER.width,
      height: PLAYER.height,
      health: PLAYER.maxHealth,
      fireCooldown: 0,
      invincibleFor: 0,
      rapidFireFor: 0,
    }

    this.bullets = []
    this.enemies = []
    this.powerUps = []
    this.particles = []
    this.score = 0
    this.level = 1
    this.enemySpawnCooldown = 0.6
    this.elapsed = 0
    this.statsTick = 0
    this.emitStats()
  }

  start() {
    this.sound.unlock()
    this.reset()
    this.setState('playing')
    this.lastTime = performance.now()
    this.loop(this.lastTime)
  }

  restart() {
    this.stopLoop()
    this.start()
  }

  pause() {
    if (this.gameState !== 'playing') return
    this.setState('paused')
    this.stopLoop()
    this.draw()
  }

  resume() {
    if (this.gameState !== 'paused') return
    this.sound.unlock()
    this.setState('playing')
    this.lastTime = performance.now()
    this.loop(this.lastTime)
  }

  togglePause() {
    if (this.gameState === 'playing') this.pause()
    else if (this.gameState === 'paused') this.resume()
  }

  destroy() {
    this.stopLoop()
    this.keys.clear()
  }

  setKey(key, isDown) {
    const normalizedKey = key.toLowerCase()
    if (isDown) this.keys.add(normalizedKey)
    else this.keys.delete(normalizedKey)
  }

  setDirection(direction, isDown) {
    if (direction in this.manualDirections) this.manualDirections[direction] = isDown
  }

  setPointer(active, clientX, clientY) {
    if (!active) {
      this.pointer.active = false
      return
    }

    const bounds = this.canvas.getBoundingClientRect()
    const scaleX = GAME_WIDTH / bounds.width
    const scaleY = GAME_HEIGHT / bounds.height
    this.pointer.active = true
    this.pointer.x = (clientX - bounds.left) * scaleX
    this.pointer.y = (clientY - bounds.top) * scaleY
  }

  onVisibilityChange(hidden) {
    if (hidden && this.gameState === 'playing') this.pause()
  }

  loop(now) {
    if (this.gameState !== 'playing') return

    const deltaSeconds = Math.min((now - this.lastTime) / 1000, 0.033)
    this.lastTime = now

    this.update(deltaSeconds)
    this.draw()
    this.animationFrameId = requestAnimationFrame((time) => this.loop(time))
  }

  stopLoop() {
    if (this.animationFrameId) {
      cancelAnimationFrame(this.animationFrameId)
      this.animationFrameId = null
    }
  }

  update(delta) {
    this.elapsed += delta
    this.level = levelFromScore(this.score)
    this.updateStars(delta)
    this.updatePlayer(delta)
    this.updateBullets(delta)
    this.spawnEnemies(delta)
    this.updateEnemies(delta)
    this.updatePowerUps(delta)
    this.updateParticles(delta)
    this.resolveCollisions()

    this.statsTick += delta
    if (this.statsTick >= 0.1) {
      this.statsTick = 0
      this.emitStats()
    }
  }

  updatePlayer(delta) {
    const { player } = this
    let horizontal = 0
    let vertical = 0

    if (this.keys.has('arrowleft') || this.keys.has('a') || this.manualDirections.left) horizontal -= 1
    if (this.keys.has('arrowright') || this.keys.has('d') || this.manualDirections.right) horizontal += 1
    if (this.keys.has('arrowup') || this.keys.has('w') || this.manualDirections.up) vertical -= 1
    if (this.keys.has('arrowdown') || this.keys.has('s') || this.manualDirections.down) vertical += 1

    // 鼠标或触摸按住画布时，战机平滑跟随指针。
    if (this.pointer.active) {
      const targetX = this.pointer.x - player.width / 2
      const targetY = this.pointer.y - player.height / 2
      player.x += (targetX - player.x) * Math.min(1, 8 * delta)
      player.y += (targetY - player.y) * Math.min(1, 8 * delta)
    } else if (horizontal || vertical) {
      const magnitude = horizontal && vertical ? Math.SQRT1_2 : 1
      player.x += horizontal * PLAYER.speed * magnitude * delta
      player.y += vertical * PLAYER.speed * magnitude * delta
    }

    player.x = clamp(player.x, 10, GAME_WIDTH - player.width - 10)
    player.y = clamp(player.y, 190, GAME_HEIGHT - player.height - 15)
    player.fireCooldown -= delta
    player.invincibleFor = Math.max(0, player.invincibleFor - delta)
    player.rapidFireFor = Math.max(0, player.rapidFireFor - delta)

    const fireInterval = player.rapidFireFor > 0
      ? PLAYER.fireInterval * POWER_UP.rapidFireMultiplier
      : PLAYER.fireInterval

    if (player.fireCooldown <= 0) {
      player.fireCooldown = fireInterval
      this.firePlayerBullets()
    }
  }

  firePlayerBullets() {
    const { player } = this
    const rapid = player.rapidFireFor > 0
    const x = player.x + player.width / 2 - BULLET.width / 2

    this.bullets.push({
      x,
      y: player.y - BULLET.height + 5,
      width: BULLET.width,
      height: BULLET.height,
      speed: BULLET.speed,
      damage: BULLET.damage,
      color: rapid ? '#ffe172' : '#6cf4ff',
    })

    if (rapid) {
      this.bullets.push(
        {
          x: player.x + 7,
          y: player.y + 8,
          width: BULLET.width,
          height: BULLET.height,
          speed: BULLET.speed * 0.95,
          damage: BULLET.damage,
          color: '#ffe172',
        },
        {
          x: player.x + player.width - 12,
          y: player.y + 8,
          width: BULLET.width,
          height: BULLET.height,
          speed: BULLET.speed * 0.95,
          damage: BULLET.damage,
          color: '#ffe172',
        },
      )
    }

    this.sound.playShoot()
  }

  updateBullets(delta) {
    for (const bullet of this.bullets) bullet.y -= bullet.speed * delta
    this.bullets = this.bullets.filter((bullet) => bullet.y + bullet.height > -12)
  }

  spawnEnemies(delta) {
    this.enemySpawnCooldown -= delta
    if (this.enemySpawnCooldown > 0) return

    const difficulty = difficultyForLevel(this.level)
    this.enemySpawnCooldown = difficulty.spawnInterval * (0.65 + Math.random() * 0.65)

    const type = this.pickEnemyType()
    const margin = 18
    const x = margin + Math.random() * (GAME_WIDTH - type.width - margin * 2)

    this.enemies.push({
      ...type,
      x,
      y: -type.height - 12,
      health: type.health + difficulty.enemyHealthBonus,
      maxHealth: type.health + difficulty.enemyHealthBonus,
      speed: type.speed * difficulty.enemySpeedMultiplier * (0.88 + Math.random() * 0.25),
      drift: (Math.random() - 0.5) * 38,
      phase: Math.random() * Math.PI * 2,
    })
  }

  pickEnemyType() {
    const roll = Math.random()
    let accumulated = 0
    for (const type of ENEMY_TYPES) {
      accumulated += type.spawnWeight
      if (roll <= accumulated) return type
    }
    return ENEMY_TYPES[0]
  }

  updateEnemies(delta) {
    for (const enemy of this.enemies) {
      enemy.y += enemy.speed * delta
      enemy.x += Math.sin(this.elapsed * 2.2 + enemy.phase) * enemy.drift * delta
      enemy.x = clamp(enemy.x, 8, GAME_WIDTH - enemy.width - 8)
    }

    const escaped = this.enemies.filter((enemy) => enemy.y > GAME_HEIGHT + enemy.height)
    for (const enemy of escaped) this.damagePlayer(12, enemy.x + enemy.width / 2, GAME_HEIGHT - 30)
    this.enemies = this.enemies.filter((enemy) => enemy.y <= GAME_HEIGHT + enemy.height)
  }

  updatePowerUps(delta) {
    for (const powerUp of this.powerUps) {
      powerUp.y += powerUp.speed * delta
      powerUp.rotation += delta * 2.7
    }
    this.powerUps = this.powerUps.filter((powerUp) => powerUp.y < GAME_HEIGHT + powerUp.height)
  }

  updateParticles(delta) {
    for (const particle of this.particles) {
      particle.x += particle.vx * delta
      particle.y += particle.vy * delta
      particle.vy += particle.gravity * delta
      particle.life -= delta
      particle.size *= 0.992
    }
    this.particles = this.particles.filter((particle) => particle.life > 0 && particle.size > 0.25)
  }

  updateStars(delta) {
    for (const star of this.stars) {
      star.y += star.speed * delta
      if (star.y > GAME_HEIGHT + 4) {
        star.y = -4
        star.x = Math.random() * GAME_WIDTH
      }
    }
  }

  resolveCollisions() {
    const removedBullets = new Set()
    const removedEnemies = new Set()

    for (let bulletIndex = 0; bulletIndex < this.bullets.length; bulletIndex += 1) {
      const bullet = this.bullets[bulletIndex]
      for (let enemyIndex = 0; enemyIndex < this.enemies.length; enemyIndex += 1) {
        if (removedEnemies.has(enemyIndex) || !rectsOverlap(bullet, this.enemies[enemyIndex])) continue

        const enemy = this.enemies[enemyIndex]
        enemy.health -= bullet.damage
        removedBullets.add(bulletIndex)
        this.createSpark(bullet.x + bullet.width / 2, bullet.y, '#d9fcff')
        this.sound.playHit()

        if (enemy.health <= 0) {
          removedEnemies.add(enemyIndex)
          this.destroyEnemy(enemy)
        }
        break
      }
    }

    this.bullets = this.bullets.filter((_, index) => !removedBullets.has(index))
    this.enemies = this.enemies.filter((_, index) => !removedEnemies.has(index))

    // 敌机直接接触玩家时造成伤害。
    const collidedEnemyIndexes = []
    this.enemies.forEach((enemy, index) => {
      if (rectsOverlap(this.player, enemy)) {
        collidedEnemyIndexes.push(index)
        this.damagePlayer(22, enemy.x + enemy.width / 2, enemy.y + enemy.height / 2)
        this.createExplosion(enemy.x + enemy.width / 2, enemy.y + enemy.height / 2, enemy.color)
      }
    })
    this.enemies = this.enemies.filter((_, index) => !collidedEnemyIndexes.includes(index))

    const collectedPowerUpIndexes = []
    this.powerUps.forEach((powerUp, index) => {
      if (!rectsOverlap(this.player, powerUp)) return
      collectedPowerUpIndexes.push(index)
      this.collectPowerUp(powerUp)
    })
    this.powerUps = this.powerUps.filter((_, index) => !collectedPowerUpIndexes.includes(index))
  }

  destroyEnemy(enemy) {
    this.score += enemy.score
    this.createExplosion(enemy.x + enemy.width / 2, enemy.y + enemy.height / 2, enemy.color)
    this.sound.playExplosion()

    if (Math.random() < POWER_UP.spawnChance) {
      const isRapidFire = Math.random() > 0.52
      this.powerUps.push({
        type: isRapidFire ? 'rapid' : 'heal',
        x: enemy.x + enemy.width / 2 - POWER_UP.size / 2,
        y: enemy.y + enemy.height / 2 - POWER_UP.size / 2,
        width: POWER_UP.size,
        height: POWER_UP.size,
        speed: POWER_UP.speed,
        rotation: 0,
      })
    }
  }

  collectPowerUp(powerUp) {
    if (powerUp.type === 'rapid') {
      this.player.rapidFireFor = POWER_UP.rapidFireDuration
    } else {
      this.player.health = Math.min(PLAYER.maxHealth, this.player.health + POWER_UP.healAmount)
    }

    this.score += 65
    this.createExplosion(
      powerUp.x + powerUp.width / 2,
      powerUp.y + powerUp.height / 2,
      powerUp.type === 'rapid' ? '#ffe172' : '#ff7a7a',
      14,
    )
    this.sound.playPickup()
  }

  damagePlayer(amount, x, y) {
    if (this.player.invincibleFor > 0 || this.gameState !== 'playing') return

    this.player.health = Math.max(0, this.player.health - amount)
    this.player.invincibleFor = PLAYER.invincibleTime
    this.createExplosion(x, y, '#ff6e77', 18)
    this.sound.playHit()

    if (this.player.health <= 0) this.endGame()
  }

  endGame() {
    this.stopLoop()
    this.setState('gameover')
    this.sound.playGameOver()
    this.emitStats()
    this.onGameOver?.({ score: this.score, level: this.level })
    this.draw()
  }

  setState(state) {
    this.gameState = state
    this.onStateChange?.(state)
  }

  emitStats() {
    this.onStatsChange?.({
      score: this.score,
      level: this.level,
      health: this.player.health,
      rapidFireRemaining: Math.ceil(this.player.rapidFireFor),
    })
  }

  createStars() {
    return Array.from({ length: 86 }, () => ({
      x: Math.random() * GAME_WIDTH,
      y: Math.random() * GAME_HEIGHT,
      size: 0.5 + Math.random() * 1.8,
      speed: 20 + Math.random() * 120,
      alpha: 0.18 + Math.random() * 0.78,
    }))
  }

  createSpark(x, y, color) {
    this.particles.push({
      x,
      y,
      vx: (Math.random() - 0.5) * 95,
      vy: 40 + Math.random() * 90,
      size: 1.4 + Math.random() * 1.8,
      life: 0.22 + Math.random() * 0.14,
      gravity: 80,
      color,
    })
  }

  createExplosion(x, y, color, count = 24) {
    for (let index = 0; index < count; index += 1) {
      const angle = Math.random() * Math.PI * 2
      const force = 45 + Math.random() * 190
      this.particles.push({
        x,
        y,
        vx: Math.cos(angle) * force,
        vy: Math.sin(angle) * force,
        size: 1.7 + Math.random() * 4.2,
        life: 0.32 + Math.random() * 0.45,
        gravity: 70,
        color,
      })
    }
  }

  draw() {
    const { ctx } = this
    ctx.clearRect(0, 0, GAME_WIDTH, GAME_HEIGHT)
    this.drawBackground(ctx)
    this.drawStars(ctx)
    this.drawPowerUps(ctx)
    this.drawBullets(ctx)
    this.drawEnemies(ctx)
    this.drawParticles(ctx)
    this.drawPlayer(ctx)
    this.drawCanvasHud(ctx)

    if (this.gameState === 'paused') this.drawCanvasMessage(ctx, '已暂停', '按空格或点击继续')
    if (this.gameState === 'idle') this.drawCanvasMessage(ctx, '准备起飞', '点击开始任务，或先熟悉操作方式')
    if (this.gameState === 'gameover') this.drawCanvasMessage(ctx, '任务失败', `本次得分 ${this.score.toLocaleString()}`)
  }

  drawBackground(ctx) {
    const gradient = ctx.createLinearGradient(0, 0, 0, GAME_HEIGHT)
    gradient.addColorStop(0, '#050b18')
    gradient.addColorStop(0.52, '#07172a')
    gradient.addColorStop(1, '#06101e')
    ctx.fillStyle = gradient
    ctx.fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT)

    const glow = ctx.createRadialGradient(GAME_WIDTH * 0.72, GAME_HEIGHT * 0.22, 6, GAME_WIDTH * 0.72, GAME_HEIGHT * 0.22, 230)
    glow.addColorStop(0, 'rgba(80, 156, 255, 0.16)')
    glow.addColorStop(1, 'rgba(80, 156, 255, 0)')
    ctx.fillStyle = glow
    ctx.fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT)

    ctx.strokeStyle = 'rgba(110, 192, 255, 0.055)'
    ctx.lineWidth = 1
    for (let y = 0; y <= GAME_HEIGHT; y += 48) {
      ctx.beginPath()
      ctx.moveTo(0, y + (this.elapsed * 28) % 48)
      ctx.lineTo(GAME_WIDTH, y + (this.elapsed * 28) % 48)
      ctx.stroke()
    }
  }

  drawStars(ctx) {
    for (const star of this.stars) {
      ctx.fillStyle = `rgba(210, 240, 255, ${star.alpha})`
      ctx.fillRect(star.x, star.y, star.size, star.size)
    }
  }

  drawPlayer(ctx) {
    const { player } = this
    const flicker = player.invincibleFor > 0 && Math.floor(player.invincibleFor * 18) % 2 === 0
    if (flicker) return

    ctx.save()
    ctx.translate(player.x + player.width / 2, player.y + player.height / 2)

    const engineGlow = ctx.createRadialGradient(0, player.height / 2 + 2, 1, 0, player.height / 2 + 2, 26)
    engineGlow.addColorStop(0, 'rgba(89, 239, 255, 0.95)')
    engineGlow.addColorStop(1, 'rgba(89, 239, 255, 0)')
    ctx.fillStyle = engineGlow
    ctx.fillRect(-32, 12, 64, 42)

    ctx.fillStyle = '#6cf4ff'
    ctx.beginPath()
    ctx.moveTo(0, -player.height / 2)
    ctx.lineTo(player.width / 2 - 2, player.height / 2 - 10)
    ctx.lineTo(10, player.height / 2 - 5)
    ctx.lineTo(0, player.height / 2)
    ctx.lineTo(-10, player.height / 2 - 5)
    ctx.lineTo(-player.width / 2 + 2, player.height / 2 - 10)
    ctx.closePath()
    ctx.fill()

    ctx.fillStyle = '#133550'
    ctx.beginPath()
    ctx.moveTo(0, -16)
    ctx.lineTo(9, 11)
    ctx.lineTo(0, 19)
    ctx.lineTo(-9, 11)
    ctx.closePath()
    ctx.fill()

    ctx.fillStyle = '#e3fbff'
    ctx.beginPath()
    ctx.ellipse(0, -3, 6, 11, 0, 0, Math.PI * 2)
    ctx.fill()

    ctx.fillStyle = '#4cc4ff'
    ctx.fillRect(-17, 15, 8, 5)
    ctx.fillRect(9, 15, 8, 5)
    ctx.restore()
  }

  drawEnemies(ctx) {
    for (const enemy of this.enemies) {
      ctx.save()
      ctx.translate(enemy.x + enemy.width / 2, enemy.y + enemy.height / 2)
      ctx.fillStyle = enemy.color

      ctx.beginPath()
      ctx.moveTo(0, enemy.height / 2)
      ctx.lineTo(enemy.width / 2, -enemy.height / 2 + 8)
      ctx.lineTo(9, -enemy.height / 2)
      ctx.lineTo(0, -enemy.height / 2 + 11)
      ctx.lineTo(-9, -enemy.height / 2)
      ctx.lineTo(-enemy.width / 2, -enemy.height / 2 + 8)
      ctx.closePath()
      ctx.fill()

      ctx.fillStyle = 'rgba(18, 11, 38, 0.78)'
      ctx.fillRect(-7, -5, 14, 16)
      ctx.fillStyle = '#f8f4ff'
      ctx.fillRect(-3, -1, 6, 4)
      ctx.restore()

      if (enemy.maxHealth > 1) {
        const barWidth = enemy.width
        const ratio = enemy.health / enemy.maxHealth
        ctx.fillStyle = 'rgba(5, 10, 20, 0.75)'
        ctx.fillRect(enemy.x, enemy.y - 7, barWidth, 3)
        ctx.fillStyle = '#f6ecff'
        ctx.fillRect(enemy.x, enemy.y - 7, barWidth * ratio, 3)
      }
    }
  }

  drawBullets(ctx) {
    for (const bullet of this.bullets) {
      ctx.save()
      ctx.shadowBlur = 13
      ctx.shadowColor = bullet.color
      ctx.fillStyle = bullet.color
      ctx.fillRect(bullet.x, bullet.y, bullet.width, bullet.height)
      ctx.restore()
    }
  }

  drawPowerUps(ctx) {
    for (const powerUp of this.powerUps) {
      const isRapid = powerUp.type === 'rapid'
      ctx.save()
      ctx.translate(powerUp.x + powerUp.width / 2, powerUp.y + powerUp.height / 2)
      ctx.rotate(powerUp.rotation)
      ctx.shadowBlur = 18
      ctx.shadowColor = isRapid ? '#ffd66c' : '#ff7a7a'
      ctx.fillStyle = isRapid ? '#ffe172' : '#ff8080'
      ctx.fillRect(-powerUp.width / 2, -powerUp.height / 2, powerUp.width, powerUp.height)
      ctx.shadowBlur = 0
      ctx.fillStyle = '#10243a'
      ctx.font = 'bold 16px system-ui'
      ctx.textAlign = 'center'
      ctx.textBaseline = 'middle'
      ctx.fillText(isRapid ? '⚡' : '+', 0, 1)
      ctx.restore()
    }
  }

  drawParticles(ctx) {
    for (const particle of this.particles) {
      ctx.globalAlpha = Math.max(0, particle.life * 1.7)
      ctx.fillStyle = particle.color
      ctx.fillRect(particle.x, particle.y, particle.size, particle.size)
    }
    ctx.globalAlpha = 1
  }

  drawCanvasHud(ctx) {
    ctx.save()
    ctx.fillStyle = 'rgba(8, 24, 42, 0.62)'
    ctx.fillRect(14, 14, 154, 44)
    ctx.fillStyle = '#a8c4db'
    ctx.font = '600 11px system-ui'
    ctx.fillText('机体耐久', 25, 31)
    ctx.fillStyle = 'rgba(203, 228, 247, 0.18)'
    ctx.fillRect(25, 38, 130, 8)
    ctx.fillStyle = this.player.health > 34 ? '#64edb8' : '#ff7b86'
    ctx.fillRect(25, 38, 130 * (this.player.health / PLAYER.maxHealth), 8)
    ctx.restore()

    if (this.player.rapidFireFor > 0) {
      ctx.fillStyle = 'rgba(255, 222, 116, 0.18)'
      ctx.fillRect(GAME_WIDTH - 142, 14, 128, 30)
      ctx.fillStyle = '#ffe69b'
      ctx.font = '700 12px system-ui'
      ctx.textAlign = 'center'
      ctx.fillText(`强化火力 ${Math.ceil(this.player.rapidFireFor)}s`, GAME_WIDTH - 78, 34)
      ctx.textAlign = 'left'
    }
  }

  drawCanvasMessage(ctx, title, subtitle) {
    ctx.fillStyle = 'rgba(3, 10, 21, 0.62)'
    ctx.fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT)
    ctx.textAlign = 'center'
    ctx.fillStyle = '#f3fbff'
    ctx.font = '800 34px system-ui'
    ctx.fillText(title, GAME_WIDTH / 2, GAME_HEIGHT / 2 - 12)
    ctx.fillStyle = '#adc8dd'
    ctx.font = '500 14px system-ui'
    ctx.fillText(subtitle, GAME_WIDTH / 2, GAME_HEIGHT / 2 + 22)
    ctx.textAlign = 'left'
  }
}
