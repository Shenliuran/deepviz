import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import type * as THREE from 'three';

// 导入模型文件
import sceneConv2dUrl from '@/assets/mesh/conv2d.glb?url';

/**
 * 模型加载管理器
 * 负责加载和缓存3D模型
 */
export class ModelManager {
  private _loader = new GLTFLoader();
  
  // 模型缓存
  private _modelCache: Map<string, THREE.Group> = new Map();
  
  // 加载状态跟踪
  private _loadingStates: Map<string, {
    isLoading: boolean;
    callbacks: Array<(model: THREE.Group) => void>;
  }> = new Map();
  
  // 模型路径映射
  private _modelPathMap: Record<string, string> = {
    'Conv2d': sceneConv2dUrl
  };

  /**
   * 加载指定名称的模型
   * @param modelName 模型名称
   * @returns Promise<THREE.Group>
   */
  public loadModelByName(modelName: string): Promise<THREE.Group> {
    // 检查是否有预定义的模型路径
    const modelUrl = this._modelPathMap[modelName];
    if (modelUrl) {
      return this.loadModel(modelName, modelUrl);
    }
    
    // 如果没有预定义路径，抛出错误
    return Promise.reject(new Error(`Model "${modelName}" not found in model path map`));
  }

  /**
   * 通用模型加载方法
   * @param modelName 模型名称
   * @param modelUrl 模型URL
   * @returns Promise<THREE.Group>
   */
  private loadModel(modelName: string, modelUrl: string): Promise<THREE.Group> {
    return new Promise((resolve, reject) => {
      // 如果模型已经加载完成，直接返回
      if (this._modelCache.has(modelName)) {
        resolve(this._modelCache.get(modelName)!);
        return;
      }

      // 获取或初始化加载状态
      let loadingState = this._loadingStates.get(modelName);
      if (!loadingState) {
        loadingState = {
          isLoading: false,
          callbacks: []
        };
        this._loadingStates.set(modelName, loadingState);
      }

      // 如果正在加载中，将回调加入队列
      if (loadingState.isLoading) {
        loadingState.callbacks.push(resolve);
        return;
      }

      // 开始加载模型
      loadingState.isLoading = true;
      loadingState.callbacks.push(resolve);

      this._loader.load(
        modelUrl,
        (object) => {
          const model = object.scene;
          // 缓存模型
          this._modelCache.set(modelName, model);
          // 更新加载状态
          loadingState!.isLoading = false;
          
          // 执行所有回调
          loadingState!.callbacks.forEach(callback => callback(model));
          loadingState!.callbacks = [];
        },
        undefined,
        (error) => {
          // 更新加载状态
          loadingState!.isLoading = false;
          loadingState!.callbacks = [];
          console.error(`Error loading ${modelName} model:`, error);
          reject(error);
        }
      );
    });
  }

  /**
   * 获取已加载的模型
   * @param modelName 模型名称
   * @returns THREE.Group | undefined
   */
  public getModel(modelName: string): THREE.Group | undefined {
    return this._modelCache.get(modelName);
  }

  /**
   * 预加载模型
   * @param modelName 模型名称
   */
  public preloadModel(modelName: string): void {
    // 检查是否有预定义的模型路径
    const modelUrl = this._modelPathMap[modelName];
    if (!modelUrl) {
      console.warn(`Model "${modelName}" not found in model path map`);
      return;
    }
    
    if (!this._modelCache.has(modelName) && !this._loadingStates.has(modelName)) {
      this.loadModel(modelName, modelUrl).catch((error) => {
        console.warn(`Failed to preload model ${modelName}:`, error);
      });
    }
  }
  
  /**
   * 注册新的模型路径
   * @param modelName 模型名称
   * @param modelUrl 模型URL
   */
  public registerModelPath(modelName: string, modelUrl: string): void {
    this._modelPathMap[modelName] = modelUrl;
  }
  
  /**
   * 批量注册模型路径
   * @param modelMap 模型名称到URL的映射
   */
  public registerModelPaths(modelMap: Record<string, string>): void {
    Object.assign(this._modelPathMap, modelMap);
  }
}