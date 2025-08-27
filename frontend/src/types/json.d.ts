declare module '*.json' {
  const value: unknown;
  export default value;
}

declare module '@/assets/model-config.json' {
  interface ModelConfig {
    models: Record<string, string>;
    defaultModelsPath: string;
  }
  const modelConfig: ModelConfig;
  export default modelConfig;
}

declare module '*.glb' {
  const value: string;
  export default value;
}

declare module '*?url' {
  const value: string;
  export default value;
}