/**
 * VISÃO - NotificationConfig types & helpers
 */
import type { NotificationConfigData } from '../NotificationConfig';

export type { NotificationConfigData };

export function createListHelpers(
  config: NotificationConfigData,
  updateConfig: (updates: Partial<NotificationConfigData>) => void,
) {
  return {
    addEmail: (email: string) => {
      if (email && !config.email.recipients.includes(email)) {
        updateConfig({ email: { ...config.email, recipients: [...config.email.recipients, email] } });
        return true;
      }
      return false;
    },
    removeEmail: (email: string) => {
      updateConfig({ email: { ...config.email, recipients: config.email.recipients.filter(e => e !== email) } });
    },
    addPhone: (phone: string) => {
      if (phone && !config.sms.recipients.includes(phone)) {
        updateConfig({ sms: { ...config.sms, recipients: [...config.sms.recipients, phone] } });
        return true;
      }
      return false;
    },
    removePhone: (phone: string) => {
      updateConfig({ sms: { ...config.sms, recipients: config.sms.recipients.filter(p => p !== phone) } });
    },
    addWebhook: (url: string) => {
      if (url && !config.webhook.urls.includes(url)) {
        updateConfig({ webhook: { ...config.webhook, urls: [...config.webhook.urls, url] } });
        return true;
      }
      return false;
    },
    removeWebhook: (url: string) => {
      updateConfig({ webhook: { ...config.webhook, urls: config.webhook.urls.filter(u => u !== url) } });
    },
    toggleSeverity: (severity: 'low' | 'medium' | 'high' | 'critical') => {
      const newFilter = config.severityFilter.includes(severity)
        ? config.severityFilter.filter(s => s !== severity)
        : [...config.severityFilter, severity];
      updateConfig({ severityFilter: newFilter });
    },
  };
}
