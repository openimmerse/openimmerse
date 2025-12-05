import React, { useState, useEffect } from 'react';
import { AppConfig, DEFAULT_CONFIG, PROVIDER_PRESETS, SUPPORTED_LANGUAGES, DisplayMode } from '@/types';
import { testConnection } from '@/utils/api';

type TabType = 'main' | 'settings' | 'about';

const App: React.FC = () => {
  const [config, setConfig] = useState<AppConfig>(DEFAULT_CONFIG);
  const [activeTab, setActiveTab] = useState<TabType>('main');
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);
  const [cacheStats, setCacheStats] = useState<{ count: number } | null>(null);

  // 加载配置
  useEffect(() => {
    chrome.runtime.sendMessage({ type: 'GET_CONFIG' }, (response) => {
      if (response?.success && response.data) {
        setConfig(response.data);
      }
      setIsLoading(false);
    });

    // 获取缓存统计
    chrome.runtime.sendMessage({ type: 'GET_CACHE_STATS' }, (response) => {
      if (response?.success && response.data) {
        setCacheStats(response.data);
      }
    });
  }, []);

  // 保存配置
  const saveConfig = async (newConfig: Partial<AppConfig>) => {
    setIsSaving(true);
    const updatedConfig = {
      ...config,
      ...newConfig,
      ai: { ...config.ai, ...newConfig.ai },
      translation: { ...config.translation, ...newConfig.translation },
    };
    
    chrome.runtime.sendMessage(
      { type: 'SAVE_CONFIG', payload: updatedConfig },
      () => {
        setConfig(updatedConfig);
        setIsSaving(false);
      }
    );
  };

  // 切换翻译
  const toggleTranslation = async () => {
    const newEnabled = !config.translation.enabled;
    saveConfig({ translation: { ...config.translation, enabled: newEnabled } });
    
    // 直接发送到当前标签页
    try {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      if (tab?.id) {
        await chrome.tabs.sendMessage(tab.id, {
          type: 'TOGGLE_TRANSLATION',
          payload: { enabled: newEnabled },
        });
      }
    } catch (error) {
      // 如果 content script 未加载，刷新页面
      console.log('[OpenImmerse] Content script not ready, reloading tab...');
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      if (tab?.id) {
        await chrome.tabs.reload(tab.id);
      }
    }
  };

  // 测试连接
  const handleTestConnection = async () => {
    setTestResult(null);
    const result = await testConnection(config.ai);
    setTestResult(result);
  };

  // 清除缓存
  const handleClearCache = () => {
    chrome.runtime.sendMessage({ type: 'CLEAR_CACHE' }, () => {
      setCacheStats({ count: 0 });
    });
  };

  // Provider 变更
  const handleProviderChange = (provider: string) => {
    const preset = PROVIDER_PRESETS[provider];
    if (preset) {
      saveConfig({
        ai: {
          ...config.ai,
          provider: provider as AppConfig['ai']['provider'],
          baseUrl: preset.baseUrl || config.ai.baseUrl,
          model: preset.model || config.ai.model,
        },
      });
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full min-h-[480px] bg-gradient-to-br from-indigo-500 to-purple-600">
        <div className="animate-spin rounded-full h-8 w-8 border-2 border-white border-t-transparent"></div>
      </div>
    );
  }

  return (
    <div className="min-h-[480px] bg-white">
      {/* Header */}
      <div className="bg-gradient-to-r from-indigo-500 to-purple-600 text-white p-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-white/20 rounded-lg flex items-center justify-center">
            <svg className="w-6 h-6" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12.87 15.07l-2.54-2.51.03-.03A17.52 17.52 0 0014.07 6H17V4h-7V2H8v2H1v2h11.17C11.5 7.92 10.44 9.75 9 11.35 8.07 10.32 7.3 9.19 6.69 8h-2c.73 1.63 1.73 3.17 2.98 4.56l-5.09 5.02L4 19l5-5 3.11 3.11.76-2.04zM18.5 10h-2L12 22h2l1.12-3h4.75L21 22h2l-4.5-12zm-2.62 7l1.62-4.33L19.12 17h-3.24z"/>
            </svg>
          </div>
          <div>
            <h1 className="text-lg font-semibold">OpenImmerse</h1>
            <p className="text-xs text-white/80">AI 沉浸式翻译</p>
          </div>
        </div>
        
        {/* 翻译开关 */}
        <div className="mt-4 flex items-center justify-between bg-white/10 rounded-lg p-3">
          <span className="text-sm">页面翻译</span>
          <button
            onClick={toggleTranslation}
            className={`relative w-12 h-6 rounded-full transition-colors ${
              config.translation.enabled ? 'bg-green-400' : 'bg-white/30'
            }`}
          >
            <span
              className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-transform ${
                config.translation.enabled ? 'left-7' : 'left-1'
              }`}
            />
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b">
        {(['main', 'settings', 'about'] as TabType[]).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`flex-1 py-3 text-sm font-medium transition-colors ${
              activeTab === tab
                ? 'text-indigo-600 border-b-2 border-indigo-600'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            {tab === 'main' ? '配置' : tab === 'settings' ? '高级' : '关于'}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="p-4 space-y-4 max-h-[320px] overflow-y-auto">
        {activeTab === 'main' && (
          <>
            {/* Provider */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                AI 服务商
              </label>
              <select
                value={config.ai.provider}
                onChange={(e) => handleProviderChange(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              >
                <option value="openai">OpenAI</option>
                <option value="deepseek">DeepSeek</option>
                <option value="azure">Azure OpenAI</option>
                <option value="ollama">Ollama (本地)</option>
                <option value="custom">自定义</option>
              </select>
            </div>

            {/* Base URL */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                API Base URL
              </label>
              <input
                type="text"
                value={config.ai.baseUrl}
                onChange={(e) => saveConfig({ ai: { ...config.ai, baseUrl: e.target.value } })}
                placeholder="https://api.openai.com/v1"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              />
            </div>

            {/* API Key */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                API Key
              </label>
              <input
                type="password"
                value={config.ai.apiKey}
                onChange={(e) => saveConfig({ ai: { ...config.ai, apiKey: e.target.value } })}
                placeholder="sk-..."
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              />
            </div>

            {/* Model */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                模型名称
              </label>
              <input
                type="text"
                value={config.ai.model}
                onChange={(e) => saveConfig({ ai: { ...config.ai, model: e.target.value } })}
                placeholder="gpt-4o-mini"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              />
            </div>

            {/* Test Connection */}
            <button
              onClick={handleTestConnection}
              disabled={!config.ai.apiKey}
              className="w-full py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              测试连接
            </button>

            {testResult && (
              <div
                className={`p-3 rounded-lg text-sm ${
                  testResult.success
                    ? 'bg-green-50 text-green-700'
                    : 'bg-red-50 text-red-700'
                }`}
              >
                {testResult.message}
              </div>
            )}
          </>
        )}

        {activeTab === 'settings' && (
          <>
            {/* Display Mode */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                显示模式
              </label>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { value: 'bilingual' as DisplayMode, label: '双语对照', icon: '📖' },
                  { value: 'replace' as DisplayMode, label: '仅译文', icon: '📝' },
                  { value: 'hover' as DisplayMode, label: '悬浮显示', icon: '💬' },
                ].map((mode) => (
                  <button
                    key={mode.value}
                    onClick={() =>
                      saveConfig({ translation: { ...config.translation, displayMode: mode.value } })
                    }
                    className={`p-2 text-xs rounded-lg border transition-all ${
                      config.translation.displayMode === mode.value
                        ? 'border-indigo-500 bg-indigo-50 text-indigo-700'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <span className="block text-lg mb-1">{mode.icon}</span>
                    {mode.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Target Language */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                目标语言
              </label>
              <select
                value={config.translation.targetLang}
                onChange={(e) =>
                  saveConfig({ translation: { ...config.translation, targetLang: e.target.value } })
                }
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              >
                {SUPPORTED_LANGUAGES.filter(l => l.code !== 'auto').map((lang) => (
                  <option key={lang.code} value={lang.code}>
                    {lang.name} ({lang.nameEn})
                  </option>
                ))}
              </select>
            </div>

            {/* Source Language */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                源语言
              </label>
              <select
                value={config.translation.sourceLang}
                onChange={(e) =>
                  saveConfig({ translation: { ...config.translation, sourceLang: e.target.value } })
                }
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              >
                {SUPPORTED_LANGUAGES.map((lang) => (
                  <option key={lang.code} value={lang.code}>
                    {lang.name} ({lang.nameEn})
                  </option>
                ))}
              </select>
            </div>

            {/* Concurrency */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                并发数 (防止 429 错误)
              </label>
              <input
                type="number"
                min="1"
                max="10"
                value={config.ai.concurrency}
                onChange={(e) =>
                  saveConfig({ ai: { ...config.ai, concurrency: parseInt(e.target.value) || 3 } })
                }
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              />
            </div>

            {/* System Prompt */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                自定义 Prompt
              </label>
              <textarea
                value={config.translation.systemPrompt}
                onChange={(e) =>
                  saveConfig({ translation: { ...config.translation, systemPrompt: e.target.value } })
                }
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent resize-none text-sm"
                placeholder="你是一个翻译助手..."
              />
            </div>

            {/* Cache Stats */}
            <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
              <div>
                <p className="text-sm font-medium text-gray-700">翻译缓存</p>
                <p className="text-xs text-gray-500">
                  {cacheStats ? `${cacheStats.count} 条记录` : '加载中...'}
                </p>
              </div>
              <button
                onClick={handleClearCache}
                className="px-3 py-1 text-sm text-red-600 hover:bg-red-50 rounded transition-colors"
              >
                清除
              </button>
            </div>

            {/* Keyboard Shortcut Info */}
            <div className="p-3 bg-blue-50 rounded-lg">
              <p className="text-sm font-medium text-blue-700">⌨️ 快捷键</p>
              <p className="text-xs text-blue-600 mt-1">
                Alt + T: 开启/关闭页面翻译
              </p>
            </div>
          </>
        )}

        {activeTab === 'about' && (
          <div className="space-y-4">
            <div className="text-center py-4">
              <div className="w-16 h-16 mx-auto bg-gradient-to-br from-indigo-500 to-purple-600 rounded-2xl flex items-center justify-center mb-3">
                <svg className="w-10 h-10 text-white" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12.87 15.07l-2.54-2.51.03-.03A17.52 17.52 0 0014.07 6H17V4h-7V2H8v2H1v2h11.17C11.5 7.92 10.44 9.75 9 11.35 8.07 10.32 7.3 9.19 6.69 8h-2c.73 1.63 1.73 3.17 2.98 4.56l-5.09 5.02L4 19l5-5 3.11 3.11.76-2.04zM18.5 10h-2L12 22h2l1.12-3h4.75L21 22h2l-4.5-12zm-2.62 7l1.62-4.33L19.12 17h-3.24z"/>
                </svg>
              </div>
              <h2 className="text-xl font-bold text-gray-800">OpenImmerse</h2>
              <p className="text-sm text-gray-500">v1.0.0</p>
            </div>

            <div className="space-y-2 text-sm text-gray-600">
              <p>🚀 AI 原生沉浸式翻译插件</p>
              <p>✨ 支持 OpenAI 兼容接口</p>
              <p>📖 懒加载翻译，节省 Token</p>
              <p>💾 IndexedDB 智能缓存</p>
              <p>🎯 划词翻译 & 全页翻译</p>
            </div>

            <div className="pt-4 border-t">
              <a
                href="https://github.com/openimmerse/openimmerse"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-center gap-2 py-2 text-indigo-600 hover:text-indigo-700"
              >
                <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z"/>
                </svg>
                GitHub
              </a>
            </div>
          </div>
        )}
      </div>

      {/* Saving indicator */}
      {isSaving && (
        <div className="fixed bottom-4 right-4 bg-gray-800 text-white px-3 py-1 rounded-full text-xs">
          保存中...
        </div>
      )}
    </div>
  );
};

export default App;
