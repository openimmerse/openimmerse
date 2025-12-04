import { AIProviderConfig, TranslationRequest, TranslationResponse } from '@/types';
import { getCachedTranslation, setCachedTranslation, generateHash } from './cache';

/**
 * 调用 OpenAI 兼容 API 进行翻译
 */
export async function translateText(
  config: AIProviderConfig,
  request: TranslationRequest
): Promise<TranslationResponse> {
  const hash = generateHash(request.text + request.targetLang);
  
  // 检查缓存
  const cached = await getCachedTranslation(hash);
  if (cached) {
    return {
      success: true,
      translatedText: cached.translatedText,
      fromCache: true,
    };
  }
  
  try {
    const response = await fetch(`${config.baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${config.apiKey}`,
      },
      body: JSON.stringify({
        model: config.model,
        messages: [
          {
            role: 'system',
            content: request.systemPrompt || `Translate the following text to ${request.targetLang}. Output only the translation, nothing else.`,
          },
          {
            role: 'user',
            content: request.text,
          },
        ],
        temperature: 0.3,
        max_tokens: 4096,
      }),
    });
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error?.message || `API Error: ${response.status}`);
    }
    
    const data = await response.json();
    const translatedText = data.choices?.[0]?.message?.content?.trim() || '';
    
    // 保存到缓存
    await setCachedTranslation({
      hash,
      originalText: request.text,
      translatedText,
      model: config.model,
      timestamp: Date.now(),
    });
    
    return {
      success: true,
      translatedText,
      fromCache: false,
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * 流式翻译 (SSE)
 */
export async function* translateStream(
  config: AIProviderConfig,
  request: TranslationRequest
): AsyncGenerator<string, void, unknown> {
  const hash = generateHash(request.text + request.targetLang);
  
  // 检查缓存
  const cached = await getCachedTranslation(hash);
  if (cached) {
    yield cached.translatedText;
    return;
  }
  
  const response = await fetch(`${config.baseUrl}/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${config.apiKey}`,
    },
    body: JSON.stringify({
      model: config.model,
      messages: [
        {
          role: 'system',
          content: request.systemPrompt || `Translate the following text to ${request.targetLang}. Output only the translation, nothing else.`,
        },
        {
          role: 'user',
          content: request.text,
        },
      ],
      temperature: 0.3,
      max_tokens: 4096,
      stream: true,
    }),
  });
  
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error?.message || `API Error: ${response.status}`);
  }
  
  const reader = response.body?.getReader();
  if (!reader) throw new Error('No response body');
  
  const decoder = new TextDecoder();
  let fullText = '';
  
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    
    const chunk = decoder.decode(value, { stream: true });
    const lines = chunk.split('\n').filter(line => line.trim().startsWith('data:'));
    
    for (const line of lines) {
      const data = line.replace('data:', '').trim();
      if (data === '[DONE]') continue;
      
      try {
        const parsed = JSON.parse(data);
        const content = parsed.choices?.[0]?.delta?.content || '';
        if (content) {
          fullText += content;
          yield content;
        }
      } catch {
        // 忽略解析错误
      }
    }
  }
  
  // 保存完整翻译到缓存
  if (fullText) {
    await setCachedTranslation({
      hash,
      originalText: request.text,
      translatedText: fullText,
      model: config.model,
      timestamp: Date.now(),
    });
  }
}

/**
 * 测试 API 连接
 */
export async function testConnection(config: AIProviderConfig): Promise<{ success: boolean; message: string }> {
  try {
    const response = await fetch(`${config.baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${config.apiKey}`,
      },
      body: JSON.stringify({
        model: config.model,
        messages: [{ role: 'user', content: 'Hi' }],
        max_tokens: 5,
      }),
    });
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      return {
        success: false,
        message: errorData.error?.message || `HTTP ${response.status}`,
      };
    }
    
    return { success: true, message: 'Connection successful!' };
  } catch (error) {
    return {
      success: false,
      message: error instanceof Error ? error.message : 'Connection failed',
    };
  }
}
