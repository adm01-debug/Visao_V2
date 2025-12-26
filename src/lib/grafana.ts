/**
 * Grafana Dashboard Config
 */
export const dashboardConfig = {
  title: 'Visao Monitoring',
  panels: [
    { type: 'graph', title: 'Request Rate', targets: [{ expr: 'rate(http_requests_total[5m])' }] },
    { type: 'graph', title: 'Error Rate', targets: [{ expr: 'rate(http_errors_total[5m])' }] },
    { type: 'stat', title: 'Active Cameras', targets: [{ expr: 'cameras_active' }] },
  ],
};
export function generateDashboardJson(config: typeof dashboardConfig): string { return JSON.stringify(config, null, 2); }
