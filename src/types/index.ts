// AI Provider 配置
export interface AIProviderConfig {
  provider: 'openai' | 'deepseek' | 'azure' | 'ollama' | 'custom';
  baseUrl: string;
  apiKey: string;
  model: string;
  concurrency: number;
}

// 显示模式
export type DisplayMode = 'replace' | 'bilingual' | 'hover';

// 翻译配置
export interface TranslationConfig {
  enabled: boolean;
  targetLang: string;
  sourceLang: string; // 'auto' 表示自动检测
  systemPrompt: string;
  minTextLength: number;
  displayMode: DisplayMode; // 翻译显示模式
  showOriginal: boolean; // 是否显示原文
  autoTranslate: boolean; // 是否自动翻译（页面加载时）
}

// 网站规则
export interface SiteRule {
  pattern: string; // URL 匹配模式，支持 * 通配符
  enabled: boolean;
  autoTranslate?: boolean;
  targetLang?: string;
}

// 翻译统计
export interface TranslationStats {
  totalTranslations: number;
  totalCharacters: number;
  cacheHits: number;
  lastTranslateTime: number;
  dailyStats: Record<string, { translations: number; characters: number }>;
}

// 完整配置
export interface AppConfig {
  ai: AIProviderConfig;
  translation: TranslationConfig;
  siteRules: SiteRule[];
  stats: TranslationStats;
}

// 翻译缓存条目
export interface TranslationCacheEntry {
  hash: string;
  originalText: string;
  translatedText: string;
  model: string;
  timestamp: number;
}

// 翻译请求
export interface TranslationRequest {
  text: string;
  targetLang: string;
  systemPrompt?: string;
}

// 翻译响应
export interface TranslationResponse {
  success: boolean;
  translatedText?: string;
  error?: string;
  fromCache?: boolean;
}

// 消息类型
export type MessageType = 
  | 'TRANSLATE_TEXT'
  | 'TRANSLATE_STREAM'
  | 'GET_CONFIG'
  | 'SAVE_CONFIG'
  | 'TOGGLE_TRANSLATION'
  | 'CLEAR_CACHE';

export interface Message {
  type: MessageType;
  payload?: unknown;
}

// DOM 解析结果
export interface ParsedTextBlock {
  element: HTMLElement;
  text: string;
  hash: string;
  placeholder?: HTMLElement;
}

// 支持的语言列表
export const SUPPORTED_LANGUAGES = [
  { code: 'auto', name: '自动检测', nameEn: 'Auto Detect' },
  { code: 'zh-CN', name: '简体中文', nameEn: 'Simplified Chinese' },
  { code: 'zh-TW', name: '繁体中文', nameEn: 'Traditional Chinese' },
  { code: 'en', name: '英语', nameEn: 'English' },
  { code: 'ja', name: '日语', nameEn: 'Japanese' },
  { code: 'ko', name: '韩语', nameEn: 'Korean' },
  { code: 'fr', name: '法语', nameEn: 'French' },
  { code: 'de', name: '德语', nameEn: 'German' },
  { code: 'es', name: '西班牙语', nameEn: 'Spanish' },
  { code: 'pt', name: '葡萄牙语', nameEn: 'Portuguese' },
  { code: 'ru', name: '俄语', nameEn: 'Russian' },
  { code: 'ar', name: '阿拉伯语', nameEn: 'Arabic' },
  { code: 'th', name: '泰语', nameEn: 'Thai' },
  { code: 'vi', name: '越南语', nameEn: 'Vietnamese' },
  { code: 'id', name: '印尼语', nameEn: 'Indonesian' },
  { code: 'it', name: '意大利语', nameEn: 'Italian' },
  { code: 'nl', name: '荷兰语', nameEn: 'Dutch' },
  { code: 'pl', name: '波兰语', nameEn: 'Polish' },
  { code: 'tr', name: '土耳其语', nameEn: 'Turkish' },
];

// 默认统计数据
export const DEFAULT_STATS: TranslationStats = {
  totalTranslations: 0,
  totalCharacters: 0,
  cacheHits: 0,
  lastTranslateTime: 0,
  dailyStats: {},
};

// 默认配置
export const DEFAULT_CONFIG: AppConfig = {
  ai: {
    provider: 'openai',
    baseUrl: 'https://api.openai.com/v1',
    apiKey: '',
    model: 'gpt-4o-mini',
    concurrency: 3,
  },
  translation: {
    enabled: false,
    targetLang: 'zh-CN',
    sourceLang: 'auto',
    systemPrompt: '你是一个翻译助手。请将以下文本翻译成目标语言，直接输出翻译结果，不要添加任何解释或额外内容。保持原文的格式和段落结构。',
    minTextLength: 10,
    displayMode: 'bilingual',
    showOriginal: true,
    autoTranslate: false,
  },
  siteRules: [],
  stats: DEFAULT_STATS,
};

// Provider 预设
export const PROVIDER_PRESETS: Record<string, Partial<AIProviderConfig>> = {
  openai: {
    baseUrl: 'https://api.openai.com/v1',
    model: 'gpt-4o-mini',
  },
  deepseek: {
    baseUrl: 'https://api.deepseek.com/v1',
    model: 'deepseek-chat',
  },
  azure: {
    baseUrl: 'https://YOUR_RESOURCE.openai.azure.com',
    model: 'gpt-4',
  },
  ollama: {
    baseUrl: 'http://localhost:11434/v1',
    model: 'llama2',
  },
  custom: {
    baseUrl: '',
    model: '',
  },
};
