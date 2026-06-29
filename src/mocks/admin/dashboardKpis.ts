// Mock KPI metrics for Admin Dashboard
// TODO: Replace with real metrics endpoint when backend is ready

export const MOCK_KPIS = {
  totalDiagrams: {
    value: '1',
    badge: '+0%',
    badgeColor: 'gray' as const,
  },
  aiRequests: {
    value: '142',
    badge: '+12% usage',
    badgeColor: 'green' as const,
  },
  activeUsersBadge: {
    badge: '+100% vs last week',
    badgeColor: 'green' as const,
  },
  systemStatus: {
    label: 'All Systems Operational',
  },
  serverLoad: {
    value: '12%',
  },
  apiLatency: {
    value: '45ms',
    statusLabel: 'FAST',
  },
};
