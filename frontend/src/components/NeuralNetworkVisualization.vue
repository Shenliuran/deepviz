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
import { defineComponent, ref, onMounted, onBeforeUnmount, render } from 'vue';
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { buildNetworkConnections, convertRawLayer, parseNetwork } from '../utils/parser';
import networkData from '../../temp/ordered_data.json';
import { createLayerGeometry, createLayerMaterial } from '../models/shapeFactory';
import type { Layer, NodeInfo, LayerTypeInfo } from '../types/neural-network';

export default defineComponent({
  name: 'NetworkVisualization',
  setup() {
    // refs
    // const canvasContainer = ref<HTMLDivElement>(null);
    const canvasContainer = ref<HTMLDivElement>();
    // 在NeuralNetworkVisualization.vue的<script>部分添加props定义
    /* const props = defineProps<{
      networkStructure?: number[];
      weights?: number[][][];
      activations?: number[][];
    }>(); */
    
    // 状态
    // const scene = ref<THREE.Scene | null>(null);
    const scene = new THREE.Scene();
    let camera: THREE.PerspectiveCamera | null = null;
    let renderer: THREE.WebGLRenderer | null = null;
    let controls: OrbitControls | null = null;
    const networkDataParsed = ref<NodeInfo[]>([]);
    let nodes: THREE.Mesh[] = [];
    let lines: THREE.Line[] = [];
    
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
    const initThree = () => {
      if (!canvasContainer.value) return;
      
      // 创建场景
      // scene.value = new THREE.Scene();
  
      scene.background = new THREE.Color(0xf8f9fa);
      
      // 创建相机
      camera = new THREE.PerspectiveCamera(
        75,
        canvasContainer.value.clientWidth / canvasContainer.value.clientHeight,
        0.1,
        10000
      );
      camera.position.z = 1000;
      
      // 创建渲染器
      renderer = new THREE.WebGLRenderer({ antialias: true });
      renderer.setSize(
        canvasContainer.value.clientWidth,
        canvasContainer.value.clientHeight
      );
      canvasContainer.value.appendChild(renderer.domElement);
      
      // 添加控制器
      if (camera && renderer) {
        controls = new OrbitControls(camera, renderer.domElement);
        controls.enableDamping = true;
        controls.dampingFactor = 0.05; // 设置阻尼

        // 启用平移功能
        controls.enablePan = true;
        
        // 设置鼠标按钮功能
        controls.mouseButtons = {
          LEFT: THREE.MOUSE.ROTATE,   // 左键旋转
          MIDDLE: THREE.MOUSE.DOLLY,  // 滚轮缩放
          RIGHT: THREE.MOUSE.PAN      // 右键平移
        };
      }
      
      // 添加光源
      const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
      scene.add(ambientLight);
      
      const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
      directionalLight.position.set(100, 200, 300);
      scene.add(directionalLight);
    };
    
    // 创建可视化
    const createVisualization = () => {
      try {
        if (!scene) {
          console.error('Scene not initialized');
          return;
        }
      
      // 解析网络数据
        const rawData = networkData as any;
        if (!rawData) {
          console.error('Network data is missing');
          return;
        }
        
        const convertedData = convertRawLayer(rawData);
        networkDataParsed.value = parseNetwork(convertedData);
      
        // 创建节点
        createNodes(networkDataParsed.value);
      
        // 创建连接线
        createConnections(convertedData);
      } catch (error) {
        console.error('Error creating visualization:', error);
      }
    };
    
    // 创建节点
    const createNodes = (nodesData: NodeInfo[]) => {
      if (!scene) return;
      
      nodesData.forEach(nodeInfo => {
        const geometry = createLayerGeometry(nodeInfo.node.type);
        const material = createLayerMaterial(nodeInfo.node.type);
        
        const mesh = new THREE.Mesh(geometry, material);
        
        // 设置位置
        mesh.position.set(nodeInfo.x, nodeInfo.y, nodeInfo.z);
        mesh.userData.id = nodeInfo.id;
        mesh.userData.type = nodeInfo.node.type;
        mesh.userData.layer = nodeInfo.node;
        
        // 调整某些形状的旋转
        if (['Conv2d', 'BatchNorm2d', 'ReLU'].includes(nodeInfo.node.type)) {
          mesh.rotation.z = Math.PI / 2;
        }
        
        scene!.add(mesh);
        nodes.push(mesh);
        
        // 添加标签
        addLabel(mesh, nodeInfo.node.name, nodeInfo.node.type, nodeInfo.node.id);
      });
    };
    
    // 添加标签
    const addLabel = (mesh: THREE.Mesh, name: string, type: string, id: string) => {
      // 创建canvas元素用于绘制文本
      const canvas = document.createElement('canvas');
      const context = canvas.getContext('2d');
      if (!context) return;
      
      // 设置canvas大小和样式
      canvas.width = 256;
      canvas.height = 128;
      context.fillStyle = '#ffffff';
      context.fillRect(0, 0, canvas.width, canvas.height);
      context.font = '16px Arial';
      context.fillStyle = '#000000';
      context.textAlign = 'center';
      context.textBaseline = 'middle';
      
      // 绘制文本
      context.fillText(name, canvas.width / 2, canvas.height / 3);
      // context.fillText(type, canvas.width / 2, 2 * canvas.height / 3);
      context.fillText(id, canvas.width / 2, 2 * canvas.height / 3);
      
      // 创建纹理
      const texture = new THREE.CanvasTexture(canvas);
      
      // 创建精灵材质
      const material = new THREE.SpriteMaterial({ 
        map: texture,
        transparent: true 
      });
      
      // 创建精灵并设置位置
      const sprite = new THREE.Sprite(material);
      sprite.position.set(
        mesh.position.x + 80,
        mesh.position.y,  // 在节点上方显示
        mesh.position.z
      );
      
      // 设置精灵大小
      sprite.scale.set(100, 50, 1);
      
      // 将精灵添加到场景
      scene.add(sprite);
    };
    
    // 创建连接
    const createConnections = (rootLayer: Layer) => {
      if (!scene) return;
      
      // 构建连接关系
      const connections = buildNetworkConnections(rootLayer);
      console.log('Network connections:', connections);
      
      // 创建节点映射以便查找
      const nodeMap = new Map<string, NodeInfo>();
      networkDataParsed.value.forEach(node => nodeMap.set(node.id, node));
      
      // 创建连接线
      connections.forEach(conn => {
        const sourceNode = nodeMap.get(conn.source);
        const targetNode = nodeMap.get(conn.target);
        
        if (sourceNode && targetNode) {
          createLine(
            { x: sourceNode.x, y: sourceNode.y, z: sourceNode.z },
            { x: targetNode.x, y: targetNode.y, z: targetNode.z },
            conn.isResidual ? 0xff0000 : 0x999999 // 残差连接使用红色，普通连接使用灰色
          );
        } else {
          console.warn('Could not find nodes for connection:', conn);
        }
      });
    };
    
    // 创建连接线
    const createLine = (
      start: { x: number, y: number, z: number },
      end: { x: number, y: number, z: number },
      color = 0x999999
    ) => {
      if (!scene) return;
      
      const geometry = new THREE.BufferGeometry().setFromPoints([
        new THREE.Vector3(start.x, start.y, start.z),
        new THREE.Vector3(end.x, end.y, end.z)
      ]);
      
      const material = new THREE.LineBasicMaterial({ color });
      const line = new THREE.Line(geometry, material);
      
      scene.add(line);
      lines.push(line);
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
    const handleResize = () => {
      if (!canvasContainer.value || !camera || !renderer) return;
      
      const width = canvasContainer.value.clientWidth;
      const height = canvasContainer.value.clientHeight;
      
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
      renderer.setSize(width, height);
    };
    
    // 生命周期
    onMounted(() => {
      initThree();
      createVisualization();
      animate();
      window.addEventListener('resize', handleResize);
    });
    
    onBeforeUnmount(() => {
      window.removeEventListener('resize', handleResize);
      // 清理资
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