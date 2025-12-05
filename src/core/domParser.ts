import { ParsedTextBlock, DisplayMode } from '@/types';
import { generateHash } from '@/utils/cache';

// 当前显示模式
let currentDisplayMode: DisplayMode = 'bilingual';

// 黑名单标签
const BLACKLIST_TAGS = new Set([
  'SCRIPT', 'STYLE', 'NOSCRIPT', 'IFRAME', 'OBJECT', 'EMBED',
  'NAV', 'FOOTER', 'HEADER', 'ASIDE', 'CODE', 'PRE', 'SVG',
  'CANVAS', 'VIDEO', 'AUDIO', 'IMG', 'INPUT', 'TEXTAREA', 'SELECT',
  'BUTTON', 'FORM', 'META', 'LINK', 'HEAD', 'TITLE',
]);

// 目标块级标签
const BLOCK_TAGS = new Set([
  'P', 'H1', 'H2', 'H3', 'H4', 'H5', 'H6',
  'LI', 'BLOCKQUOTE', 'TD', 'TH', 'DIV', 'ARTICLE', 'SECTION',
  'FIGCAPTION', 'CAPTION', 'DD', 'DT',
]);

// OpenImmerse 标记属性
const MARKER_ATTR = 'data-openimmerse';

/**
 * 检查元素是否应该被跳过
 */
function shouldSkipElement(element: Element): boolean {
  // 检查黑名单
  if (BLACKLIST_TAGS.has(element.tagName)) return true;
  
  // 检查是否已处理
  if (element.hasAttribute(MARKER_ATTR)) return true;
  
  // 检查是否在黑名单父元素内
  let parent = element.parentElement;
  while (parent) {
    if (BLACKLIST_TAGS.has(parent.tagName)) return true;
    if (parent.hasAttribute(MARKER_ATTR)) return true;
    parent = parent.parentElement;
  }
  
  // 检查 contenteditable
  if (element.getAttribute('contenteditable') === 'true') return true;
  
  return false;
}

/**
 * 获取元素的纯文本内容
 */
function getTextContent(element: Element): string {
  const clone = element.cloneNode(true) as Element;
  
  // 移除子元素中的黑名单标签
  BLACKLIST_TAGS.forEach(tag => {
    clone.querySelectorAll(tag).forEach(el => el.remove());
  });
  
  return clone.textContent?.trim() || '';
}

/**
 * 检查文本是否主要是英文或其他需要翻译的语言
 */
function needsTranslation(text: string): boolean {
  // 简单启发式：如果包含大量非中文字符，可能需要翻译
  const nonChineseRatio = text.replace(/[\u4e00-\u9fff]/g, '').length / text.length;
  return nonChineseRatio > 0.5;
}

/**
 * 解析页面中的可翻译文本块
 */
export function parseTextBlocks(
  root: Element = document.body,
  minTextLength: number = 10
): ParsedTextBlock[] {
  const blocks: ParsedTextBlock[] = [];
  
  // 遍历所有块级元素
  const walker = document.createTreeWalker(
    root,
    NodeFilter.SHOW_ELEMENT,
    {
      acceptNode: (node) => {
        const element = node as Element;
        
        if (shouldSkipElement(element)) {
          return NodeFilter.FILTER_REJECT;
        }
        
        if (BLOCK_TAGS.has(element.tagName)) {
          return NodeFilter.FILTER_ACCEPT;
        }
        
        return NodeFilter.FILTER_SKIP;
      },
    }
  );
  
  let node: Node | null;
  while ((node = walker.nextNode())) {
    const element = node as HTMLElement;
    const text = getTextContent(element);
    
    // 检查文本长度
    if (text.length < minTextLength) continue;
    
    // 检查是否需要翻译
    if (!needsTranslation(text)) continue;
    
    // 检查是否包含子块级元素（避免重复）
    const hasBlockChild = Array.from(element.children).some(
      child => BLOCK_TAGS.has(child.tagName)
    );
    if (hasBlockChild) continue;
    
    blocks.push({
      element,
      text,
      hash: generateHash(text),
    });
  }
  
  return blocks;
}

/**
 * 创建翻译占位符
 */
export function createPlaceholder(block: ParsedTextBlock): HTMLElement {
  const placeholder = document.createElement('div');
  placeholder.className = 'openimmerse-placeholder';
  placeholder.setAttribute(MARKER_ATTR, block.hash);
  placeholder.innerHTML = `
    <div class="openimmerse-skeleton">
      <div class="openimmerse-skeleton-line"></div>
      <div class="openimmerse-skeleton-line short"></div>
    </div>
  `;
  
  // 插入到原元素后面
  block.element.setAttribute(MARKER_ATTR, 'source');
  block.element.insertAdjacentElement('afterend', placeholder);
  block.placeholder = placeholder;
  
  return placeholder;
}

/**
 * 设置显示模式
 */
export function setDisplayMode(mode: DisplayMode): void {
  currentDisplayMode = mode;
}

/**
 * 更新占位符内容 - 支持双语对照
 */
export function updatePlaceholder(
  placeholder: HTMLElement,
  content: string,
  isStreaming: boolean = false,
  originalText?: string
): void {
  const escapedContent = escapeHtml(content);
  const cursor = isStreaming ? '<span class="openimmerse-cursor"></span>' : '';
  
  if (currentDisplayMode === 'bilingual' && originalText) {
    // 双语对照模式
    placeholder.className = 'openimmerse-container openimmerse-bilingual';
    placeholder.innerHTML = `
      <div class="openimmerse-original">${escapeHtml(originalText)}</div>
      <div class="openimmerse-translated">
        <span class="openimmerse-translation">${escapedContent}${cursor}</span>
      </div>
      ${!isStreaming ? createActionButtons(content) : ''}
    `;
  } else {
    // 仅译文模式
    placeholder.className = 'openimmerse-container openimmerse-replace';
    placeholder.innerHTML = `
      <span class="openimmerse-translation">${escapedContent}${cursor}</span>
      ${!isStreaming ? createActionButtons(content) : ''}
    `;
  }
  
  // 绑定按钮事件
  if (!isStreaming) {
    bindActionEvents(placeholder, content);
  }
}

/**
 * 创建操作按钮
 */
function createActionButtons(_content: string): string {
  return `
    <div class="openimmerse-actions">
      <button class="openimmerse-btn openimmerse-btn-copy" data-action="copy">📋 复制译文</button>
    </div>
  `;
}

/**
 * 绑定操作按钮事件
 */
function bindActionEvents(placeholder: HTMLElement, content: string): void {
  const copyBtn = placeholder.querySelector('[data-action="copy"]');
  copyBtn?.addEventListener('click', async () => {
    try {
      await navigator.clipboard.writeText(content);
      if (copyBtn instanceof HTMLElement) {
        const originalText = copyBtn.textContent;
        copyBtn.textContent = '✓ 已复制';
        setTimeout(() => {
          copyBtn.textContent = originalText;
        }, 1500);
      }
    } catch (e) {
      console.error('[OpenImmerse] Copy failed:', e);
    }
  });
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
 * 设置占位符错误状态
 */
export function setPlaceholderError(placeholder: HTMLElement, error: string): void {
  placeholder.className = 'openimmerse-container';
  placeholder.innerHTML = `
    <div class="openimmerse-error">
      <span class="openimmerse-error-icon">⚠️</span>
      <span class="openimmerse-error-text">${escapeHtml(error)}</span>
      <button class="openimmerse-btn openimmerse-btn-retry" data-action="retry">🔄 重试</button>
    </div>
  `;
}

/**
 * 移除所有翻译占位符
 */
export function removeAllPlaceholders(): void {
  document.querySelectorAll('.openimmerse-placeholder').forEach(el => el.remove());
  document.querySelectorAll(`[${MARKER_ATTR}="source"]`).forEach(el => {
    el.removeAttribute(MARKER_ATTR);
  });
}

/**
 * 获取元素的可见性
 */
export function isElementVisible(element: Element): boolean {
  const rect = element.getBoundingClientRect();
  return (
    rect.top < window.innerHeight &&
    rect.bottom > 0 &&
    rect.left < window.innerWidth &&
    rect.right > 0
  );
}
