// parser.ts
import type { Layer, NodeInfo, RawLayerData, LayerType } from '../types/neural-network';

const X_STEP = 200;
const Y_STEP = 200;
const Z_STEP = 200;
// 递归生成节点信息，包含位置和层级关系
export function parseNetwork(layer: Layer, depth = 0, siblingIndex = 0, parentNode?: NodeInfo): NodeInfo[] {
  const nodes: NodeInfo[] = [];
  
  // 计算位置（可以根据需要调整布局算法）
  let x: number;
  let y: number;
  let z: number;
  if (!parentNode) {
    x = 0; y = 0; z = 0;
  } else {
    const parentX = parentNode.x;
    const parentY = parentNode.y;
    const parentZ = parentNode.z;
    const stepMultiplier = siblingIndex + 1;
    switch ((depth - 1) % 4) {
      case 0:
        x = parentX + stepMultiplier * X_STEP,
        y = parentY;
        z = parentZ;
        break;
      case 1:
        x = parentX;
        y = parentY + stepMultiplier * Y_STEP;
        z = parentZ;
        break;
      case 2:
        x = parentX;
        y = parentY;
        z = parentZ + stepMultiplier * Z_STEP;
        break;
      default:
        x = parentX;
        y = parentY - stepMultiplier * Y_STEP;
        z = parentZ;
        break;
    }
  }
  const currentNodeInfo: NodeInfo = { id: layer.id, x, y, z, node: layer, parentId: parentNode?.parentId };
  // 添加当前节点
  nodes.push(currentNodeInfo);
  
  // 递归处理子节点
  if (layer.children) {
    layer.children.forEach((child, index) => {
      const childNodes = parseNetwork(child, depth + 1, index, currentNodeInfo);
      nodes.push(...childNodes);
    });
  }
  
  return nodes;
}

// 辅助函数：计算兄弟节点数量
function siblingCount(parent?: Layer): number {
  return parent?.children?.length || 0;
}


// 转换原始数据为 Layer 对象
export function convertRawLayer(rawLayer: RawLayerData, parentId?: string): Layer {
  const layer: Layer = {
    id: parentId ? `${parentId}-${rawLayer.layer_name}` : rawLayer.layer_name,
    name: rawLayer.layer_name,
    type: rawLayer.layer_type as LayerType,
    params: rawLayer.parameters,
    attributes: rawLayer.attributes,
    is_residual_block: rawLayer.is_residual_block,
    residual_connection: rawLayer.residual_connection
  };

  // 递归处理子节点
  if (rawLayer.children && rawLayer.children.length > 0) {
    layer.children = rawLayer.children.map(child => convertRawLayer(child, layer.id));
  }

  return layer;
}

// 构建网络连接关系
export function buildNetworkConnections(rootLayer: Layer): Array<{source: string, target: string, isResidual?: boolean}> {
  const connections: Array<{source: string, target: string, isResidual?: boolean}> = [];
  // 处理同级串联连接
  function processSequentialConnections(layers: Layer[], parentId: string = '') {
    // 同级层之间串联
    for (let i = 0; i < layers.length - 1; i++) {
      connections.push({ 
        source: layers[i].id, 
        target: layers[i+1].id 
      });
    }
    
    // 处理每个层的子层和残差连接
    layers.forEach(layer => {
      // 处理残差连接
      if (layer.is_residual_block && layer.residual_connection) {
        connections.push({ 
          source: parentId, 
          target: layer.id, 
          isResidual: true 
        });
      }
      
      // 递归处理子层
      if (layer.children && layer.children.length > 0) {
        processSequentialConnections(layer.children, layer.id);
        connections.push({ source: layer.id, target: layer.children[0].id })
      }
    });
  }
  
  // 从根层开始处理
  if (rootLayer.children) {
    connections.push({ source: rootLayer.id, target: rootLayer.children[0].id })
    processSequentialConnections(rootLayer.children, rootLayer.id);
  }
  
  return connections;
}