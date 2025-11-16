import React from 'react';

/**
 * 简单的配置可视化组件
 *
 * 用途：
 * - 在开发阶段快速查看前端当前使用的后端地址配置
 * - 帮助确认 .env / 默认值 是否生效
 *
 * 使用方法（示例）：
 *   import { ConfigDebug } from '@/debug/ConfigDebug';
 *   // 在某个页面或临时路由里渲染：
 *   <ConfigDebug />
 */
export const ConfigDebug: React.FC = () => {
  // 来自 Vite 环境变量
  const viteApiUrl = import.meta.env.VITE_API_URL;
  const viteApiBaseUrl = import.meta.env.VITE_API_BASE_URL;

  // 实际在代码中使用的最终值（带默认）
  const resolvedApiUrl = viteApiUrl || 'http://localhost:8000';
  const resolvedApiBaseUrl = viteApiBaseUrl || 'http://localhost:8000/api/v1';

  return (
    <div style={{ padding: '1.5rem', fontFamily: 'system-ui, sans-serif' }}>
      <h2 style={{ fontSize: '1.25rem', fontWeight: 600, marginBottom: '1rem' }}>
        前端配置调试（Config Debug）
      </h2>

      <div style={{ marginBottom: '1rem' }}>
        <h3 style={{ fontWeight: 600, marginBottom: '0.5rem' }}>环境变量（原始值）</h3>
        <pre
          style={{
            background: '#f5f5f5',
            padding: '0.75rem',
            borderRadius: '0.5rem',
            overflowX: 'auto',
            fontSize: '0.9rem',
          }}
        >
{`VITE_API_URL       = ${viteApiUrl ?? '(未设置)'}
VITE_API_BASE_URL = ${viteApiBaseUrl ?? '(未设置)'}`}
        </pre>
      </div>

      <div>
        <h3 style={{ fontWeight: 600, marginBottom: '0.5rem' }}>代码中的最终生效值</h3>
        <pre
          style={{
            background: '#f5f5f5',
            padding: '0.75rem',
            borderRadius: '0.5rem',
            overflowX: 'auto',
            fontSize: '0.9rem',
          }}
        >
{`API_URL         (userStore) = ${resolvedApiUrl}
API_BASE_URL (apiClient) = ${resolvedApiBaseUrl}`}
        </pre>

        <p style={{ marginTop: '0.75rem', fontSize: '0.85rem', color: '#666' }}>
          提示：如果你修改了 <code>.env</code> / <code>.env.local</code>，需要重启 <code>npm run dev</code> 才会生效。
        </p>
      </div>
    </div>
  );
};


