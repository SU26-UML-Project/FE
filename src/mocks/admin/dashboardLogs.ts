// Mock System Activity Log entries for Admin Dashboard
// TODO: Replace with real audit log endpoint when backend is ready

export interface ActivityLogEntry {
  time: string;
  text: string;
}

export const MOCK_ACTIVITY_LOGS: ActivityLogEntry[] = [
  { time: '08:42 AM', text: "Admin updated 'AnythingLLM' model configuration." },
  { time: '08:40 AM', text: 'New Enterprise Tier user registered.' },
  { time: '08:35 AM', text: "Diagram 'Diagram A' was published." },
  { time: '08:30 AM', text: 'System Health Check completed.' },
];
