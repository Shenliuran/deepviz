import * as THREE from 'three';
import { OBJLoader } from 'three/examples/jsm/loaders/OBJLoader.js';

interface CustomBufferGeometry extends THREE.BufferGeometry {
  isObject3D?: boolean;
  model?: THREE.Group
}

/**
 * 形状工厂类，用于创建神经网络层的几何体和材质
 */
export class ShapeFactory {
  
  // 创建一个全局的loader实例和缓存
  private _objLoader = new OBJLoader();
  private _conv2dModel: THREE.Group | null = null;
  private _isModelLoading = false;
  private _modelLoadCallbacks: Array<(model: THREE.Group) => void> = [];


  // 默认尺寸配置
  private _size = { width: 100, height: 60, depth: 20 };
  
  // 颜色映射配置
  private _colorMap: Record<string, number> = {
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
  
  // 材质基础配置
  private _baseMaterialOptions = {
    transparent: true,
    opacity: 0.9,
    shininess: 100
  };

  /**
   * 设置默认尺寸
   * @param size 尺寸对象，包含宽度、高度和深度
   */
  public set size(size: { width: number; height: number; depth: number }) {
    this._size = { ...size };
  }

  /**
   * 获取默认尺寸
   * @returns 当前默认尺寸配置
   */
  public get size(): { width: number; height: number; depth: number } {
    return { ...this._size };
  }

  /**
   * 设置颜色映射
   * @param colorMap 颜色映射对象
   */
  public set colorMap(colorMap: Record<string, number>) {
    this._colorMap = { ...colorMap };
  }

  /**
   * 获取颜色映射
   * @returns 当前颜色映射配置
   */
  public get colorMap(): Record<string, number> {
    return { ...this._colorMap };
  }

  /**
   * 设置材质基础配置
   * @param options 材质基础配置选项
   */
  public set baseMaterialOptions(options: { transparent?: boolean; opacity?: number; shininess?: number }) {
    this._baseMaterialOptions = { ...this._baseMaterialOptions, ...options };
  }

  /**
   * 获取材质基础配置
   * @returns 当前材质基础配置
   */
  public get baseMaterialOptions(): { transparent: boolean; opacity: number; shininess: number } {
    return { ...this._baseMaterialOptions };
  }

  /**
   * 异步加载Conv2d模型
   * @returns Promise<THREE.Group> 返回一个包含3D模型的Group对象
   */
  private loadConv2dModel(): Promise<THREE.Group> {
    return new Promise((resolve, reject) => {
      // 如果模型已经加载完成，直接返回
      if (this._conv2dModel) {
        resolve(this._conv2dModel);
        return;
      }
  
      // 如果正在加载中，将回调加入队列
      if (this._isModelLoading) {
        this._modelLoadCallbacks.push(resolve);
        return;
      }
  
      // 开始加载模型
      this._isModelLoading = true;
      this._modelLoadCallbacks.push(resolve);
  
      this._objLoader.load(
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
  
          this._conv2dModel = object;
          this._isModelLoading = false;
          
          // 执行所有回调
          this._modelLoadCallbacks.forEach(callback => callback(object));
          this._modelLoadCallbacks = [];
        },
        undefined,
        (error) => {
          this._isModelLoading = false;
          this._modelLoadCallbacks = [];
          console.error('Error loading Conv2d model:', error);
          reject(error);
        }
      );
    });
  }
  /**
   * 创建层几何体
   * @param layerType 层类型
   * @param size 尺寸对象，包含宽度、高度和深度
   * @returns THREE.BufferGeometry 几何体
   */
  public createLayerGeometry(
    layerType: string, 
    size = this._size
  ): THREE.BufferGeometry | Promise<THREE.BufferGeometry> {
    const { width, height, depth } = size;
    
    switch (layerType) {
      case 'ResNet':
        return new THREE.BoxGeometry(width * 1.5, height * 1.5, depth * 1.5);
        
      case 'Conv2d':
        // 尝试加载自定义OBJ模型
        return this.loadConv2dModel().then(model => {
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
          const geometry = new THREE.BufferGeometry() as CustomBufferGeometry;
          geometry.isObject3D = true;
          geometry.model = clonedModel;
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
   * 创建层材质
   * @param layerType 层类型
   * @returns THREE.Material 材质
   */
  public createLayerMaterial(layerType: string): THREE.Material {
    const color = this._colorMap[layerType] || 0x90A4AE;
    
    if (layerType === 'Sequential') {
      return new THREE.MeshBasicMaterial({
        color,
        wireframe: true,
        // linewidth: 2
      });
    }
    
    return new THREE.MeshPhongMaterial({
      ...this._baseMaterialOptions,
      color
    });
  }
}