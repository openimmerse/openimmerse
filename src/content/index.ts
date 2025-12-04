import { AppConfig } from '@/types';
import { getConfig, onConfigChange } from '@/utils/storage';
import { initTranslator, startTranslation, stopTranslation, updateConfig } from '@/core/translator';
import { initTooltip, updateTooltipConfig, destroyTooltip } from '@/core/tooltip';

// 注入样式
function injectStyles(): void {
  const style = document.createElement('style');
  style.id = 'openimmerse-styles';
  style.textContent = `
    .openimmerse-placeholder {
      margin: 8px 0;
      padding: 12px;
      background: linear-gradient(135deg, #f8f9ff 0%, #f0f4ff 100%);
      border-left: 3px solid #667eea;
      border-radius: 4px;
      font-size: 14px;
      line-height: 1.6;
      color: #333;
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
    
    .openimmerse-translation {
      white-space: pre-wrap;
      word-break: break-word;
    }
    
    .openimmerse-translation.streaming {
      /* 流式输出样式 */
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
    
    .openimmerse-error {
      display: flex;
      align-items: center;
      gap: 8px;
      color: #e53935;
      font-size: 13px;
    }
    
    .openimmerse-error-icon {
      font-size: 16px;
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
