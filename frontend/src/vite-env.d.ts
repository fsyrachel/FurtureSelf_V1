/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_APP_ENV: string
  // TODO: 如有其他 Vite 环境变量，请在此补充类型声明
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}

