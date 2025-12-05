import { AppConfig } from '@/types';
import { getConfig, onConfigChange } from '@/utils/storage';
import { initTranslator, startTranslation, stopTranslation, updateConfig } from '@/core/translator';
import { initTooltip, updateTooltipConfig, destroyTooltip } from '@/core/tooltip';

// 注入样式
function injectStyles(): void {
  const style = document.createElement('style');
  style.id = 'openimmerse-styles';
  style.textContent = `
    /* 翻译容器 */
    .openimmerse-container {
      margin: 8px 0;
      border-radius: 6px;
      overflow: hidden;
      box-shadow: 0 1px 3px rgba(0,0,0,0.1);
    }
    
    /* 双语对照模式 */
    .openimmerse-bilingual {
      display: flex;
      flex-direction: column;
      border-left: 3px solid #667eea;
      background: linear-gradient(135deg, #f8f9ff 0%, #f0f4ff 100%);
    }
    
    .openimmerse-original {
      padding: 10px 12px;
      font-size: 13px;
      color: #666;
      background: rgba(0,0,0,0.02);
      border-bottom: 1px dashed #e0e0e0;
      position: relative;
    }
    
    .openimmerse-original::before {
      content: '原文';
      position: absolute;
      top: 4px;
      right: 8px;
      font-size: 10px;
      color: #999;
      background: #fff;
      padding: 1px 6px;
      border-radius: 3px;
    }
    
    .openimmerse-translated {
      padding: 12px;
      font-size: 14px;
      line-height: 1.6;
      color: #333;
      position: relative;
    }
    
    .openimmerse-translated::before {
      content: '译文';
      position: absolute;
      top: 4px;
      right: 8px;
      font-size: 10px;
      color: #667eea;
      background: #fff;
      padding: 1px 6px;
      border-radius: 3px;
    }
    
    /* 仅译文模式 */
    .openimmerse-replace {
      padding: 12px;
      background: linear-gradient(135deg, #f8f9ff 0%, #f0f4ff 100%);
      border-left: 3px solid #667eea;
      font-size: 14px;
      line-height: 1.6;
      color: #333;
    }
    
    /* 骨架屏 */
    .openimmerse-placeholder {
      margin: 8px 0;
      padding: 12px;
      background: linear-gradient(135deg, #f8f9ff 0%, #f0f4ff 100%);
      border-left: 3px solid #667eea;
      border-radius: 4px;
    }
    
    .openimmerse-skeleton {
      display: flex;
      flex-direction: column;
      gap: 8px;
    }
    
    .openimmerse-skeleton-line {
      height: 14px;
      background: linear-gradient(90deg, #e0e0e0 25%, #f0f0f0 50%, #e0e0e0 75%);
      background-size: 200% 100%;
      animation: openimmerse-shimmer 1.5s infinite;
      border-radius: 4px;
    }
    
    .openimmerse-skeleton-line.short {
      width: 60%;
    }
    
    @keyframes openimmerse-shimmer {
      0% { background-position: 200% 0; }
      100% { background-position: -200% 0; }
    }
    
    /* 流式输出 */
    .openimmerse-translation {
      white-space: pre-wrap;
      word-break: break-word;
    }
    
    .openimmerse-cursor {
      display: inline-block;
      width: 2px;
      height: 1em;
      background: #667eea;
      animation: openimmerse-blink 0.8s infinite;
      vertical-align: text-bottom;
      margin-left: 2px;
    }
    
    @keyframes openimmerse-blink {
      50% { opacity: 0; }
    }
    
    /* 错误状态 */
    .openimmerse-error {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 12px;
      background: #fff5f5;
      border-left: 3px solid #e53935;
      color: #e53935;
      font-size: 13px;
      border-radius: 4px;
    }
    
    .openimmerse-error-icon {
      font-size: 16px;
    }
    
    /* 操作按钮 */
    .openimmerse-actions {
      display: flex;
      gap: 8px;
      padding: 8px 12px;
      background: rgba(0,0,0,0.02);
      border-top: 1px solid #eee;
    }
    
    .openimmerse-btn {
      padding: 4px 10px;
      font-size: 12px;
      border: none;
      border-radius: 4px;
      cursor: pointer;
      transition: all 0.2s;
    }
    
    .openimmerse-btn-copy {
      background: #667eea;
      color: white;
    }
    
    .openimmerse-btn-copy:hover {
      background: #5a6fd6;
    }
    
    .openimmerse-btn-retry {
      background: #f0f0f0;
      color: #666;
    }
    
    .openimmerse-btn-retry:hover {
      background: #e0e0e0;
    }
    
    /* 状态指示器 */
    .openimmerse-status {
      position: fixed;
      bottom: 20px;
      right: 20px;
      padding: 10px 16px;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
      border-radius: 20px;
      font-size: 13px;
      box-shadow: 0 4px 12px rgba(102, 126, 234, 0.4);
      z-index: 2147483646;
      display: flex;
      align-items: center;
      gap: 8px;
      transition: all 0.3s;
    }
    
    .openimmerse-status.hidden {
      opacity: 0;
      transform: translateY(20px);
      pointer-events: none;
    }
    
    .openimmerse-status-icon {
      width: 16px;
      height: 16px;
      border: 2px solid rgba(255,255,255,0.3);
      border-top-color: white;
      border-radius: 50%;
      animation: openimmerse-spin 0.8s linear infinite;
    }
    
    @keyframes openimmerse-spin {
      to { transform: rotate(360deg); }
    }
  `;
  
  document.head.appendChild(style);
}

// 消息处理
function setupMessageListener(): void {
  chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
    switch (message.type) {
      case 'TOGGLE_TRANSLATION':
        if (message.payload?.enabled) {
          startTranslation();
        } else {
          stopTranslation();
        }
        sendResponse({ success: true });
        break;
        
      case 'GET_STATUS':
        sendResponse({
          url: window.location.href,
          title: document.title,
        });
        break;
        
      default:
        sendResponse({ success: false, error: 'Unknown message type' });
    }
    
    return true;
  });
}

// 初始化
async function init(): Promise<void> {
  // 检查是否应该在此页面运行
  if (window.location.protocol === 'chrome:' || 
      window.location.protocol === 'chrome-extension:' ||
      window.location.protocol === 'moz-extension:') {
    return;
  }
  
  console.log('[OpenImmerse] Initializing...');
  
  // 注入样式
  injectStyles();
  
  // 获取配置
  const config = await getConfig();
  
  // 初始化翻译器
  initTranslator(config);
  
  // 初始化划词翻译
  initTooltip(config);
  
  // 设置消息监听
  setupMessageListener();
  
  // 监听配置变化
  onConfigChange((newConfig: AppConfig) => {
    updateConfig(newConfig);
    updateTooltipConfig(newConfig);
    
    // 如果翻译被禁用，停止翻译
    if (!newConfig.translation.enabled) {
      stopTranslation();
    }
  });
  
  // 如果配置中启用了翻译，自动开始
  if (config.translation.enabled) {
    // 等待页面加载完成
    if (document.readyState === 'complete') {
      startTranslation();
    } else {
      window.addEventListener('load', () => startTranslation());
    }
  }
  
  console.log('[OpenImmerse] Initialized successfully');
}

// 清理
function cleanup(): void {
  stopTranslation();
  destroyTooltip();
  
  const style = document.getElementById('openimmerse-styles');
  style?.remove();
}

// 页面卸载时清理
window.addEventListener('beforeunload', cleanup);

// 启动
init().catch(console.error);
