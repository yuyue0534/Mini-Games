<script setup>
import GameCanvas from './components/GameCanvas.vue'
</script>

<template>
  <main class="app-shell">
    <section class="hero-copy" aria-label="游戏说明">
      <p class="eyebrow">VUE 3 · CANVAS · JAVASCRIPT</p>
      <h1>星际空战</h1>
      <p class="intro">
        方向键或 WASD 控制战机，自动射击。摧毁敌机获得积分，关卡会随分数提高；
        红色补给会修复机体，金色补给可短时间强化火力。
      </p>
      <div class="feature-list" aria-label="项目功能">
        <span>Canvas 游戏循环</span>
        <span>键盘与触控操作</span>
        <span>碰撞、粒子与关卡</span>
        <span>本地最高分</span>
      </div>
    </section>

    <GameCanvas />
  </main>
</template>
