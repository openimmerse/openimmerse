import { ParsedTextBlock, DisplayMode } from '@/types';
import { generateHash } from '@/utils/cache';

// 当前显示模式
let currentDisplayMode: DisplayMode = 'bilingual';

// 黑名单标签 - 不翻译的元素
const BLACKLIST_TAGS = new Set([
  'SCRIPT', 'STYLE', 'NOSCRIPT', 'IFRAME', 'OBJECT', 'EMBED',
  'CODE', 'PRE', 'SVG', 'MATH', 'KBD', 'SAMP', 'VAR',
  'CANVAS', 'VIDEO', 'AUDIO', 'IMG', 'INPUT', 'TEXTAREA', 'SELECT',
  'BUTTON', 'FORM', 'META', 'LINK', 'HEAD', 'TITLE',
]);

// 低优先级标签 - 可能包含导航等非主要内容
const LOW_PRIORITY_TAGS = new Set([
  'NAV', 'FOOTER', 'HEADER', 'ASIDE', 'MENU', 'MENUITEM',
]);

// 目标块级标签 - 主要翻译目标
const BLOCK_TAGS = new Set([
  'P', 'H1', 'H2', 'H3', 'H4', 'H5', 'H6',
  'LI', 'BLOCKQUOTE', 'TD', 'TH', 'DIV', 'ARTICLE', 'SECTION',
  'FIGCAPTION', 'CAPTION', 'DD', 'DT', 'SUMMARY', 'DETAILS',
]);

// 内联标签 - 保持在块内
const INLINE_TAGS = new Set([
  'A', 'SPAN', 'STRONG', 'B', 'EM', 'I', 'U', 'S', 'MARK',
  'SMALL', 'SUB', 'SUP', 'ABBR', 'CITE', 'Q', 'TIME', 'LABEL',
]);

// 特定网站的选择器配置
const SITE_SELECTORS: Record<string, { content: string; exclude: string[] }> = {
  'github.com': {
    content: '.markdown-body, .comment-body, .blob-code-inner',
    exclude: ['.file-navigation', '.repository-content .Box-header'],
  },
  'medium.com': {
    content: 'article p, article h1, article h2, article h3, article h4',
    exclude: ['.metabar', '.postActions'],
  },
  'twitter.com': {
    content: '[data-testid="tweetText"]',
    exclude: [],
  },
  'x.com': {
    content: '[data-testid="tweetText"]',
    exclude: [],
  },
  'reddit.com': {
    content: '[data-click-id="text"] p, .RichTextJSON-root',
    exclude: ['.Comment__meta'],
  },
  'stackoverflow.com': {
    content: '.s-prose p, .s-prose li, .comment-copy',
    exclude: ['.post-menu', '.user-info'],
  },
  'news.ycombinator.com': {
    content: '.commtext, .storylink, .title a',
    exclude: ['.subtext'],
  },
};

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
function needsTranslation(text: string, targetLang: string = 'zh-CN'): boolean {
  if (text.length === 0) return false;
  
  // 统计各类字符
  const chineseChars = (text.match(/[\u4e00-\u9fff]/g) || []).length;
  const japaneseChars = (text.match(/[\u3040-\u309f\u30a0-\u30ff]/g) || []).length;
  const koreanChars = (text.match(/[\uac00-\ud7af]/g) || []).length;
  const latinChars = (text.match(/[a-zA-Z]/g) || []).length;
  const cyrillicChars = (text.match(/[\u0400-\u04ff]/g) || []).length;
  const arabicChars = (text.match(/[\u0600-\u06ff]/g) || []).length;
  
  const totalChars = text.replace(/\s/g, '').length;
  if (totalChars === 0) return false;
  
  // 根据目标语言判断是否需要翻译
  if (targetLang.startsWith('zh')) {
    // 目标是中文，如果已经是中文则不翻译
    return chineseChars / totalChars < 0.5;
  } else if (targetLang === 'ja') {
    // 目标是日文
    return (chineseChars + japaneseChars) / totalChars < 0.5;
  } else if (targetLang === 'ko') {
    // 目标是韩文
    return koreanChars / totalChars < 0.5;
  } else if (targetLang === 'ru') {
    // 目标是俄文
    return cyrillicChars / totalChars < 0.5;
  } else if (targetLang === 'ar') {
    // 目标是阿拉伯文
    return arabicChars / totalChars < 0.5;
  } else {
    // 目标是拉丁语系（英、法、德、西等）
    return latinChars / totalChars < 0.5;
  }
}

/**
 * 获取当前网站的特定选择器
 */
function getSiteConfig(): { content: string; exclude: string[] } | null {
  const hostname = window.location.hostname;
  
  for (const [domain, config] of Object.entries(SITE_SELECTORS)) {
    if (hostname.includes(domain)) {
      return config;
    }
  }
  
  return null;
}

/**
 * 检查元素是否在低优先级区域
 */
function isInLowPriorityArea(element: Element): boolean {
  let parent: Element | null = element;
  while (parent) {
    if (LOW_PRIORITY_TAGS.has(parent.tagName)) {
      return true;
    }
    // 检查常见的低优先级类名
    const className = parent.className?.toLowerCase() || '';
    if (className.includes('sidebar') || 
        className.includes('navigation') ||
        className.includes('menu') ||
        className.includes('footer') ||
        className.includes('header') ||
        className.includes('advertisement') ||
        className.includes('ad-')) {
      return true;
    }
    parent = parent.parentElement;
  }
  return false;
}

/**
 * 检查元素是否包含主要是内联内容
 */
function hasMainlyInlineContent(element: Element): boolean {
  const children = Array.from(element.children);
  if (children.length === 0) return true;
  
  const inlineChildren = children.filter(child => INLINE_TAGS.has(child.tagName));
  return inlineChildren.length / children.length > 0.7;
}

/**
 * 解析页面中的可翻译文本块
 */
export function parseTextBlocks(
  root: Element = document.body,
  minTextLength: number = 10,
  targetLang: string = 'zh-CN'
): ParsedTextBlock[] {
  const blocks: ParsedTextBlock[] = [];
  const siteConfig = getSiteConfig();
  
  // 如果有网站特定配置，使用特定选择器
  if (siteConfig) {
    const elements = root.querySelectorAll(siteConfig.content);
    
    elements.forEach(element => {
      // 检查是否在排除区域
      const isExcluded = siteConfig.exclude.some(selector => 
        element.closest(selector) !== null
      );
      if (isExcluded) return;
      
      if (shouldSkipElement(element)) return;
      
      const text = getTextContent(element);
      if (text.length < minTextLength) return;
      if (!needsTranslation(text, targetLang)) return;
      
      blocks.push({
        element: element as HTMLElement,
        text,
        hash: generateHash(text),
      });
    });
    
    return blocks;
  }
  
  // 通用解析逻辑
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
    if (!needsTranslation(text, targetLang)) continue;
    
    // 检查是否包含子块级元素（避免重复）
    const hasBlockChild = Array.from(element.children).some(
      child => BLOCK_TAGS.has(child.tagName)
    );
    if (hasBlockChild && !hasMainlyInlineContent(element)) continue;
    
    // 低优先级区域的元素放到后面
    const priority = isInLowPriorityArea(element) ? 1 : 0;
    
    blocks.push({
      element,
      text,
      hash: generateHash(text),
      priority,
    } as ParsedTextBlock & { priority?: number });
  }
  
  // 按优先级排序
  blocks.sort((a, b) => ((a as unknown as { priority?: number }).priority || 0) - ((b as unknown as { priority?: number }).priority || 0));
  
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
