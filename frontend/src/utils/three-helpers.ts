import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

/**
 * 初始化 Three.js 环境
 * @param canvasContainer 画布容器
 * @param scene 场景对象
 * @returns 包含相机、渲染器和控制器的对象
 */
export function initThree(
  canvasContainer: HTMLDivElement,
  scene: THREE.Scene
) {
  // 设置场景背景
  scene.background = new THREE.Color(0xf8f9fa);

  // 创建相机
  const camera = new THREE.PerspectiveCamera(
    75,
    canvasContainer.clientWidth / canvasContainer.clientHeight,
    0.1,
    10000
  );
  camera.position.z = 1000;

  // 创建渲染器
  const renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setSize(
    canvasContainer.clientWidth,
    canvasContainer.clientHeight
  );
  canvasContainer.appendChild(renderer.domElement);

  // 添加控制器
  const controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;
  controls.dampingFactor = 0.05;
  controls.enablePan = true;
  controls.mouseButtons = {
    LEFT: THREE.MOUSE.ROTATE,
    MIDDLE: THREE.MOUSE.DOLLY,
    RIGHT: THREE.MOUSE.PAN
  };

  // 添加光源
  const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
  scene.add(ambientLight);

  const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
  directionalLight.position.set(100, 200, 300);
  scene.add(directionalLight);

  return { camera, renderer, controls };
}

/**
 * 处理窗口大小变化
 * @param canvasContainer 画布容器
 * @param camera 相机
 * @param renderer 渲染器
 */
export function handleResize(
  canvasContainer: HTMLDivElement,
  camera: THREE.PerspectiveCamera,
  renderer: THREE.WebGLRenderer
) {
  const width = canvasContainer.clientWidth;
  const height = canvasContainer.clientHeight;

  camera.aspect = width / height;
  camera.updateProjectionMatrix();
  renderer.setSize(width, height);
}