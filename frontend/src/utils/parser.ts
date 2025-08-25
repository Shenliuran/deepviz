import type { Layer, NodeInfo, RawLayerData, LayerType } from '../types/neural-network';

/**
 * 网络数据解析器类
 * 负责解析神经网络数据，构建节点信息和连接关系
 */
export class NetworkParser {
  private xStep: number = 200;
  private yStep: number = 200;
  private zStep: number = 200;

  /**
   * 设置步长参数
   * @param xStep X轴步长
   * @param yStep Y轴步长
   * @param zStep Z轴步长
   */
  public setSteps(xStep: number = 200, yStep: number = 200, zStep: number = 200): void {
    this.xStep = xStep;
    this.yStep = yStep;
    this.zStep = zStep;
  }

  /**
   * 获取当前步长参数
   * @returns 包含x、y、z步长的对象
   */
  public get steps(): { xStep: number; yStep: number; zStep: number } {
    return {
      xStep: this.xStep,
      yStep: this.yStep,
      zStep: this.zStep
    };
  }

  /**
   * 递归生成节点信息，包含位置和层级关系
   * @param layer 网络层
   * @param depth 深度
   * @param siblingIndex 兄弟节点索引
   * @param parentNode 父节点
   * @returns 节点信息数组
   */
  public parseNetwork(layer: Layer, depth = 0, siblingIndex = 0, parentNode?: NodeInfo): NodeInfo[] {
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
          x = parentX + stepMultiplier * this.xStep;
          y = parentY;
          z = parentZ;
          break;
        case 1:
          x = parentX;
          y = parentY + stepMultiplier * this.yStep;
          z = parentZ;
          break;
        case 2:
          x = parentX;
          y = parentY;
          z = parentZ + stepMultiplier * this.zStep;
          break;
        default:
          x = parentX;
          y = parentY - stepMultiplier * this.yStep;
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
        const childNodes = this.parseNetwork(child, depth + 1, index, currentNodeInfo);
        nodes.push(...childNodes);
      });
    }
    
    return nodes;
  }

  /**
   * 转换原始数据为 Layer 对象
   * @param rawLayer 原始层数据
   * @param parentId 父节点ID
   * @returns Layer对象
   */
  public convertRawLayer(rawLayer: RawLayerData, parentId?: string): Layer {
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
      layer.children = rawLayer.children.map(child => this.convertRawLayer(child, layer.id));
    }

    return layer;
  }

  /**
   * 构建网络连接关系
   * @param rootLayer 根层
   * @returns 连接关系数组
   */
  public buildNetworkConnections(rootLayer: Layer): Array<{source: string, target: string, isResidual?: boolean}> {
    const connections: Array<{source: string, target: string, isResidual?: boolean}> = [];
    // 处理同级串联连接
    const processSequentialConnections = (layers: Layer[], parentId: string = '') => {
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
          connections.push({ source: layer.id, target: layer.children[0].id });
        }
      });
    };
    
    // 从根层开始处理
    if (rootLayer.children) {
      connections.push({ source: rootLayer.id, target: rootLayer.children[0].id });
      processSequentialConnections(rootLayer.children, rootLayer.id);
    }
    
    return connections;
  }
}