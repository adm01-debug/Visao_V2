/**
 * VISÃO - Analytics Tracking Utility
 * Simple wrapper for tracking UX events
 */

import { logger } from '@/lib/logger';

export const trackUXEvent = (action: string, details: Record<string, any> = {}) => {
  // In a real production app, this would send to Segment/PostHog/GA4
  // For now, we log it and potentially send to our audit_logs table via RPC
  const event = {
    timestamp: new Date().toISOString(),
    action,
    ...details,
    url: window.location.href,
  };

  if (import.meta.env.DEV) {
    console.debug(`[UX Tracker] ${action}`, details);
  }

  logger.info(`UX Event: ${action}`, details);
  
  // Future: dispatch to a Supabase edge function for long-term analysis
};
