import * as THREE from 'three';
import type { NodeInfo, Layer, RawLayerData } from '../types/neural-network';
import type { ShapeFactory } from '../models/shapeFactory';
import type { NetworkParser } from '../utils/parser';

/**
 * 神经网络可视化类
 */
export class NetworkVisualizer {
  private _scene: THREE.Scene;
  private _nodes: THREE.Mesh[] = [];
  private _lines: (THREE.Line | THREE.ArrowHelper)[] = [];

  constructor(scene: THREE.Scene) {
    this._scene = scene;
  }

  /**
   * 创建神经网络可视化
   * @param networkData 网络数据
   * @param layerCreator 层创建器对象
   * @param networkParser 网络解析器对象
   */
  public async createGraph(
    networkData: RawLayerData,
    layerCreator: ShapeFactory,
    networkParser: NetworkParser
  ) {
    try {
      if (!this._scene) {
        console.error('Scene not initialized');
        return;
      }

      // 解析网络数据
      const rawData = networkData;
      if (!rawData) {
        console.error('Network data is missing');
        return;
      }

      const convertedData = networkParser.convertRawLayer(rawData);
      const networkDataParsed = networkParser.parseNetwork(convertedData);

      // 创建节点
      this.createNodes(
        networkDataParsed, 
        layerCreator.createLayerGeometry.bind(layerCreator), 
        layerCreator.createLayerMaterial.bind(layerCreator)
      );

      // 创建连接线
      this.createConnections(
        convertedData, 
        networkDataParsed, 
        networkParser.buildNetworkConnections.bind(networkParser), 
        this.createEdge.bind(this)
      );
      
      return networkDataParsed;
    } catch (error) {
      console.error('Error creating visualization:', error);
    }
  }

  /**
   * 创建神经网络层之间的连接线
   * @param lines 线条数组，用于存储创建的线条对象
   * @param start 起始点坐标 {x, y, z}
   * @param end 终止点坐标 {x, y, z}
   * @param color 连接线的颜色
   * @param isResidual 是否为残差连接
   * @returns 无返回值
   */
  private createEdge(
    lines: (THREE.Line | THREE.ArrowHelper)[],
    start: { x: number, y: number, z: number },
    end: { x: number, y: number, z: number },
    color: number,
    isResidual: boolean
  ) {
    const startPoint = new THREE.Vector3(start.x, start.y, start.z);
    const endPoint = new THREE.Vector3(end.x, end.y, end.z);

    // 如果是残差连接，使用曲线箭头
    if (isResidual) {
      // 计算中间点并偏移（形成 L 形）
      const midX = (startPoint.x + endPoint.x) / 2;
      const midY = (startPoint.y + endPoint.y) / 2;
      const midZ = (startPoint.z + endPoint.z) / 2;

      // 偏移量，避免与普通连接重叠
      const offsetX = 60; // 水平偏移

      // 创建三个点：起点 -> 中间偏移点 -> 终点
      const points = [
        startPoint,
        new THREE.Vector3(midX + offsetX, midY, midZ),
        endPoint
      ];

      // 使用 Catmull-Rom 曲线（需要至少 3 个点）
      const curve = new THREE.CatmullRomCurve3(points);
      curve.curveType = 'catmullrom';
      curve.tension = 0.5;

      // 采样曲线上的点
      const geometry = new THREE.BufferGeometry();
      const positions = [];
      const sampleCount = 50;

      for (let i = 0; i < sampleCount; i++) {
        const point = curve.getPoint(i / (sampleCount - 1));
        positions.push(point.x, point.y, point.z);
      }

      geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
      const material = new THREE.LineBasicMaterial({ color });
      const line = new THREE.Line(geometry, material);

      this._scene.add(line);
      lines.push(line);
      
      // 为曲线末端添加箭头指示方向
      // 获取曲线末端的两个点以计算方向
      const pointBeforeEnd = curve.getPoint((sampleCount - 2) / (sampleCount - 1));
      const pointEnd = curve.getPoint(1);
      
      // 计算末端方向向量
      const direction = new THREE.Vector3()
        .subVectors(pointEnd, pointBeforeEnd)
        .normalize();
      
      // 在曲线末端添加一个小箭头
      const arrowSize = 20;
      const arrowHelper = new THREE.ArrowHelper(
        direction,
        pointEnd,
        arrowSize,
        color,
        arrowSize * 0.4,
        arrowSize * 0.4
      );
      
      this._scene.add(arrowHelper);
      lines.push(arrowHelper);
    } else {
      // 普通连接：使用直线箭头
      const direction = new THREE.Vector3().subVectors(endPoint, startPoint).normalize();
      const length = startPoint.distanceTo(endPoint);
      // 箭头头部大小限制在合理范围内
      const headLength = Math.min(length * 0.4, 40);
      const headWidth = Math.min(length * 0.4, 40);

      const arrow = new THREE.ArrowHelper(
        direction,
        startPoint,
        length,
        color,
        headLength,
        headWidth
      );

      this._scene.add(arrow);
      lines.push(arrow);
    }
  }

  /**
   * 添加节点标签
   * @param mesh 网格对象
   * @param name 节点名称
   * @param type 节点类型
   * @param id 节点ID
   */
  private addLabel(
    mesh: THREE.Mesh,
    name: string,
    type: string,
    id: string
  ) {
    // 创建canvas元素用于绘制文本
    const canvas = document.createElement('canvas');
    const context = canvas.getContext('2d');
    if (!context) return;
    
    // 设置canvas大小和样式
    canvas.width = 256;
    canvas.height = 128;
    context.fillStyle = '#ffffff';
    context.fillRect(0, 0, canvas.width, canvas.height);
    context.font = '16px Arial';
    context.fillStyle = '#000000';
    context.textAlign = 'center';
    context.textBaseline = 'middle';
    
    // 绘制文本
    context.fillText(name, canvas.width / 2, canvas.height / 3);
    // context.fillText(type, canvas.width / 2, 2 * canvas.height / 3);
    context.fillText(id, canvas.width / 2, 2 * canvas.height / 3);
    
    // 创建纹理
    const texture = new THREE.CanvasTexture(canvas);
    
    // 创建精灵材质
    const material = new THREE.SpriteMaterial({ 
      map: texture,
      transparent: true 
    });
    
    // 创建精灵并设置位置
    const sprite = new THREE.Sprite(material);
    sprite.position.set(
      mesh.position.x + 80,
      mesh.position.y,  // 在节点上方显示
      mesh.position.z
    );
    
    // 设置精灵大小
    sprite.scale.set(100, 50, 1);
    
    // 将精灵添加到场景
    this._scene.add(sprite);
  }

  /**
   * 创建节点
   * @param nodesData 节点数据
   * @param createLayerGeometry 几何体创建函数
   * @param createLayerMaterial 材质创建函数
   */
  private async createNodes(
    nodesData: NodeInfo[],
    createLayerGeometry: (layerType: string) => THREE.BufferGeometry | Promise<THREE.BufferGeometry>,
    createLayerMaterial: (layerType: string) => THREE.Material
  ) {
    for (const nodeInfo of nodesData) { 
      const geometry = await createLayerGeometry(nodeInfo.node.type);
      const material = createLayerMaterial(nodeInfo.node.type);
      let mesh: THREE.Mesh | THREE.Group;
      
      // 检查是否是自定义OBJ模型
      if ('isObject3D' in geometry && (geometry as any).isObject3D && (geometry as any).model) {
        // 对于自定义OBJ模型，直接使用模型对象
        mesh = (geometry as any).model;
        mesh.userData = {
          id: nodeInfo.id,
          type: nodeInfo.node.type,
          layer: nodeInfo.node
        };
      } else {
        // 对于普通几何体，创建Mesh对象
        mesh = new THREE.Mesh(geometry, material);
        mesh.userData.id = nodeInfo.id;
        mesh.userData.type = nodeInfo.node.type;
        mesh.userData.layer = nodeInfo.node;
      }
      
      // 设置位置
      mesh.position.set(nodeInfo.x, nodeInfo.y, nodeInfo.z);

      // 调整某些形状的旋转
      if (['Conv2d', 'BatchNorm2d', 'ReLU'].includes(nodeInfo.node.type)) {
        mesh.rotation.z = Math.PI / 2;
      }
      
      this._scene.add(mesh);
      this._nodes.push(mesh as THREE.Mesh);
      
      // 添加标签
      this.addLabel(mesh as THREE.Mesh, nodeInfo.node.name, nodeInfo.node.type, nodeInfo.node.id);
    }
  }

  /**
   * 创建连接
   * @param rootLayer 根层
   * @param networkDataParsed 网络数据
   * @param buildNetworkConnections 网络连接构建函数
   * @param createEdge 边缘创建函数
   */
  private createConnections(
    rootLayer: Layer,
    networkDataParsed: NodeInfo[],
    buildNetworkConnections: (rootLayer: Layer) => Array<{source: string, target: string, isResidual?: boolean}>,
    createEdge: (
      lines: (THREE.Line | THREE.ArrowHelper)[],
      start: { x: number, y: number, z: number },
      end: { x: number, y: number, z: number },
      color: number,
      isResidual: boolean
    ) => void
  ) {
    // 构建连接关系
    const connections = buildNetworkConnections(rootLayer);
    console.log('Network connections:', connections);
    
    // 创建节点映射以便查找
    const nodeMap = new Map<string, NodeInfo>();
    networkDataParsed.forEach(node => nodeMap.set(node.id, node));
    
    // 创建连接线
    connections.forEach(conn => {
      const sourceNode = nodeMap.get(conn.source);
      const targetNode = nodeMap.get(conn.target);
      
      if (sourceNode && targetNode) {
        createEdge(
          this._lines,
          { x: sourceNode.x, y: sourceNode.y, z: sourceNode.z },
          { x: targetNode.x, y: targetNode.y, z: targetNode.z },
          conn.isResidual ? 0xff0000 : 0x999999, // 残差连接使用红色，普通连接使用灰色
          conn?.isResidual ?? false, // 是否残差连接
        );
      } else {
        console.warn('Could not find nodes for connection:', conn);
      }
    });
  }

  /**
   * 清除所有可视化元素
   */
  public clear() {
    // 清除节点
    this._nodes.forEach(node => {
      this._scene.remove(node);
      if (node.geometry) {
        node.geometry.dispose();
      }
      if (node.material) {
        if (Array.isArray(node.material)) {
          node.material.forEach(material => material.dispose());
        } else {
          node.material.dispose();
        }
      }
    });
    this._nodes = [];

    // 清除线条
    this._lines.forEach(line => {
      this._scene.remove(line);
      if (line instanceof THREE.Line && line.geometry) {
        line.geometry.dispose();
      }
      if (line instanceof THREE.Line && line.material) {
        if (Array.isArray(line.material)) {
          line.material.forEach(material => material.dispose());
        } else {
          line.material.dispose();
        }
      }
      if (line instanceof THREE.ArrowHelper) {
        line.dispose();
      }
    });
    this._lines = [];
  }

  /**
   * 获取节点列表
   */
  public get nodes(): THREE.Mesh[] {
    return this._nodes;
  }

  /**
   * 获取线条列表
   */
  public get lines(): (THREE.Line | THREE.ArrowHelper)[] {
    return this._lines;
  }
}