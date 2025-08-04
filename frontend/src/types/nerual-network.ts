export type LayerType = 'Conv2d' | 'BatchNorm2d' | 'ReLU' | 'MaxPool2d' | 'Identity'

export interface Layer {
  name: string;           // 层名称（自定义）
  type: LayerType;        // 层类型（由框架定义）
  is_residual_block?: Boolean;
  params?: Record<string, any>;
  attributes?: Record<string, any>;
  children?: Array<Layer>
  residual_connection?: ResidualConnection
}

export interface NeuralNetworkModel {
  name: string;           // 模型名称
}

// types.ts
export interface ResidualConnection {
  input_source: string;
  fusion_type: string;
  adjust_layer: any | null; // 可以根据实际情况细化类型
}

export interface NodeInfo {
  id: string;
  x: number;
  y: number;
  z: number;
  node: Layer;
  parentId?: string;
}

export interface LayerTypeInfo {
  shape: string;
  color: number;
}


// 添加原始数据接口
export interface RawLayerData {
  layer_name: string;
  layer_type: string;
  parameters?: Record<string, any>;
  attributes?: Record<string, any>;
  children?: RawLayerData[];
  is_residual_block?: boolean;
  residual_connection?: ResidualConnection;
}
