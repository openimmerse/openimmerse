import { SiteRule, AppConfig } from '@/types';

/**
 * 将通配符模式转换为正则表达式
 */
function patternToRegex(pattern: string): RegExp {
  const escaped = pattern
    .replace(/[.+?^${}()|[\]\\]/g, '\\$&')
    .replace(/\*/g, '.*');
  return new RegExp(`^${escaped}$`, 'i');
}

/**
 * 检查URL是否匹配规则
 */
export function matchesPattern(url: string, pattern: string): boolean {
  try {
    const regex = patternToRegex(pattern);
    return regex.test(url);
  } catch {
    return false;
  }
}

/**
 * 获取URL匹配的规则
 */
export function getMatchingRule(url: string, rules: SiteRule[]): SiteRule | null {
  for (const rule of rules) {
    if (matchesPattern(url, rule.pattern)) {
      return rule;
    }
  }
  return null;
}

/**
 * 检查网站是否启用翻译
 */
export function isSiteEnabled(url: string, config: AppConfig): boolean {
  const rule = getMatchingRule(url, config.siteRules);
  
  if (rule) {
    return rule.enabled;
  }
  
  // 默认启用
  return true;
}

/**
 * 检查网站是否自动翻译
 */
export function shouldAutoTranslate(url: string, config: AppConfig): boolean {
  const rule = getMatchingRule(url, config.siteRules);
  
  if (rule && rule.autoTranslate !== undefined) {
    return rule.autoTranslate;
  }
  
  return config.translation.autoTranslate;
}

/**
 * 获取网站的目标语言
 */
export function getSiteTargetLang(url: string, config: AppConfig): string {
  const rule = getMatchingRule(url, config.siteRules);
  
  if (rule && rule.targetLang) {
    return rule.targetLang;
  }
  
  return config.translation.targetLang;
}

/**
 * 添加网站规则
 */
export function addSiteRule(rules: SiteRule[], newRule: SiteRule): SiteRule[] {
  // 检查是否已存在相同模式
  const existingIndex = rules.findIndex(r => r.pattern === newRule.pattern);
  
  if (existingIndex >= 0) {
    // 更新现有规则
    const updated = [...rules];
    updated[existingIndex] = newRule;
    return updated;
  }
  
  return [...rules, newRule];
}

/**
 * 删除网站规则
 */
export function removeSiteRule(rules: SiteRule[], pattern: string): SiteRule[] {
  return rules.filter(r => r.pattern !== pattern);
}

/**
 * 从URL生成规则模式
 */
export function generatePatternFromUrl(url: string): string {
  try {
    const urlObj = new URL(url);
    return `*://${urlObj.hostname}/*`;
  } catch {
    return url;
  }
}

/**
 * 常用网站预设规则
 */
export const PRESET_RULES: SiteRule[] = [
  { pattern: '*://translate.google.com/*', enabled: false },
  { pattern: '*://www.deepl.com/*', enabled: false },
  { pattern: '*://fanyi.baidu.com/*', enabled: false },
  { pattern: '*://localhost/*', enabled: false },
  { pattern: '*://127.0.0.1/*', enabled: false },
];
