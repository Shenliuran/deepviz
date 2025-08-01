// shapeFactory.ts
import * as THREE from 'three';

export function createLayerGeometry(
  layerType: string, 
  size = { width: 100, height: 60, depth: 20 }
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
      
    case 'Sequential':
      const geometry = new THREE.BoxGeometry(width * 1.2, height * 1.2, depth * 1.2);
      (geometry as any).type = 'SequentialGeometry'; // 扩展类型
      return geometry;
      
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