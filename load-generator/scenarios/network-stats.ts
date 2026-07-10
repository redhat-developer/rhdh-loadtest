import type { Page, ConsoleMessage, Request, Response } from '@playwright/test';

interface LogResult {
  logStatsAndErrors: () => void;
}

export const addNetworkListeners = async (page: Page): Promise<LogResult> => {
  const consoleMessages = [] as ConsoleMessage[];
  const requests = [] as Request[];
  const requestsFailed = [] as Request[];
  const requestsFinished = [] as Request[];
  const responses = [] as Response[];
  
  page.on('console', (msg) => {
    console.log(`Browser console.${msg.type()}: ${msg.text()}`);
    consoleMessages.push(msg);
  });
  
  page.on('request', (req) => requests.push(req));
  page.on('requestfailed', (req) => requestsFailed.push(req));
  page.on('requestfinished', (req) => requestsFinished.push(req));
  page.on('response', (resp) => responses.push(resp));

  const logStatsAndErrors = () => {
    const stats = {
      consoleMessages: consoleMessages.length,
      requests: requests.length,
      requestsFailed: requestsFailed.length,
      requestsFinished: requestsFinished.length,
      responses: responses.length,
      perDomain: {} as Record<string, number>,
      perResourceType: {} as Record<string, number>,
      perStatusCode: {} as Record<number, number>,
    };
    
    const pageHostname = new URL(page.url()).hostname;
    responses.forEach((resp) => {
      const url = new URL(resp.url());
      const hostname = pageHostname === url.hostname ? 'same-domain' : url.hostname;
      stats.perDomain[hostname] = (stats.perDomain[hostname] || 0) + 1;
      const resourceType = resp.request().resourceType();
      stats.perResourceType[resourceType] = (stats.perResourceType[resourceType] || 0) + 1;
      const statusCode = resp.status();
      stats.perStatusCode[statusCode] = (stats.perStatusCode[statusCode] || 0) + 1;
    });

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
