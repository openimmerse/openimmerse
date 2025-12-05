import { AppConfig, ParsedTextBlock } from '@/types';
import { translateStream } from '@/utils/api';
import { 
  parseTextBlocks, 
  createPlaceholder, 
  updatePlaceholder, 
  setPlaceholderError,
  removeAllPlaceholders,
  setDisplayMode
} from './domParser';

// 状态指示器
let statusIndicator: HTMLElement | null = null;

interface TranslatorState {
  isActive: boolean;
  observer: IntersectionObserver | null;
  pendingBlocks: Map<string, ParsedTextBlock>;
  translatingBlocks: Set<string>;
  config: AppConfig | null;
  concurrencyCount: number;
}

const state: TranslatorState = {
  isActive: false,
  observer: null,
  pendingBlocks: new Map(),
  translatingBlocks: new Set(),
  config: null,
  concurrencyCount: 0,
};

/**
 * 显示状态指示器
 */
function showStatus(text: string): void {
  if (!statusIndicator) {
    statusIndicator = document.createElement('div');
    statusIndicator.className = 'openimmerse-status';
    document.body.appendChild(statusIndicator);
  }
  
  statusIndicator.innerHTML = `
    <div class="openimmerse-status-icon"></div>
    <span>${text}</span>
  `;
  statusIndicator.classList.remove('hidden');
}

/**
 * 隐藏状态指示器
 */
function hideStatus(): void {
  if (statusIndicator) {
    statusIndicator.classList.add('hidden');
  }
}

/**
 * 更新状态指示器
 */
function updateStatus(): void {
  const pending = state.pendingBlocks.size;
  const translating = state.translatingBlocks.size;
  
  if (translating > 0 || pending > 0) {
    showStatus(`翻译中... ${translating}/${pending + translating}`);
  } else if (state.isActive) {
    showStatus('翻译完成 ✓');
    setTimeout(hideStatus, 2000);
  }
}

/**
 * 处理单个文本块的翻译
 */
async function translateBlock(block: ParsedTextBlock): Promise<void> {
  if (!state.config || !block.placeholder) return;
  
  const { ai, translation } = state.config;
  
  if (!ai.apiKey) {
    setPlaceholderError(block.placeholder, 'API Key not configured');
    return;
  }
  
  state.translatingBlocks.add(block.hash);
  state.concurrencyCount++;
  updateStatus();
  
  try {
    let translatedText = '';
    
    const stream = translateStream(ai, {
      text: block.text,
      targetLang: translation.targetLang,
      systemPrompt: translation.systemPrompt,
    });
    
    for await (const chunk of stream) {
      translatedText += chunk;
      if (block.placeholder) {
        updatePlaceholder(block.placeholder, translatedText, true, block.text);
      }
    }
    
    // 完成翻译
    if (block.placeholder) {
      updatePlaceholder(block.placeholder, translatedText, false, block.text);
    }
  } catch (error) {
    if (block.placeholder) {
      setPlaceholderError(
        block.placeholder,
        error instanceof Error ? error.message : 'Translation failed'
      );
    }
  } finally {
    state.translatingBlocks.delete(block.hash);
    state.concurrencyCount--;
    updateStatus();
    
    // 处理队列中的下一个
    processQueue();
  }
}

/**
 * 处理翻译队列
 */
function processQueue(): void {
  if (!state.config) return;
  
  const maxConcurrency = state.config.ai.concurrency || 3;
  
  for (const [hash, block] of state.pendingBlocks) {
    if (state.concurrencyCount >= maxConcurrency) break;
    if (state.translatingBlocks.has(hash)) continue;
    
    state.pendingBlocks.delete(hash);
    translateBlock(block);
  }
}

/**
 * IntersectionObserver 回调
 */
function handleIntersection(entries: IntersectionObserverEntry[]): void {
  for (const entry of entries) {
    if (!entry.isIntersecting) continue;
    
    const placeholder = entry.target as HTMLElement;
    const hash = placeholder.getAttribute('data-openimmerse');
    
    if (!hash) continue;
    
    // 找到对应的文本块
    const block = Array.from(state.pendingBlocks.values()).find(b => b.hash === hash);
    if (!block) continue;
    
    // 停止观察
    state.observer?.unobserve(placeholder);
    
    // 添加到翻译队列
    processQueue();
  }
}

/**
 * 初始化翻译器
 */
export function initTranslator(config: AppConfig): void {
  state.config = config;
  
  // 设置显示模式
  setDisplayMode(config.translation.displayMode);
  
  // 创建 IntersectionObserver
  state.observer = new IntersectionObserver(handleIntersection, {
    root: null,
    rootMargin: '100px',
    threshold: 0,
  });
}

/**
 * 开始页面翻译
 */
export function startTranslation(): void {
  if (state.isActive || !state.config) return;
  
  state.isActive = true;
  
  // 解析页面文本块
  const blocks = parseTextBlocks(
    document.body,
    state.config.translation.minTextLength
  );
  
  // 为每个块创建占位符并观察
  for (const block of blocks) {
    createPlaceholder(block);
    state.pendingBlocks.set(block.hash, block);
    
    if (block.placeholder) {
      state.observer?.observe(block.placeholder);
    }
  }
  
  // 立即处理可见区域
  processQueue();
}

/**
 * 停止翻译
 */
export function stopTranslation(): void {
  state.isActive = false;
  state.observer?.disconnect();
  state.pendingBlocks.clear();
  state.translatingBlocks.clear();
  state.concurrencyCount = 0;
  
  removeAllPlaceholders();
}

/**
 * 更新配置
 */
export function updateConfig(config: AppConfig): void {
  state.config = config;
}

/**
 * 获取翻译器状态
 */
export function getTranslatorState(): { isActive: boolean; pendingCount: number; translatingCount: number } {
  return {
    isActive: state.isActive,
    pendingCount: state.pendingBlocks.size,
    translatingCount: state.translatingBlocks.size,
  };
}
