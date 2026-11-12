import type { BrowserContext, Page } from 'playwright-core';

export type CacheMode = 'cold' | 'warm';

export function requestedCacheModes(): CacheMode[] {
  const raw = (process.env.CACHE_MODE ?? 'both').toLowerCase();
  if (raw === 'cold') return ['cold'];
  if (raw === 'warm') return ['warm'];
  if (raw === 'both') return ['cold', 'warm'];
  console.warn(`Invalid CACHE_MODE="${raw}". Falling back to both.`);
  return ['cold', 'warm'];
}

/**
 * Cold: empty HTTP cache, cache disabled (first-hit / no cache).
 * Warm: HTTP cache enabled (repeat hits in the same browser context).
 */
export const setupCacheMode = async (
  context: BrowserContext,
  page: Page,
  mode: CacheMode,
) => {
  const cdp = await context.newCDPSession(page);
  await cdp.send('Network.enable');

  if (mode === 'cold') {
    await cdp.send('Network.setCacheDisabled', { cacheDisabled: true });
    await cdp.send('Network.clearBrowserCache');
    console.log('CACHE_MODE=cold (cache disabled, browser cache cleared)');
  } else {
    await cdp.send('Network.setCacheDisabled', { cacheDisabled: false });
    console.log('CACHE_MODE=warm (cache enabled)');
  }
};
