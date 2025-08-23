// shapeFactory.ts
import * as THREE from 'three';
import { OBJLoader } from 'three/examples/jsm/loaders/OBJLoader.js';

// 创建一个全局的loader实例和缓存
const objLoader = new OBJLoader();
let conv2dModel: THREE.Group | null = null;
let isModelLoading = false;
let modelLoadCallbacks: Array<(model: THREE.Group) => void> = [];

/**
 * 异步加载Conv2d模型
 * @returns Promise<THREE.Group> 返回一个包含3D模型的Group对象
 */
async function loadConv2dModel(): Promise<THREE.Group> {
  return new Promise((resolve, reject) => {
    // 如果模型已经加载完成，直接返回
    if (conv2dModel) {
      resolve(conv2dModel);
      return;
    }

    // 如果正在加载中，将回调加入队列
    if (isModelLoading) {
      modelLoadCallbacks.push(resolve);
      return;
    }

    // 开始加载模型
    isModelLoading = true;
    modelLoadCallbacks.push(resolve);

    objLoader.load(
      '/src/models/mesh/model_box.obj',
      (object) => {
        // 计算模型的包围盒
        const box = new THREE.Box3().setFromObject(object);
        
        // 获得模型尺寸
        const modelSize = new THREE.Vector3();
        box.getSize(modelSize);
        
        // 获得模型中心点
        const center = new THREE.Vector3();
        box.getCenter(center);

        // 将模型中心移到原点
        object.position.sub(center);

        // 根据模型原始尺寸进行标准化缩放
        /* const maxDimension = Math.max(modelSize.x, modelSize.y, modelSize.z);
        if (maxDimension > 0) {
          const scale = 1 / maxDimension;
          object.scale.set(scale, scale, scale);
        } */

        conv2dModel = object;
        isModelLoading = false;
        
        // 执行所有回调
        modelLoadCallbacks.forEach(callback => callback(object));
        modelLoadCallbacks = [];
      },
      undefined,
      (error) => {
        isModelLoading = false;
        modelLoadCallbacks = [];
        console.error('Error loading Conv2d model:', error);
        reject(error);
      }
    );
  });
}

/**
 * 根据层类型创建对应的几何体
 * @param layerType 神经网络层的类型，例如 'Conv2d', 'Linear' 等
 * @param size 几何体的尺寸对象，包含宽度、高度和深度
 * @param size.width 几何体的宽度，默认为100
 * @param size.height 几何体的高度，默认为60
 * @param size.depth 几何体的深度，默认为20
 * @returns 返回对应类型的 THREE.BufferGeometry 或 Promise<THREE.BufferGeometry>
 */
export function createLayerGeometry(
  layerType: string, 
  size = { width: 100, height: 60, depth: 20 }
): THREE.BufferGeometry | Promise<THREE.BufferGeometry> {
  const { width, height, depth } = size;
  
  switch (layerType) {
    case 'ResNet':
      return new THREE.BoxGeometry(width * 1.5, height * 1.5, depth * 1.5);
      
    case 'Conv2d':
      // 尝试加载自定义OBJ模型
      return loadConv2dModel().then(model => {
        // 克隆模型并调整大小
        const clonedModel = model.clone();
        
        // 调整模型大小以适配指定尺寸    
        const bbox = new THREE.Box3().setFromObject(clonedModel);
        const modelSize = bbox.getSize(new THREE.Vector3());
        
        // 计算缩放因子以适配指定尺寸
        if (modelSize.x > 0 && modelSize.y > 0 && modelSize.z > 0) {
          const scaleX = width / modelSize.x;
          const scaleY = height / modelSize.y;
          const scaleZ = depth / modelSize.z;
          clonedModel.scale.set(scaleX, scaleY, scaleZ);
        }
        
        // 实际上我们会使用模型对象而不是几何体
        const geometry = new THREE.BufferGeometry();
        (geometry as any).isObject3D = true;
        (geometry as any).model = clonedModel;
        return geometry;
      }).catch(() => {
        // 如果加载失败，回退到圆柱体
        return new THREE.CylinderGeometry(width/2, width/2, height, 32);
      });
      
    case 'BatchNorm2d':
      return new THREE.CylinderGeometry(width/3, width/2, height, 32);
      
    case 'ReLU':
      return new THREE.ConeGeometry(width/2, height, 32);
      
    case 'MaxPool2d':
      return new THREE.OctahedronGeometry(width/2);
      
    case 'Sequential': {
      const geometry = new THREE.BoxGeometry(width * 1.2, height * 1.2, depth * 1.2);
      (geometry as THREE.BufferGeometry & {type: string}).type = 'SequentialGeometry'; // 扩展类型
      return geometry;
    }
      
    case 'BasicBlock':
      return new THREE.BoxGeometry(width, height, depth, 4, 4, 4);
      
    case 'Linear':
      return new THREE.SphereGeometry(width/2, 32, 32);
      
    case 'Identity':
      return new THREE.TetrahedronGeometry(width/2);
      
    default:
      return new THREE.BoxGeometry(width, height, depth);
  }



}
/**
 * 根据层类型创建对应的材质
 * @param layerType 神经网络层的类型，例如 'Conv2d', 'Linear' 等
 * @returns 返回对应类型的 THREE.Material 材质对象
 */
export function createLayerMaterial(layerType: string): THREE.Material {
  const baseOptions = {
    transparent: true,
    opacity: 0.9,
    shininess: 100
  };
  
  const colorMap: Record<string, number> = {
    'ResNet': 0x2196F3,
    'Conv2d': 0x42A5F5,
    'BatchNorm2d': 0x66BB6A,
    'ReLU': 0xFFCA28,
    'MaxPool2d': 0x26A69A,
    'Sequential': 0xEC407A,
    'BasicBlock': 0xAB47BC,
    'Linear': 0xFF7043,
    'Identity': 0x8D6E63
  };
  
  const color = colorMap[layerType] || 0x90A4AE;
  
  if (layerType === 'Sequential') {
    return new THREE.MeshBasicMaterial({
      color,
      wireframe: true,
      // linewidth: 2
    });
  }
  
  return new THREE.MeshPhongMaterial({
    ...baseOptions,
    color
  });
}