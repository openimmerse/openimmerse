import { AppConfig, DEFAULT_CONFIG } from '@/types';

const STORAGE_KEY = 'openimmerse_config';

/**
 * 获取配置
 */
export async function getConfig(): Promise<AppConfig> {
  return new Promise((resolve) => {
    chrome.storage.local.get([STORAGE_KEY], (result) => {
      if (result[STORAGE_KEY]) {
        resolve({ ...DEFAULT_CONFIG, ...result[STORAGE_KEY] });
      } else {
        resolve(DEFAULT_CONFIG);
      }
    });
  });
}

/**
 * 保存配置
 */
export async function saveConfig(config: Partial<AppConfig>): Promise<void> {
  const currentConfig = await getConfig();
  const newConfig = {
    ...currentConfig,
    ...config,
    ai: { ...currentConfig.ai, ...config.ai },
    translation: { ...currentConfig.translation, ...config.translation },
  };
  
  return new Promise((resolve) => {
    chrome.storage.local.set({ [STORAGE_KEY]: newConfig }, () => {
      resolve();
    });
  });
}

/**
 * 监听配置变化
 */
export function onConfigChange(callback: (config: AppConfig) => void): () => void {
  const listener = (changes: { [key: string]: chrome.storage.StorageChange }) => {
    if (changes[STORAGE_KEY]) {
      callback(changes[STORAGE_KEY].newValue as AppConfig);
    }
  };
  
  chrome.storage.local.onChanged.addListener(listener);
  
  return () => {
    chrome.storage.local.onChanged.removeListener(listener);
  };
}
