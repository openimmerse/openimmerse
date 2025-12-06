import { getConfig, saveConfig } from '@/utils/storage';
import { clearAllCache, getCacheStats } from '@/utils/cache';
import { getStats, resetStats, recordTranslation, getWeeklyStats } from '@/utils/stats';
import { generatePatternFromUrl, addSiteRule } from '@/utils/siteRules';

// 右键菜单 ID
const CONTEXT_MENU_TRANSLATE = 'openimmerse-translate-selection';
const CONTEXT_MENU_TOGGLE_SITE = 'openimmerse-toggle-site';
const CONTEXT_MENU_ADD_BLACKLIST = 'openimmerse-add-blacklist';

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
        const cacheStats = await getCacheStats();
        sendResponse({ success: true, data: cacheStats });
        break;
      }
      
      case 'GET_STATS': {
        const stats = await getStats();
        sendResponse({ success: true, data: stats });
        break;
      }
      
      case 'GET_WEEKLY_STATS': {
        const weeklyStats = await getWeeklyStats();
        sendResponse({ success: true, data: weeklyStats });
        break;
      }
      
      case 'RESET_STATS': {
        await resetStats();
        sendResponse({ success: true });
        break;
      }
      
      case 'RECORD_TRANSLATION': {
        const { characterCount, fromCache } = message.payload as { characterCount: number; fromCache: boolean };
        await recordTranslation(characterCount, fromCache);
        sendResponse({ success: true });
        break;
      }
      
      case 'ADD_SITE_RULE': {
        const config = await getConfig();
        const { pattern, enabled } = message.payload as { pattern: string; enabled: boolean };
        const newRules = addSiteRule(config.siteRules, { pattern, enabled });
        await saveConfig({ siteRules: newRules });
        sendResponse({ success: true });
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

// 创建右键菜单
function createContextMenus(): void {
  chrome.contextMenus.removeAll(() => {
    // 翻译选中文本
    chrome.contextMenus.create({
      id: CONTEXT_MENU_TRANSLATE,
      title: '翻译选中文本',
      contexts: ['selection'],
    });
    
    // 切换当前网站翻译
    chrome.contextMenus.create({
      id: CONTEXT_MENU_TOGGLE_SITE,
      title: '切换当前网站翻译',
      contexts: ['page'],
    });
    
    // 添加到黑名单
    chrome.contextMenus.create({
      id: CONTEXT_MENU_ADD_BLACKLIST,
      title: '禁用此网站翻译',
      contexts: ['page'],
    });
  });
}

// 右键菜单点击处理
chrome.contextMenus.onClicked.addListener(async (info, tab) => {
  if (!tab?.id) return;
  
  switch (info.menuItemId) {
    case CONTEXT_MENU_TRANSLATE:
      if (info.selectionText) {
        // 发送翻译请求到 content script
        chrome.tabs.sendMessage(tab.id, {
          type: 'TRANSLATE_SELECTION',
          payload: { text: info.selectionText },
        });
      }
      break;
      
    case CONTEXT_MENU_TOGGLE_SITE:
      if (tab.url) {
        const config = await getConfig();
        const pattern = generatePatternFromUrl(tab.url);
        const existingRule = config.siteRules.find(r => r.pattern === pattern);
        const newEnabled = existingRule ? !existingRule.enabled : false;
        
        const newRules = addSiteRule(config.siteRules, { pattern, enabled: newEnabled });
        await saveConfig({ siteRules: newRules });
        
        // 刷新页面应用新规则
        chrome.tabs.reload(tab.id);
      }
      break;
      
    case CONTEXT_MENU_ADD_BLACKLIST:
      if (tab.url) {
        const config = await getConfig();
        const pattern = generatePatternFromUrl(tab.url);
        const newRules = addSiteRule(config.siteRules, { pattern, enabled: false });
        await saveConfig({ siteRules: newRules });
        
        // 刷新页面应用新规则
        chrome.tabs.reload(tab.id);
      }
      break;
  }
});

// 安装时初始化
chrome.runtime.onInstalled.addListener(async (details) => {
  console.log('[OpenImmerse] Extension installed/updated:', details.reason);
  
  // 创建右键菜单
  createContextMenus();
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
