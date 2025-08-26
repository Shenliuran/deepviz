declare module '*.json' {
  const value: unknown;
  export default value;
}

declare module '*.glb' {
  const value: string;
  export default value;
}

declare module '*?url' {
  const value: string;
  export default value;
}