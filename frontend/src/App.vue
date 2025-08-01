<template>
  <div class="app-container">
    <header>
      <h1>神经网络3D可视化工具</h1>
      <div class="status-indicator">
        后端连接: 
        <span :class="backendStatus === 'connected' ? 'connected' : 'disconnected'">
          {{ backendStatus === 'connected' ? '已连接' : '未连接' }}
        </span>
      </div>
    </header>
    
    <main>
      <div class="control-panel">
        <NetworkConfigurator @configure="onNetworkConfigure" />
        
        <div class="input-data" v-if="currentStructure.length > 0">
          <h3>输入数据</h3>
          <div class="input-values">
            <input
              type="number"
              v-model.number="inputData[i]"
              min="0"
              max="1"
              step="0.01"
              v-for="i in currentStructure[0]"
              :key="i"
              class="input-value"
            >
          </div>
          <button @click="computeActivations" class="compute-btn">
            计算激活值
          </button>
        </div>
      </div>
      
      <div class="visualization-area">
        <NeuralNetworkVisualization
          :network-structure="currentStructure"
          :weights="currentWeights"
          :activations="currentActivations"
        />
      </div>
    </main>
    
    <footer>
      <p>神经网络3D可视化工具 &copy; 2023</p>
    </footer>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import NetworkConfigurator from './components/NetworkConfigurator.vue';
import NeuralNetworkVisualization from './components/NeuralNetworkVisualization.vue';
import { networkApi } from './services/api';

// 状态
const backendStatus = ref<'connected' | 'disconnected'>('disconnected');
const currentStructure = ref<number[]>([]);
const currentWeights = ref<number[][][]>([]);
const currentActivations = ref<number[][] | undefined>(undefined);
const inputData = ref<number[]>([]);

// 检查后端连接
const checkBackendConnection = async () => {
  try {
    await networkApi.healthCheck();
    backendStatus.value = 'connected';
  } catch (error) {
    backendStatus.value = 'disconnected';
    console.error('无法连接到后端服务:', error);
  }
};

// 处理网络配置
const onNetworkConfigure = async (structure: number[]) => {
  currentStructure.value = structure;
  currentActivations.value = undefined;
  
  // 初始化输入数据
  inputData.value = Array(structure[0]).fill(0.5);
  
  // 从后端获取网络权重
  try {
    const networkData = await networkApi.generateNetwork({ layers: structure });
    currentWeights.value = networkData.weights;
  } catch (error) {
    console.error('获取网络数据失败:', error);
    // 生成客户端随机权重作为备选方案
    generateClientSideWeights(structure);
  }
};

// 计算激活值
const computeActivations = async () => {
  if (currentStructure.value.length === 0) return;
  
  try {
    const networkData = await networkApi.computeActivations(
      { layers: currentStructure.value },
      inputData.value
    );
    currentWeights.value = networkData.weights;
    currentActivations.value = networkData.activations;
  } catch (error) {
    console.error('计算激活值失败:', error);
  }
};

// 客户端生成随机权重（备用方案）
const generateClientSideWeights = (structure: number[]) => {
  const weights: number[][][] = [];
  
  for (let i = 0; i < structure.length - 1; i++) {
    const layerWeights: number[][] = [];
    for (let j = 0; j < structure[i]; j++) {
      const neuronWeights: number[] = [];
      for (let k = 0; k < structure[i + 1]; k++) {
        neuronWeights.push(Math.random() * 2 - 1); // [-1, 1]之间的随机数
      }
      layerWeights.push(neuronWeights);
    }
    weights.push(layerWeights);
  }
  
  currentWeights.value = weights;
};

// 初始化
onMounted(() => {
  checkBackendConnection();
  
  // 定期检查连接状态
  setInterval(checkBackendConnection, 10000);
  
  // 默认网络结构
  onNetworkConfigure([3, 4, 2]);
});
</script>

<style scoped>
.app-container {
  max-width: 1400px;
  margin: 0 auto;
  padding: 20px;
  font-family: Arial, sans-serif;
  color: #333;
}

header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
  padding-bottom: 10px;
  border-bottom: 1px solid #ddd;
}

h1 {
  margin: 0;
  color: #2c3e50;
}

.status-indicator {
  font-size: 0.9em;
}

.connected {
  color: #27ae60;
}

.disconnected {
  color: #e74c3c;
}

main {
  display: grid;
  grid-template-columns: 300px 1fr;
  gap: 20px;
}

.control-panel {
  background-color: #f8f9fa;
  padding: 20px;
  border-radius: 8px;
}

.input-data {
  margin-top: 20px;
  padding-top: 20px;
  border-top: 1px solid #ddd;
}

.input-values {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  margin: 15px 0;
}

.input-value {
  width: 60px;
  padding: 5px;
}

.compute-btn {
  background-color: #2ecc71;
  color: white;
  border: none;
  padding: 8px 16px;
  border-radius: 4px;
  cursor: pointer;
}

.compute-btn:hover {
  background-color: #27ae60;
}

.visualization-area {
  flex-grow: 1;
}

footer {
  margin-top: 20px;
  padding-top: 10px;
  border-top: 1px solid #ddd;
  text-align: center;
  color: #7f8c8d;
  font-size: 0.9em;
}
</style>