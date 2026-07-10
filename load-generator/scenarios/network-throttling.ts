import type { BrowserContext } from 'playwright-core';

// Will read the NETWORK_THROTTLING environment variable and set up network throttling accordingly.
// Fallback to 'none' if the environment variable is not set or invalid.
type NetworkThrottlingOptions = 'none' | 'fast' | 'medium' | 'slow';

const option = process.env.NETWORK_THROTTLING as NetworkThrottlingOptions || 'none';

  // From CDPSession => Protocol.Network.EmulateNetworkConditionsParams
export type EmulateNetworkConditionsParameters = {
  /**
   * True to emulate internet disconnection.
   */
  offline: boolean;
  /**
   * Minimum latency from request sent to response headers received (ms).
   */
  latency: number;
  /**
   * Maximal aggregated download throughput (bytes/sec). -1 disables download throttling.
   */
  downloadThroughput: number;
  /**
   * Maximal aggregated upload throughput (bytes/sec).  -1 disables upload throttling.
   */
  uploadThroughput: number;
  /**
   * Connection type if known.
   */
  connectionType?: "none"|"cellular2g"|"cellular3g"|"cellular4g"|"bluetooth"|"ethernet"|"wifi"|"wimax"|"other";
  /**
   * WebRTC packet loss (percent, 0-100). 0 disables packet loss emulation, 100 drops all the packets.
   */
  packetLoss?: number;
  /**
   * WebRTC packet queue length (packet). 0 removes any queue length limitations.
   */
  packetQueueLength?: number;
  /**
   * WebRTC packetReordering feature.
   */
  packetReordering?: boolean;
}

const conditions: Record<string, EmulateNetworkConditionsParameters> = {
  none: {
    offline: false,
    downloadThroughput: -1,
    uploadThroughput: -1,
    latency: 0,
  },
  fast: {
    offline: false,
    downloadThroughput: 10 * 1024 * 1024 / 8, // 10 Mbit/s
    uploadThroughput: 5 * 1024 * 1024 / 8, // 5 Mbit/s
    latency: 2,
    connectionType: 'wifi',
  },
  medium: {
    offline: false,
    downloadThroughput: 5 * 1024 * 1024 / 8, // 5 Mbit/s
    uploadThroughput: 2 * 1024 * 1024 / 8, // 2 Mbit/s
    latency: 5,
    connectionType: 'wifi',
  },
  slow: {
    offline: false,
    downloadThroughput: 2 * 1024 * 1024 / 8, // 2 Mbit/s
    uploadThroughput: 1 * 1024 * 1024 / 8, // 1 Mbit/s
    latency: 10,
    connectionType: 'wifi',
  },
};

let alreadyConfigured = false;

export const setupNetworkThrottling = async (context: BrowserContext) => {
  if (alreadyConfigured) {
    return;
  }
  alreadyConfigured = true;

  let condition = conditions[option];

  if (!condition) {
    console.warn(`Invalid NETWORK_THROTTLING value: ${option}. Falling back to 'none'.`);
    condition = conditions.none;
  } else if (option === 'none') {
    console.log('Network throttling is disabled');
  } else {
    console.log('Network throttling is enabled with option:', option, '=>', condition);
  }

  const cdpSession = await context.newCDPSession(await context.pages()[0]);
  await cdpSession.send('Network.emulateNetworkConditions', condition);
};
