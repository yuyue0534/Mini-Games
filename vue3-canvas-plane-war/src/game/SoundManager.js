/**
 * 使用 Web Audio API 生成简短反馈音，项目不依赖外部音频素材。
 * 浏览器需要用户首次点击后才能播放声音，调用方会在开始游戏时解锁音频上下文。
 */
export class SoundManager {
  constructor() {
    this.enabled = true
    this.audioContext = null
  }

  unlock() {
    if (!this.enabled || typeof window === 'undefined') return

    const AudioContext = window.AudioContext || window.webkitAudioContext
    if (!AudioContext) return

    if (!this.audioContext) this.audioContext = new AudioContext()
    if (this.audioContext.state === 'suspended') this.audioContext.resume()
  }

  setEnabled(enabled) {
    this.enabled = enabled
    if (enabled) this.unlock()
  }

  playShoot() {
    this.#tone(220, 0.045, 'square', 0.025, 360)
  }

  playHit() {
    this.#tone(130, 0.07, 'sawtooth', 0.04, 80)
  }

  playExplosion() {
    this.#tone(105, 0.12, 'sawtooth', 0.06, 42)
  }

  playPickup() {
    this.#tone(520, 0.09, 'sine', 0.05, 760)
  }

  playGameOver() {
    this.#tone(190, 0.28, 'triangle', 0.06, 55)
  }

  #tone(startFrequency, duration, type, volume, endFrequency) {
    if (!this.enabled || !this.audioContext || this.audioContext.state !== 'running') return

    const now = this.audioContext.currentTime
    const oscillator = this.audioContext.createOscillator()
    const gain = this.audioContext.createGain()

    oscillator.type = type
    oscillator.frequency.setValueAtTime(startFrequency, now)
    oscillator.frequency.exponentialRampToValueAtTime(Math.max(1, endFrequency), now + duration)

    gain.gain.setValueAtTime(volume, now)
    gain.gain.exponentialRampToValueAtTime(0.0001, now + duration)

    oscillator.connect(gain)
    gain.connect(this.audioContext.destination)
    oscillator.start(now)
    oscillator.stop(now + duration)
  }
}
