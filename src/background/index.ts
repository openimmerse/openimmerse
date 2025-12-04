import { getConfig, saveConfig } from '@/utils/storage';
import { clearAllCache, getCacheStats } from '@/utils/cache';

// 消息处理
chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  handleMessage(message, sendResponse);
  return true; // 保持消息通道开放
});

async function handleMessage(
  message: { type: string; payload?: unknown },
  sendResponse: (response: unknown) => void
): Promise<void> {
  try {
    switch (message.type) {
      case 'GET_CONFIG': {
        const config = await getConfig();
        sendResponse({ success: true, data: config });
        break;
      }
      
      case 'SAVE_CONFIG': {
        await saveConfig(message.payload as Record<string, unknown>);
        sendResponse({ success: true });
        break;
      }
      
      case 'CLEAR_CACHE': {
        await clearAllCache();
        sendResponse({ success: true });
        break;
      }
      
      case 'GET_CACHE_STATS': {
        const stats = await getCacheStats();
        sendResponse({ success: true, data: stats });
        break;
      }
      
      case 'TOGGLE_TRANSLATION': {
        // 转发到当前活动标签页
        const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
        if (tab?.id) {
          chrome.tabs.sendMessage(tab.id, message, (response) => {
            sendResponse(response || { success: false, error: 'No response from content script' });
          });
        } else {
          sendResponse({ success: false, error: 'No active tab' });
        }
        break;
      }
      
      default:
        sendResponse({ success: false, error: 'Unknown message type' });
    }
  } catch (error) {
    sendResponse({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
}

// 安装时初始化
chrome.runtime.onInstalled.addListener(async (details) => {
  if (details.reason === 'install') {
    console.log('[OpenImmerse] Extension installed');
    // 首次安装时不需要额外操作，用户点击图标即可打开配置
  }
});

// 快捷键命令
chrome.commands?.onCommand?.addListener(async (command) => {
  if (command === 'toggle-translation') {
    const config = await getConfig();
    const newEnabled = !config.translation.enabled;
    
    await saveConfig({
      translation: { ...config.translation, enabled: newEnabled },
    });
    
    // 通知当前标签页
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (tab?.id) {
      chrome.tabs.sendMessage(tab.id, {
        type: 'TOGGLE_TRANSLATION',
        payload: { enabled: newEnabled },
      });
    }
  }
});

console.log('[OpenImmerse] Background service worker started');
