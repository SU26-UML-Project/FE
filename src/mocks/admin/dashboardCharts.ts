// Mock chart data for Admin Dashboard
// TODO: Replace with real metrics endpoint when backend is ready

export interface ActivityDataPoint {
  name: string;
  diagrams: number;
  users: number;
}

export const MOCK_ACTIVITY_CHART_DATA: ActivityDataPoint[] = [
  { name: 'Day 1', diagrams: 400, users: 240 },
  { name: 'Day 5', diagrams: 300, users: 139 },
  { name: 'Day 10', diagrams: 200, users: 980 },
  { name: 'Day 15', diagrams: 278, users: 390 },
  { name: 'Day 20', diagrams: 189, users: 480 },
  { name: 'Day 25', diagrams: 239, users: 380 },
  { name: 'Day 30', diagrams: 349, users: 430 },
];
