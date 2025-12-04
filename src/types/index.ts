// AI Provider 配置
export interface AIProviderConfig {
  provider: 'openai' | 'deepseek' | 'azure' | 'ollama' | 'custom';
  baseUrl: string;
  apiKey: string;
  model: string;
  concurrency: number;
}

// 翻译配置
export interface TranslationConfig {
  enabled: boolean;
  targetLang: string;
  systemPrompt: string;
  minTextLength: number;
}

// 完整配置
export interface AppConfig {
  ai: AIProviderConfig;
  translation: TranslationConfig;
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
    systemPrompt: '你是一个翻译助手。请将以下文本翻译成目标语言，直接输出翻译结果，不要添加任何解释或额外内容。保持原文的格式和段落结构。',
    minTextLength: 10,
  },
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
