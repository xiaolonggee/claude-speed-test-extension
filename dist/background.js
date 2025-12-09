// Background Service Worker
// 处理跨域请求和消息传递

chrome.runtime.onInstalled.addListener(() => {
  console.log('Claude API 测速工具已安装');
  
  // 初始化默认配置
  chrome.storage.local.get('config', (result) => {
    if (!result.config) {
      const defaultConfig = {
        apiKey: '',
        timeout: 30,
        testCount: 10,
        delayBetweenTests: 0.2,
        model: 'claude-3-5-haiku-20241022',
        maxTokens: 1024,
        content: 'Hello',
        maxConcurrentRoutes: 5,
        maxConcurrentPerRoute: 10,
        routes: [
          {
            id: 'main',
            name: '主线路',
            url: 'https://anyrouter.top/v1/messages',
            description: 'Main',
            enabled: true
          },
          {
            id: 'cdn-1',
            name: 'CDN线路1',
            url: 'https://pmpjfbhq.cn-nb1.rainapp.top/v1/messages',
            description: 'CDN 入口 1',
            enabled: true
          },
          {
            id: 'cdn-2',
            name: 'CDN线路2',
            url: 'https://a-ocnfniawgw.cn-shanghai.fcapp.run/v1/message',
            description: 'CDN 入口 2',
            enabled: true
          },
          {
            id: 'cdn-3',
            name: 'CDN线路3',
            url: 'https://c.cspok.cn/v1/message',
            description: 'CDN 入口 3',
            enabled: true
          }
        ]
      };
      chrome.storage.local.set({ config: defaultConfig });
    }
  });
});

// 监听来自 popup 的消息
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.type === 'TEST_REQUEST') {
    // 执行 API 测试请求
    performTest(request.payload)
      .then(result => sendResponse({ success: true, data: result }))
      .catch(error => sendResponse({ success: false, error: error.message }));
    return true; // 保持消息通道开放
  }
});

// 执行单个测试请求
async function performTest({ url, payload, token, timeout }) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeout * 1000);
  
  const startTime = performance.now();
  let firstByteTime = null;
  let firstChunkText = '';
  let fullText = '';
  const decoder = new TextDecoder();
  let buffer = '';
  let rawText = '';
  
  try {
    const tokenHeader = (token || '').trim();
    const headers = {
      'Content-Type': 'application/json',
      'anthropic-version': '2023-06-01',
      ...(tokenHeader ? { 'Authorization': tokenHeader } : {})
    };

    const response = await fetch(url, {
      method: 'POST',
      headers,
      body: JSON.stringify(payload),
      signal: controller.signal
    });
    
    clearTimeout(timeoutId);
    
    if (!response.ok) {
      let detail = '';
      try {
        const text = await response.text();
        rawText += text;
        const parsed = JSON.parse(text || '{}');
        detail = parsed?.error?.message || parsed?.message || text || '';
      } catch (e) {
        detail = '';
      }
      return {
        success: false,
        error: detail || `HTTP ${response.status}`,
        totalTime: 0,
        firstByteTime: 0,
        firstChunkText: '',
        fullText: rawText.trim()
      };
    }
    
    // 读取流式响应获取首字节时间
    const reader = response.body.getReader();
    const { value, done } = await reader.read();
    
    if (done || !value || value.length === 0) {
      return {
        success: false,
        error: 'No response data',
        totalTime: 0,
        firstByteTime: 0,
        firstChunkText: ''
      };
    }
    
    firstByteTime = performance.now();
    const decodedFirst = decoder.decode(value, { stream: true });
    firstChunkText = decodedFirst;
    buffer += decodedFirst;
    rawText += decodedFirst;
    
    // 解析首块
    buffer = processStreamBuffer(buffer, (text) => {
      fullText += text;
    });
    
    // 消费剩余数据
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      if (value && value.length > 0) {
        const chunkText = decoder.decode(value, { stream: true });
        buffer += chunkText;
        rawText += chunkText;
        buffer = processStreamBuffer(buffer, (text) => {
          fullText += text;
        });
      }
    }
    
    // 处理残留
    if (buffer.trim().length > 0) {
      processStreamBuffer(buffer, (text) => {
        fullText += text;
      });
    }
    
    // 如果没解析出 SSE 文本，退化使用原始文本
    if (!fullText.trim() && rawText.trim()) {
      fullText = rawText.trim();
    }
    
    const totalTime = performance.now() - startTime;
    const firstByteDuration = firstByteTime ? firstByteTime - startTime : totalTime;

    // 未能解析出文本则视为失败
    if (!fullText.trim()) {
      return {
        success: false,
        error: 'No text content',
        totalTime: totalTime,
        firstByteTime: firstByteDuration,
        firstChunkText,
        fullText: ''
      };
    }
    
    return {
      success: true,
      totalTime: totalTime,
      firstByteTime: firstByteDuration,
      error: '',
      firstChunkText,
      fullText
    };
    
  } catch (error) {
    clearTimeout(timeoutId);
    
    if (error.name === 'AbortError') {
      return {
        success: false,
        error: 'Timeout',
        totalTime: 0,
        firstByteTime: 0
      };
    }
    
    return {
      success: false,
      error: error.message || 'Unknown error',
      totalTime: 0,
      firstByteTime: 0
    };
  }
}

// 解析 Anthropics 流式 SSE，每行以 data: 开头，提取 content_block_delta 里的 text
function processStreamBuffer(buffer, onText) {
  const lines = buffer.split('\n');
  let remainder = '';

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    const isLast = i === lines.length - 1;

    if (!line.startsWith('data:')) {
      if (isLast) remainder = line;
      continue;
    }

    const payload = line.replace(/^data:\s*/, '');
    if (payload === '[DONE]') continue;

    try {
      const obj = JSON.parse(payload);
      if (obj?.type === 'content_block_delta' && obj?.delta?.text) {
        onText(obj.delta.text);
      } else if (obj?.type === 'message_delta' && obj?.delta?.text) {
        onText(obj.delta.text);
      }
    } catch (err) {
      // 解析失败通常是因为分片不完整，保留余量等待下次拼接
      remainder = lines.slice(i).join('\n');
      break;
    }
  }

  return remainder;
}
