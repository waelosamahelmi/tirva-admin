/**
 * CloudPRNT Client API
 * Submits print jobs to the CloudPRNT server
 */

import { ReceiptData } from '../src/lib/printer/types';

interface CloudPRNTConfig {
  serverUrl: string;
  apiKey?: string;
}

interface CloudPRNTJobResponse {
  success: boolean;
  jobId?: string;
  message?: string;
  error?: string;
}

/**
 * CloudPRNT Client for submitting print jobs
 */
export class CloudPRNTClient {
  private config: CloudPRNTConfig;

  constructor(config: CloudPRNTConfig) {
    this.config = config;
  }

  /**
   * Submit a print job to CloudPRNT server
   */
  async submitJob(
    printerMac: string,
    receiptData: ReceiptData,
    originalOrder?: any,
    printerType: 'star' | 'escpos' = 'star'
  ): Promise<CloudPRNTJobResponse> {
    try {
      console.log(`📤 Submitting CloudPRNT job for printer ${printerMac}`);

      const response = await fetch(`${this.config.serverUrl}/cloudprnt-api/submit-job`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(this.config.apiKey ? { 'Authorization': `Bearer ${this.config.apiKey}` } : {})
        },
        body: JSON.stringify({
          printerMac,
          receiptData,
          originalOrder,
          printerType
        })
      });

      if (!response.ok) {
        throw new Error(`CloudPRNT submission failed: ${response.statusText}`);
      }

      const result = await response.json();
      console.log(`✅ CloudPRNT job submitted: ${result.jobId}`);

      return result;
    } catch (error) {
      console.error('❌ CloudPRNT submission error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Get CloudPRNT server status
   */
  async getStatus(): Promise<any> {
    try {
      const response = await fetch(`${this.config.serverUrl}/cloudprnt-api/status`, {
        headers: {
          ...(this.config.apiKey ? { 'Authorization': `Bearer ${this.config.apiKey}` } : {})
        }
      });

      if (!response.ok) {
        throw new Error(`Failed to get status: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      console.error('❌ CloudPRNT status error:', error);
      return null;
    }
  }

  /**
   * List registered printers
   */
  async listPrinters(): Promise<any[]> {
    try {
      const response = await fetch(`${this.config.serverUrl}/cloudprnt-api/printers`, {
        headers: {
          ...(this.config.apiKey ? { 'Authorization': `Bearer ${this.config.apiKey}` } : {})
        }
      });

      if (!response.ok) {
        throw new Error(`Failed to list printers: ${response.statusText}`);
      }

      const result = await response.json();
      return result.printers || [];
    } catch (error) {
      console.error('❌ CloudPRNT list printers error:', error);
      return [];
    }
  }
}

/**
 * Create CloudPRNT client instance
 */
export function createCloudPRNTClient(serverUrl?: string): CloudPRNTClient {
  const url = serverUrl || window.location.origin || 'http://localhost:5000';
  return new CloudPRNTClient({ serverUrl: url });
}



