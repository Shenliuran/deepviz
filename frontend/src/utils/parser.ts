// parser.ts
import type { Layer, NodeInfo, RawLayerData, LayerType } from '../types/neural-network';

// 递归生成节点信息，包含位置和层级关系
export function parseNetwork(layer: Layer, parentId?: string, depth = 0, siblingIndex = 0, parent?: Layer): NodeInfo[] {
  const nodeId = parentId ? `${parentId}-${layer.name}` : layer.name;
  const nodes: NodeInfo[] = [];
  
  // 计算位置（可以根据需要调整布局算法）
  const x = depth * 300;
  const y = siblingIndex * 150 - (siblingCount(parent) * 75);
  const z = 0;
  
  // 添加当前节点
  nodes.push({
    id: nodeId,
    x,
    y,
    z,
    node: layer,
    parentId
  });
  
  // 递归处理子节点
  if (layer.children) {
    layer.children.forEach((child, index) => {
      const childNodes = parseNetwork(child, nodeId, depth + 1, index, layer);
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
export function convertRawLayer(rawLayer: RawLayerData): Layer {
  const layer: Layer = {
    name: rawLayer.layer_name,
    type: rawLayer.layer_type as LayerType,
    params: rawLayer.parameters,
    attributes: rawLayer.attributes,
    is_residual_block: rawLayer.is_residual_block,
    residual_connection: rawLayer.residual_connection
  };

  // 递归处理子节点
  if (rawLayer.children && rawLayer.children.length > 0) {
    layer.children = rawLayer.children.map(convertRawLayer);
  }

  return layer;
}