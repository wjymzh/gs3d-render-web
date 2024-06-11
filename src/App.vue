<template>
  <!-- playcanvas 渲染画布 -->
  <div
    id="canvas-container"
    style="
      overflow: hidden;
      width: 100vw;
      height: 100vh;
      background-color: #666666;
    "
  >
    <canvas id="render"></canvas>
  </div>
</template>

<script setup lang="ts">
import { onMounted } from "vue";
import { main } from "./pc-core/index";

onMounted(() => {
  const canvas = document.getElementById("render") as HTMLCanvasElement;

  // canvas!.style.height = `100%`;
  // canvas!.style.width = `100%`;

  // 初始化画布
  main(canvas);
});
</script>
