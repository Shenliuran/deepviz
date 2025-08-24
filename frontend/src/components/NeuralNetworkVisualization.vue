<template>
  <div class="network-visualization">
    <div ref="canvasContainer" class="canvas-container"></div>
    <div class="controls">
      <div class="control-group">
        <label>X步长: {{ steps.xStep }}</label>
        <input 
          type="range" 
          min="50" 
          max="500" 
          v-model.number="steps.xStep" 
          @input="updateSteps" 
          class="slider"
        >
      </div>
      <div class="control-group">
        <label>Y步长: {{ steps.yStep }}</label>
        <input 
          type="range" 
          min="50" 
          max="500" 
          v-model.number="steps.yStep" 
          @input="updateSteps" 
          class="slider"
        >
      </div>
      <div class="control-group">
        <label>Z步长: {{ steps.zStep }}</label>
        <input 
          type="range" 
          min="50" 
          max="500" 
          v-model.number="steps.zStep" 
          @input="updateSteps" 
          class="slider"
        >
      </div>
      <button @click="resetView" class="reset-button">重置视角</button>
    </div>
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
import { defineComponent, ref, reactive, onMounted, onBeforeUnmount } from 'vue';
import * as THREE from 'three';
import { NetworkParser } from '../utils/parser';
import networkData from '../../temp/ordered_data.json';
import { initThree, handleResize } from '../utils/three-helpers';
import { NetworkVisualizer } from '../utils/network-visualization';
import { ShapeFactory } from '../models/shapeFactory';
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
    let networkVisualizer: NetworkVisualizer | null = null;
    const shapeFactory = new ShapeFactory();
    const networkParser = new NetworkParser();
    
    // 步长控制
    const steps = reactive({
      xStep: 200,
      yStep: 200,
      zStep: 200
    });
    
    // 层类型说明
    const layerTypes: Record<string, LayerTypeInfo> = {
      'ResNet': { shape: '大型立方体', color: 0x2196F3 },
      'Conv2d': { shape: '圆柱体', color: 0x42A5F5 },
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
    
    // 更新步长参数
    const updateSteps = () => {
      networkParser.setSteps(steps.xStep, steps.yStep, steps.zStep);
      // 重新创建可视化
      recreateVisualization();
    };
    
    // 重置视角
    const resetView = () => {
      if (camera && controls) {
        camera.position.set(0, 0, 1000);
        controls.reset();
      }
    };
    
    // 重新创建可视化
    const recreateVisualization = () => {
      if (!canvasContainer.value) return;
      
      // 清理现有可视化
      if (networkVisualizer) {
        networkVisualizer.clear();
      }
      
      // 创建新的可视化器实例
      networkVisualizer = new NetworkVisualizer(scene);
      
      const result = networkVisualizer.createGraph(
        networkData,
        shapeFactory,
        networkParser
      );
      
      if (result) {
        networkDataParsed.value = result;
      }
    };
    
    // 创建可视化
    const createVisualization = () => {
      if (!canvasContainer.value) return;
      
      // 设置初始步长
      networkParser.setSteps(steps.xStep, steps.yStep, steps.zStep);
      
      // 创建网络可视化器实例
      networkVisualizer = new NetworkVisualizer(scene);
      
      const result = networkVisualizer.createGraph(
        networkData,
        shapeFactory,
        networkParser
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
    onMounted(() => {
      initThreeJS();
      createVisualization();
      animate();
      window.addEventListener('resize', onHandleResize);
    });
    
    onBeforeUnmount(() => {
      window.removeEventListener('resize', onHandleResize);
      // 清理资源
      if (networkVisualizer) {
        networkVisualizer.clear();
      }
      if (renderer && canvasContainer.value) {
        canvasContainer.value.removeChild(renderer.domElement);
      }
    });
    
    return {
      canvasContainer,
      layerTypes,
      steps,
      updateSteps,
      resetView
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

.controls {
  position: absolute;
  top: 20px;
  left: 20px;
  background: rgba(255, 255, 255, 0.9);
  padding: 15px;
  border-radius: 8px;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
  z-index: 100;
  max-width: 250px;
}

.control-group {
  margin-bottom: 10px;
}

.control-group label {
  display: block;
  margin-bottom: 5px;
  font-size: 14px;
  color: #333;
}

.slider {
  width: 100%;
}

.reset-button {
  background-color: #42b983;
  color: white;
  border: none;
  padding: 8px 16px;
  border-radius: 4px;
  cursor: pointer;
  font-size: 14px;
}

.reset-button:hover {
  background-color: #359c6d;
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