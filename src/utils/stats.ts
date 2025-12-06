import { TranslationStats, DEFAULT_STATS } from '@/types';

const STATS_KEY = 'openimmerse_stats';

/**
 * 获取统计数据
 */
export async function getStats(): Promise<TranslationStats> {
  return new Promise((resolve) => {
    chrome.storage.local.get([STATS_KEY], (result) => {
      resolve(result[STATS_KEY] || DEFAULT_STATS);
    });
  });
}

/**
 * 保存统计数据
 */
export async function saveStats(stats: TranslationStats): Promise<void> {
  return new Promise((resolve) => {
    chrome.storage.local.set({ [STATS_KEY]: stats }, resolve);
  });
}

/**
 * 记录一次翻译
 */
export async function recordTranslation(characterCount: number, fromCache: boolean = false): Promise<void> {
  const stats = await getStats();
  const today = new Date().toISOString().split('T')[0];
  
  stats.totalTranslations++;
  stats.totalCharacters += characterCount;
  stats.lastTranslateTime = Date.now();
  
  if (fromCache) {
    stats.cacheHits++;
  }
  
  // 更新每日统计
  if (!stats.dailyStats[today]) {
    stats.dailyStats[today] = { translations: 0, characters: 0 };
  }
  stats.dailyStats[today].translations++;
  stats.dailyStats[today].characters += characterCount;
  
  // 只保留最近30天的数据
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
  const cutoffDate = thirtyDaysAgo.toISOString().split('T')[0];
  
  Object.keys(stats.dailyStats).forEach(date => {
    if (date < cutoffDate) {
      delete stats.dailyStats[date];
    }
  });
  
  await saveStats(stats);
}

/**
 * 重置统计数据
 */
export async function resetStats(): Promise<void> {
  await saveStats(DEFAULT_STATS);
}

/**
 * 获取今日统计
 */
export async function getTodayStats(): Promise<{ translations: number; characters: number }> {
  const stats = await getStats();
  const today = new Date().toISOString().split('T')[0];
  return stats.dailyStats[today] || { translations: 0, characters: 0 };
}

/**
 * 获取最近7天统计
 */
export async function getWeeklyStats(): Promise<{ date: string; translations: number; characters: number }[]> {
  const stats = await getStats();
  const result: { date: string; translations: number; characters: number }[] = [];
  
  for (let i = 6; i >= 0; i--) {
    const date = new Date();
    date.setDate(date.getDate() - i);
    const dateStr = date.toISOString().split('T')[0];
    const dayStats = stats.dailyStats[dateStr] || { translations: 0, characters: 0 };
    result.push({ date: dateStr, ...dayStats });
  }
  
  return result;
}
