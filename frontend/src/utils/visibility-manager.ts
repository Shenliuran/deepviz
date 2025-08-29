import * as THREE from 'three';
import type { Layer, NodeInfo } from '../types/neural-network';
import type { NetworkVisualizer } from './network-visualization';

/**
 * 可见性管理器类
 * 负责管理网络可视化中节点、标签和连线的可见性
 */
export class VisibilityManager {
  /**
   * 切换子节点可见性
   * @param object 被点击的3D对象
   * @param networkVisualizer 网络可视化器实例
   * @param networkDataParsed 网络数据
   * @param scene Three.js场景
   */
  public static toggleChildrenVisibility(
    object: THREE.Object3D,
    networkVisualizer: NetworkVisualizer,
    networkDataParsed: NodeInfo[],
    scene: THREE.Scene
  ): void {
    const nodeId = object.userData.id;
    const nodeInfo = networkDataParsed.find(node => node.id === nodeId);
    
    if (!nodeInfo || !nodeInfo.node.children || nodeInfo.node.children.length === 0) {
      // 没有子节点，无需处理
      return;
    }
    
    // 获取所有子节点ID（包括嵌套的子节点）
    const getAllChildrenIds = (layer: Layer): string[] => {
      let ids: string[] = [];
      if (layer.children && layer.children.length > 0) {
        layer.children.forEach((child: Layer) => {
          ids.push(child.id);
          ids = ids.concat(getAllChildrenIds(child));
        });
      }
      return ids;
    };
    
    const allChildrenIds = getAllChildrenIds(nodeInfo.node);
    
    // 切换子节点可见性
    const nodes = networkVisualizer.nodes;
    const lines = networkVisualizer.lines;
    
    // 检查当前是否显示子节点（检查第一个子节点的可见性）
    const firstChild = nodes.find(node => node.userData.id !== undefined && allChildrenIds.includes(node.userData.id));
    const shouldShow = firstChild ? !firstChild.visible : true;
    
    // 更新节点可见性
    nodes.forEach(node => {
      if (node.userData.id !== undefined && allChildrenIds.includes(node.userData.id)) {
        node.visible = shouldShow;
      }
    });
    
    // 更新标签可见性
    scene.children.forEach(child => {
      if (child instanceof THREE.Sprite && child.userData && child.userData.parentId) {
        if (allChildrenIds.includes(child.userData.parentId)) {
          child.visible = shouldShow;
        }
      }
    });
    
    // 更新连线可见性
    lines.forEach(line => {
      // 检查线段是否连接到任何子节点
      const lineUserData = (line as any).userData;
      if (lineUserData && 
          (allChildrenIds.includes(lineUserData.sourceId) || 
          allChildrenIds.includes(lineUserData.targetId))) {
        line.visible = shouldShow;
      }
    });
  }

  /**
   * 隐藏所有子节点
   * @param nodes 网络节点数据
   * @param networkVisualizer 网络可视化器实例
   * @param scene Three.js场景
   */
  public static hideAllChildren(
    nodes: NodeInfo[],
    networkVisualizer: NetworkVisualizer,
    scene: THREE.Scene
  ): void {
    const rootNodeId = nodes[0]?.id;
    if (!rootNodeId) return;
    
    const visualizerNodes = networkVisualizer.nodes;
    
    // 隐藏除根节点外的所有节点
    visualizerNodes.forEach(node => {
      if (node.userData.id !== rootNodeId) {
        node.visible = false;
      }
    });
    
    // 隐藏除根节点外的所有标签
    scene.children.forEach(child => {
      if (child instanceof THREE.Sprite && 
          child.userData && 
          child.userData.parentId &&
          child.userData.parentId !== rootNodeId) {
        child.visible = false;
      }
    });
  }

  /**
   * 显示所有层
   * @param networkVisualizer 网络可视化器实例
   * @param scene Three.js场景
   */
  public static showAllLayers(
    networkVisualizer: NetworkVisualizer,
    scene: THREE.Scene
  ): void {
    const nodes = networkVisualizer.nodes;
    const lines = networkVisualizer.lines;
    
    // 显示所有节点
    nodes.forEach(node => {
      node.visible = true;
    });
    
    // 显示所有标签
    scene.children.forEach(child => {
      if (child instanceof THREE.Sprite) {
        child.visible = true;
      }
    });
    
    // 显示所有连线
    lines.forEach(line => {
      line.visible = true;
    });
  }
}