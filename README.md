**# Claude API 线路测速浏览器插件

用于快速对多个第三方 Claude API 线路进行首字节和总耗时对比的 Chrome 扩展。通过弹窗一键测速，支持自定义线路地址、认证头、并发与提示词配置，并将结果用流式响应解析出来。
<img width="2772" height="1774" alt="image" src="https://github.com/user-attachments/assets/7e7f07d3-4e27-47d7-951c-f911441bd075" />

## 功能特点
- 多线路对比：为每条线路配置 URL、描述、是否启用及独立认证头
- 指标采集：记录首字节时间、总耗时、失败次数与最近一次错误
- 流式解析：按 Anthropic SSE 协议解析 `content_block_delta`/`message_delta` 文本片段
- 可调参数：模型 ID、max_tokens、请求超时、单线路次数、两次间隔、并发数量
- 中英双语弹窗 UI；默认提供 4 条示例线路

## 目录速览
- `public/manifest.json`：MV3 配置，声明 `background.js`、弹窗与选项页
- `public/background.js`：服务工作线程，发送跨域请求、测量耗时并解析流式结果
- `src/popup`：弹窗测速界面与逻辑（`App.tsx`）
- `src/options`：配置页，管理全局参数与线路列表（`App.tsx`）
- `src/lib`：存储、工具方法与扩展消息封装
- `src/types/config.ts`：配置与默认线路定义

## 快速开始
1) 安装依赖  
```bash
npm install
```

2) 开发预览  
```bash
npm run dev
```  
用于 UI 调试（需在浏览器环境下才能真正测速）。

3) 构建产物  
```bash
npm run build
```  
打包后生成 `dist/`，其中包含 `manifest.json`、弹窗与选项页静态文件、background 脚本。

4) 加载扩展  
在 Chrome 中打开「扩展程序」→ 打开「开发者模式」→「加载已解压的扩展程序」，选择 `dist/` 目录即可。

## 使用指南
- 配置线路  
  - 点击弹窗右上角齿轮或在扩展管理页打开选项页  
  - 设置全局 API Key（建议带上 `Bearer ` 前缀），或为单条线路填写认证头覆盖全局  
  - 选择模型 ID、max_tokens、提示词、超时、单线路次数、两次间隔、并发（跨线路与单线路）  
  - 新增/启用/停用线路，保存配置会写入 `chrome.storage.local`

- 开始测速  
  - 在弹窗选择模型后点击「开始」  
  - 扩展按限制的并发数依次请求启用的线路；每条线路可并行跑多次  
  - 结果区展示每条线路的平均首字节、平均总耗时、失败次数、进度与最近一条文本样本

- 结果与错误  
  - 若接口无流式文本或返回为空，视为失败并记录最近错误信息  
  - 遇到超时会返回 `Timeout`，可在配置页提高超时或减少并发/次数

## 开发说明
- 技术栈：React 18、TypeScript、Vite、TailwindCSS、Lucide 图标、ECharts（已封装柱状图组件）
- 发送请求与测速逻辑在 `public/background.js` 中实现，通过 `chrome.runtime.sendMessage` 与前端通信
- 配置读取/写入逻辑见 `src/lib/storage.ts`，非扩展环境下退回 `localStorage` 方便本地调试
- 由于开启了 `host_permissions: ["https://*/*"]`，可直接测速任意 HTTPS 端点，注意遵循密钥与数据安全规范

## 可能遇到的问题
- 弹窗中提示缺少线路或 Token：需在选项页开启至少一条线路，并填写全局或线路认证头
- 返回内容为空：检查目标接口是否支持 SSE 流式返回或是否正确设置 `anthropic-version` 与认证头
- 需要重新打包：修改代码后运行 `npm run build` 并重新加载 `dist/` 目录
**
