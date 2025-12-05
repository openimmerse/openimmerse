import { AppConfig } from '@/types';
import { translateStream } from '@/utils/api';

interface TooltipState {
  container: HTMLElement | null;
  shadowRoot: ShadowRoot | null;
  config: AppConfig | null;
  isVisible: boolean;
  currentText: string;
}

const state: TooltipState = {
  container: null,
  shadowRoot: null,
  config: null,
  isVisible: false,
  currentText: '',
};

/**
 * 创建 Shadow DOM 容器
 */
function createContainer(): void {
  if (state.container) return;
  
  state.container = document.createElement('div');
  state.container.id = 'openimmerse-tooltip-root';
  state.container.style.cssText = 'position: fixed; z-index: 2147483647; pointer-events: none;';
  document.body.appendChild(state.container);
  
  state.shadowRoot = state.container.attachShadow({ mode: 'closed' });
  
  // 注入样式
  const style = document.createElement('style');
  style.textContent = `
    .tooltip-trigger {
      position: fixed;
      width: 32px;
      height: 32px;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      border-radius: 50%;
      cursor: pointer;
      pointer-events: auto;
      display: flex;
      align-items: center;
      justify-content: center;
      box-shadow: 0 2px 12px rgba(102, 126, 234, 0.4);
      transition: all 0.2s ease;
      z-index: 2147483647;
      animation: tooltip-appear 0.2s ease;
    }
    @keyframes tooltip-appear {
      from { opacity: 0; transform: scale(0.8); }
      to { opacity: 1; transform: scale(1); }
    }
    .tooltip-trigger:hover {
      transform: scale(1.15);
      box-shadow: 0 4px 16px rgba(102, 126, 234, 0.5);
    }
    .tooltip-trigger svg {
      width: 16px;
      height: 16px;
      fill: white;
    }
    .tooltip-popup {
      position: fixed;
      min-width: 280px;
      max-width: 420px;
      background: white;
      border-radius: 12px;
      box-shadow: 0 8px 32px rgba(0,0,0,0.15);
      pointer-events: auto;
      overflow: hidden;
      z-index: 2147483647;
      animation: popup-appear 0.25s ease;
    }
    @keyframes popup-appear {
      from { opacity: 0; transform: translateY(-10px); }
      to { opacity: 1; transform: translateY(0); }
    }
    .tooltip-header {
      padding: 10px 14px;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
      font-size: 13px;
      font-weight: 600;
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
    .tooltip-header-title {
      display: flex;
      align-items: center;
      gap: 6px;
    }
    .tooltip-header-title svg {
      width: 16px;
      height: 16px;
      fill: white;
    }
    .tooltip-close {
      width: 20px;
      height: 20px;
      display: flex;
      align-items: center;
      justify-content: center;
      cursor: pointer;
      opacity: 0.8;
      transition: all 0.2s;
      border-radius: 50%;
    }
    .tooltip-close:hover {
      opacity: 1;
      background: rgba(255,255,255,0.2);
    }
    .tooltip-content {
      padding: 14px;
      font-size: 14px;
      line-height: 1.7;
      color: #333;
      overflow-y: auto;
      max-height: 200px;
    }
    .tooltip-loading {
      display: flex;
      align-items: center;
      gap: 10px;
      color: #666;
      padding: 8px 0;
    }
    .tooltip-spinner {
      width: 18px;
      height: 18px;
      border: 2px solid #e0e0e0;
      border-top-color: #667eea;
      border-radius: 50%;
      animation: spin 0.8s linear infinite;
    }
    @keyframes spin {
      to { transform: rotate(360deg); }
    }
    .tooltip-cursor {
      display: inline-block;
      width: 2px;
      height: 1em;
      background: #667eea;
      animation: blink 0.8s infinite;
      vertical-align: text-bottom;
      margin-left: 2px;
    }
    @keyframes blink {
      50% { opacity: 0; }
    }
    .tooltip-error {
      color: #e53935;
      display: flex;
      align-items: center;
      gap: 8px;
    }
    .tooltip-original {
      font-size: 12px;
      color: #888;
      border-top: 1px solid #f0f0f0;
      padding: 10px 14px;
      background: #fafafa;
      max-height: 60px;
      overflow-y: auto;
    }
    .tooltip-original-label {
      font-size: 10px;
      color: #aaa;
      margin-bottom: 4px;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }
    .tooltip-actions {
      display: flex;
      gap: 8px;
      padding: 10px 14px;
      background: #f8f9fa;
      border-top: 1px solid #f0f0f0;
    }
    .tooltip-btn {
      flex: 1;
      padding: 8px 12px;
      font-size: 12px;
      font-weight: 500;
      border: none;
      border-radius: 6px;
      cursor: pointer;
      transition: all 0.2s;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 4px;
    }
    .tooltip-btn-copy {
      background: #667eea;
      color: white;
    }
    .tooltip-btn-copy:hover {
      background: #5a6fd6;
    }
    .tooltip-btn-copy.copied {
      background: #10b981;
    }
    .tooltip-btn-speak {
      background: #f0f0f0;
      color: #666;
    }
    .tooltip-btn-speak:hover {
      background: #e0e0e0;
    }
  `;
  state.shadowRoot.appendChild(style);
}

/**
 * 显示翻译触发按钮
 */
function showTrigger(x: number, y: number, text: string): void {
  if (!state.shadowRoot) return;
  
  // 移除旧的触发器
  hideTrigger();
  
  state.currentText = text;
  
  const trigger = document.createElement('div');
  trigger.className = 'tooltip-trigger';
  trigger.innerHTML = `
    <svg viewBox="0 0 24 24">
      <path d="M12.87 15.07l-2.54-2.51.03-.03A17.52 17.52 0 0014.07 6H17V4h-7V2H8v2H1v2h11.17C11.5 7.92 10.44 9.75 9 11.35 8.07 10.32 7.3 9.19 6.69 8h-2c.73 1.63 1.73 3.17 2.98 4.56l-5.09 5.02L4 19l5-5 3.11 3.11.76-2.04zM18.5 10h-2L12 22h2l1.12-3h4.75L21 22h2l-4.5-12zm-2.62 7l1.62-4.33L19.12 17h-3.24z"/>
    </svg>
  `;
  
  // 计算位置
  const triggerX = Math.min(x + 10, window.innerWidth - 40);
  const triggerY = Math.min(y - 30, window.innerHeight - 40);
  
  trigger.style.left = `${triggerX}px`;
  trigger.style.top = `${triggerY}px`;
  
  trigger.addEventListener('click', (e) => {
    e.stopPropagation();
    showPopup(triggerX, triggerY + 30);
  });
  
  state.shadowRoot.appendChild(trigger);
}

/**
 * 隐藏触发按钮
 */
function hideTrigger(): void {
  if (!state.shadowRoot) return;
  
  const trigger = state.shadowRoot.querySelector('.tooltip-trigger');
  trigger?.remove();
}

/**
 * 显示翻译弹窗
 */
async function showPopup(x: number, y: number): Promise<void> {
  if (!state.shadowRoot || !state.config) return;
  
  hideTrigger();
  hidePopup();
  
  const popup = document.createElement('div');
  popup.className = 'tooltip-popup';
  
  // 计算位置，确保不超出屏幕
  const popupWidth = 320;
  const popupHeight = 280;
  let popupX = x;
  let popupY = y;
  
  if (popupX + popupWidth > window.innerWidth) {
    popupX = window.innerWidth - popupWidth - 20;
  }
  if (popupY + popupHeight > window.innerHeight) {
    popupY = window.innerHeight - popupHeight - 20;
  }
  if (popupX < 10) popupX = 10;
  if (popupY < 10) popupY = 10;
  
  popup.style.left = `${popupX}px`;
  popup.style.top = `${popupY}px`;
  
  const originalPreview = state.currentText.length > 80 
    ? state.currentText.slice(0, 80) + '...' 
    : state.currentText;
  
  popup.innerHTML = `
    <div class="tooltip-header">
      <div class="tooltip-header-title">
        <svg viewBox="0 0 24 24">
          <path d="M12.87 15.07l-2.54-2.51.03-.03A17.52 17.52 0 0014.07 6H17V4h-7V2H8v2H1v2h11.17C11.5 7.92 10.44 9.75 9 11.35 8.07 10.32 7.3 9.19 6.69 8h-2c.73 1.63 1.73 3.17 2.98 4.56l-5.09 5.02L4 19l5-5 3.11 3.11.76-2.04zM18.5 10h-2L12 22h2l1.12-3h4.75L21 22h2l-4.5-12zm-2.62 7l1.62-4.33L19.12 17h-3.24z"/>
        </svg>
        <span>OpenImmerse</span>
      </div>
      <span class="tooltip-close">✕</span>
    </div>
    <div class="tooltip-content">
      <div class="tooltip-loading">
        <div class="tooltip-spinner"></div>
        <span>正在翻译...</span>
      </div>
    </div>
    <div class="tooltip-original">
      <div class="tooltip-original-label">原文</div>
      ${escapeHtml(originalPreview)}
    </div>
  `;
  
  state.shadowRoot.appendChild(popup);
  state.isVisible = true;
  
  // 关闭按钮
  popup.querySelector('.tooltip-close')?.addEventListener('click', hidePopup);
  
  // 开始翻译
  const contentEl = popup.querySelector('.tooltip-content');
  if (!contentEl) return;
  
  try {
    const { ai, translation } = state.config;
    
    if (!ai.apiKey) {
      contentEl.innerHTML = '<div class="tooltip-error">⚠️ 请先配置 API Key</div>';
      return;
    }
    
    let translatedText = '';
    const stream = translateStream(ai, {
      text: state.currentText,
      targetLang: translation.targetLang,
      systemPrompt: translation.systemPrompt,
    });
    
    for await (const chunk of stream) {
      translatedText += chunk;
      contentEl.innerHTML = `${escapeHtml(translatedText)}<span class="tooltip-cursor"></span>`;
    }
    
    // 翻译完成，显示结果和操作按钮
    contentEl.innerHTML = escapeHtml(translatedText);
    
    // 添加操作按钮
    const actionsEl = document.createElement('div');
    actionsEl.className = 'tooltip-actions';
    actionsEl.innerHTML = `
      <button class="tooltip-btn tooltip-btn-copy">📋 复制译文</button>
      <button class="tooltip-btn tooltip-btn-speak">🔊 朗读</button>
    `;
    popup.appendChild(actionsEl);
    
    // 绑定复制事件
    const copyBtn = actionsEl.querySelector('.tooltip-btn-copy');
    copyBtn?.addEventListener('click', async () => {
      try {
        await navigator.clipboard.writeText(translatedText);
        if (copyBtn instanceof HTMLElement) {
          copyBtn.textContent = '✓ 已复制';
          copyBtn.classList.add('copied');
          setTimeout(() => {
            copyBtn.textContent = '📋 复制译文';
            copyBtn.classList.remove('copied');
          }, 1500);
        }
      } catch (e) {
        console.error('[OpenImmerse] Copy failed:', e);
      }
    });
    
    // 绑定朗读事件
    const speakBtn = actionsEl.querySelector('.tooltip-btn-speak');
    speakBtn?.addEventListener('click', () => {
      const utterance = new SpeechSynthesisUtterance(translatedText);
      utterance.lang = translation.targetLang;
      speechSynthesis.speak(utterance);
    });
    
  } catch (error) {
    contentEl.innerHTML = `<div class="tooltip-error">⚠️ ${escapeHtml(error instanceof Error ? error.message : '翻译失败')}</div>`;
  }
}

/**
 * 隐藏弹窗
 */
function hidePopup(): void {
  if (!state.shadowRoot) return;
  
  const popup = state.shadowRoot.querySelector('.tooltip-popup');
  popup?.remove();
  state.isVisible = false;
}

/**
 * HTML 转义
 */
function escapeHtml(text: string): string {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

/**
 * 处理鼠标选择事件
 */
function handleMouseUp(event: MouseEvent): void {
  const selection = window.getSelection();
  const text = selection?.toString().trim();
  
  if (!text || text.length < 2) {
    hideTrigger();
    return;
  }
  
  showTrigger(event.clientX, event.clientY, text);
}

/**
 * 处理点击事件（隐藏）
 */
function handleClick(event: MouseEvent): void {
  if (!state.shadowRoot) return;
  
  const target = event.target as Node;
  
  // 检查是否点击在 tooltip 内部
  if (state.container?.contains(target)) return;
  
  hideTrigger();
  hidePopup();
}

/**
 * 初始化划词翻译
 */
export function initTooltip(config: AppConfig): void {
  state.config = config;
  createContainer();
  
  document.addEventListener('mouseup', handleMouseUp);
  document.addEventListener('click', handleClick);
}

/**
 * 更新配置
 */
export function updateTooltipConfig(config: AppConfig): void {
  state.config = config;
}

/**
 * 销毁划词翻译
 */
export function destroyTooltip(): void {
  document.removeEventListener('mouseup', handleMouseUp);
  document.removeEventListener('click', handleClick);
  
  state.container?.remove();
  state.container = null;
  state.shadowRoot = null;
}
