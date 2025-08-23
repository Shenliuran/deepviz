<template>
  <div class="network-visualization">
    <div ref="canvasContainer" class="canvas-container"></div>
    <div class="legend">
      <h3>层类型说明</h3>
      <div v-for="(item, key) in layerTypes" :key="key" class="legend-item">
        <div class="legend-color" :style="{ backgroundColor: `#${item.color.toString(16).padStart(6, '0')}` }"></div>
        <div class="legend-label">{{ key }} - {{ item.shape }}</div>
      </div>
    </div>
  </div>
</template>

<script lang="ts">
import { defineComponent, ref, onMounted, onBeforeUnmount } from 'vue';
import * as THREE from 'three';
import { buildNetworkConnections, convertRawLayer, parseNetwork } from '../utils/parser';
import networkData from '../../temp/ordered_data.json';
import { initThree, handleResize } from '../utils/three-helpers';
import { createGraph } from '../utils/network-visualization';
import { createLayerGeometry, createLayerMaterial } from '../models/shapeFactory';
import type { NodeInfo, LayerTypeInfo } from '../types/neural-network';
import type { OrbitControls } from 'three/examples/jsm/Addons.js';

export default defineComponent({
  name: 'NetworkVisualization',
  setup() {
    // refs
    const canvasContainer = ref<HTMLDivElement>();
    
    // 状态
    const scene = new THREE.Scene();
    let camera: THREE.PerspectiveCamera | null = null;
    let renderer: THREE.WebGLRenderer | null = null;
    let controls: OrbitControls | null = null;
    const networkDataParsed = ref<NodeInfo[]>([]);
    let nodes: THREE.Mesh[] = [];
    let lines: (THREE.Line | THREE.ArrowHelper)[] = [];
    
    // 层类型说明
    const layerTypes: Record<string, LayerTypeInfo> = {
      'ResNet': { shape: '大型立方体', color: 0x2196F3 },
      'Conv2d': { shape: '椭球体', color: 0x42A5F5 },
      'BatchNorm2d': { shape: '圆台', color: 0x66BB6A },
      'ReLU': { shape: '锥体', color: 0xFFCA28 },
      'MaxPool2d': { shape: '八面体', color: 0x26A69A },
      'Sequential': { shape: '线框立方体', color: 0xEC407A },
      'BasicBlock': { shape: '圆角立方体', color: 0xAB47BC },
      'Linear': { shape: '球体', color: 0xFF7043 },
      'Identity': { shape: '四面体', color: 0x8D6E63 }
    };
    
    // 初始化Three.js
    const initThreeJS = () => {
      if (!canvasContainer.value) return;
      
      const result = initThree(canvasContainer.value, scene);
      camera = result.camera;
      renderer = result.renderer;
      controls = result.controls;
    };
    
    // 创建可视化
    const createVisualization = async () => {
      if (!canvasContainer.value) return;
      
      const result = await createGraph(
        scene,
        nodes,
        lines,
        networkData,
        createLayerGeometry,
        createLayerMaterial,
        buildNetworkConnections,
        convertRawLayer,
        parseNetwork
      );
      
      if (result) {
        networkDataParsed.value = result;
      }
    };
    
    // 动画循环
    const animate = () => {
      requestAnimationFrame(animate);
      
      if (controls) {
        controls.update();
      }
      
      if (renderer && scene && camera) {
        renderer.render(scene, camera);
      }
    };
    
    // 处理窗口大小变化
    const onHandleResize = () => {
      if (!canvasContainer.value || !camera || !renderer) return;
      handleResize(canvasContainer.value, camera, renderer);
    };
    
    // 生命周期
    onMounted(async () => {
      initThreeJS();
      await createVisualization();
      animate();
      window.addEventListener('resize', onHandleResize);
    });
    
    onBeforeUnmount(() => {
      window.removeEventListener('resize', onHandleResize);
      // 清理资源
      if (renderer && canvasContainer.value) {
        canvasContainer.value.removeChild(renderer.domElement);
      }
    });
    
    return {
      canvasContainer,
      layerTypes
    };
  }
});
</script>

<style scoped>
.canvas-container {
  width: 100%;
  height: 800px;
  position: relative;
}

.legend {
  position: absolute;
  top: 20px;
  right: 20px;
  background: rgba(255, 255, 255, 0.9);
  padding: 15px;
  border-radius: 8px;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
  z-index: 100;
  max-width: 250px;
}

.legend h3 {
  margin-top: 0;
  font-size: 16px;
  color: #333;
}

.legend-item {
  display: flex;
  align-items: center;
  margin: 8px 0;
  font-size: 12px;
}

.legend-color {
  width: 12px;
  height: 12px;
  margin-right: 8px;
  border-radius: 2px;
}
</style>