import * as THREE from 'three';

/**
 * 形状工厂类，用于创建神经网络层的几何体和材质
 */
export class ShapeFactory {
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
   * 创建层几何体
   * @param layerType 层类型
   * @param size 尺寸对象，包含宽度、高度和深度
   * @returns THREE.BufferGeometry 几何体
   */
  public createLayerGeometry(
    layerType: string, 
    size = this._size
  ): THREE.BufferGeometry {
    const { width, height, depth } = size;
    
    switch (layerType) {
      case 'ResNet':
        return new THREE.BoxGeometry(width * 1.5, height * 1.5, depth * 1.5);
        
      case 'Conv2d':
        return new THREE.CylinderGeometry(width/2, width/2, height, 32);
        
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