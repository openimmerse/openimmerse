import { openDB, DBSchema, IDBPDatabase } from 'idb';
import { TranslationCacheEntry } from '@/types';

interface OpenImmerseDB extends DBSchema {
  translations: {
    key: string;
    value: TranslationCacheEntry;
    indexes: { 'by-timestamp': number };
  };
}

const DB_NAME = 'openimmerse_cache';
const DB_VERSION = 1;
const STORE_NAME = 'translations';
const MAX_CACHE_SIZE = 10000; // 最大缓存条目数

let dbInstance: IDBPDatabase<OpenImmerseDB> | null = null;

/**
 * 获取数据库实例
 */
async function getDB(): Promise<IDBPDatabase<OpenImmerseDB>> {
  if (dbInstance) return dbInstance;
  
  dbInstance = await openDB<OpenImmerseDB>(DB_NAME, DB_VERSION, {
    upgrade(db) {
      const store = db.createObjectStore(STORE_NAME, { keyPath: 'hash' });
      store.createIndex('by-timestamp', 'timestamp');
    },
  });
  
  return dbInstance;
}

/**
 * 生成文本指纹 (MD5 Hash)
 */
export function generateHash(text: string): string {
  // 简单的hash实现，生产环境可用md5
  let hash = 0;
  for (let i = 0; i < text.length; i++) {
    const char = text.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return Math.abs(hash).toString(16);
}

/**
 * 从缓存获取翻译
 */
export async function getCachedTranslation(hash: string): Promise<TranslationCacheEntry | undefined> {
  try {
    const db = await getDB();
    return await db.get(STORE_NAME, hash);
  } catch (error) {
    console.error('[OpenImmerse] Cache get error:', error);
    return undefined;
  }
}

/**
 * 保存翻译到缓存
 */
export async function setCachedTranslation(entry: TranslationCacheEntry): Promise<void> {
  try {
    const db = await getDB();
    await db.put(STORE_NAME, entry);
    
    // 检查并清理过期缓存
    await cleanupCache();
  } catch (error) {
    console.error('[OpenImmerse] Cache set error:', error);
  }
}

/**
 * 清理过期缓存 (LRU策略)
 */
async function cleanupCache(): Promise<void> {
  try {
    const db = await getDB();
    const count = await db.count(STORE_NAME);
    
    if (count > MAX_CACHE_SIZE) {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const index = tx.store.index('by-timestamp');
      let cursor = await index.openCursor();
      let deleteCount = count - MAX_CACHE_SIZE;
      
      while (cursor && deleteCount > 0) {
        await cursor.delete();
        cursor = await cursor.continue();
        deleteCount--;
      }
      
      await tx.done;
    }
  } catch (error) {
    console.error('[OpenImmerse] Cache cleanup error:', error);
  }
}

/**
 * 清空所有缓存
 */
export async function clearAllCache(): Promise<void> {
  try {
    const db = await getDB();
    await db.clear(STORE_NAME);
  } catch (error) {
    console.error('[OpenImmerse] Cache clear error:', error);
  }
}

/**
 * 获取缓存统计
 */
export async function getCacheStats(): Promise<{ count: number; oldestTimestamp: number | null }> {
  try {
    const db = await getDB();
    const count = await db.count(STORE_NAME);
    
    const tx = db.transaction(STORE_NAME, 'readonly');
    const index = tx.store.index('by-timestamp');
    const cursor = await index.openCursor();
    
    return {
      count,
      oldestTimestamp: cursor?.value.timestamp ?? null,
    };
  } catch (error) {
    console.error('[OpenImmerse] Cache stats error:', error);
    return { count: 0, oldestTimestamp: null };
  }
}
