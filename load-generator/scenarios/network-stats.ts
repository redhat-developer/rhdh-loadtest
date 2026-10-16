import type { Page, ConsoleMessage, Request, Response } from '@playwright/test';

interface LogResult {
  logStatsAndErrors: () => Promise<void>;
}

export const addNetworkListeners = async (page: Page): Promise<LogResult> => {
  const consoleMessages = [] as ConsoleMessage[];
  const requests = [] as Request[];
  const requestsFailed = [] as Request[];
  const requestsFinished = new Set<Request>();
  const responses = [] as Response[];
  
  page.on('console', (msg) => {
    const type = msg.type();
    if (type === 'debug' || type === 'info') {
      return;
    }
    console.log(`Browser console.${type}: ${msg.text()}`);
    consoleMessages.push(msg);
  });
  
  page.on('request', (req) => requests.push(req));
  page.on('requestfailed', (req) => requestsFailed.push(req));
  page.on('requestfinished', (req) => requestsFinished.add(req));
  page.on('response', (resp) => responses.push(resp));

  const logStatsAndErrors = async () => {
    const stats = {
      consoleMessages: consoleMessages.length,
      requests: requests.length,
      requestsFailed: requestsFailed.length,
      requestsFinished: requestsFinished.size,
      responses: responses.length,
      responseSizeSumKb: 0,
      responseSizeMaxKb: 0,
      responseTimeSumSec: 0,
      responseTimeAvgSec: 0,
      perDomain: {} as Record<string, number>,
      perResourceType: {} as Record<string, number>,
      perStatusCode: {} as Record<number, number>,
    };
    
    const pageHostname = new URL(page.url()).hostname;

    const responseTimes: number[] = [];

    for (const resp of responses) {
      const req = resp.request();
      const url = new URL(resp.url());
      const hostname = pageHostname === url.hostname ? 'same-domain' : url.hostname;
      stats.perDomain[hostname] = (stats.perDomain[hostname] || 0) + 1;
      const resourceType = req.resourceType();
      stats.perResourceType[resourceType] = (stats.perResourceType[resourceType] || 0) + 1;
      const statusCode = resp.status();
      stats.perStatusCode[statusCode] = (stats.perStatusCode[statusCode] || 0) + 1;

      if (!requestsFinished.has(req) || req.failure()) {
        continue;
      }

      try {
        const sizes = await req.sizes();
        stats.responseSizeSumKb += sizes.responseBodySize / 1024;
        stats.responseSizeMaxKb = Math.max(
          stats.responseSizeMaxKb,
          sizes.responseBodySize / 1024,
        );

        const timing = req.timing();
        if (timing.responseEnd !== -1) {
          stats.responseTimeSumSec += timing.responseEnd / 1000;
          responseTimes.push(timing.responseEnd / 1000);
        }
      } catch {
        // Unfinished streams (SSE/long-poll) must not hang stats collection.
      }
    }
    stats.responseSizeSumKb = parseFloat(stats.responseSizeSumKb.toFixed(2));
    stats.responseSizeMaxKb = parseFloat(stats.responseSizeMaxKb.toFixed(2));
    stats.responseTimeSumSec = parseFloat(stats.responseTimeSumSec.toFixed(2));
    stats.responseTimeAvgSec =
      responseTimes.length > 0
        ? parseFloat((stats.responseTimeSumSec / responseTimes.length).toFixed(2))
        : -1;

    console.log('Stats:', stats);

    // Log all request failed
    requestsFailed.forEach((req) => {
      console.log(`Request failed: ${req.method()} ${req.url()} - ${req.failure()?.errorText}`);
    });

    // Log all responses with status code != 200
    responses.forEach((resp) => {
      if (resp.status() !== 200) {
        console.log(`Response with status code != 200: ${resp.status()} ${resp.url()}`);
      }
    });
  };

  return {
    logStatsAndErrors,
  }
};
