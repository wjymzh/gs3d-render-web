<template>
  <!-- playcanvas 渲染画布 -->
  <canvas id="render"></canvas>
</template>

<script setup lang="ts">
import { onMounted } from "vue";
import { main } from "./pc-core/index";

onMounted(async () => {
  const canvas = document.getElementById("render") as HTMLCanvasElement;

  canvas!.style.height = `${600}px`;
  canvas!.style.width = `${800}px`;

  // 初始化画布
  main(canvas);
});
</script>
