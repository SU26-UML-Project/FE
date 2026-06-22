import type { ReactNode } from 'react';

export type AdminTab =
  | 'dashboard' | 'system-settings' | 'audit-logs' | 'support-tickets'
  | 'ai-model-config' | 'workspace-config' | 'document-manager'
  | 'user-management' | 'role-permissions' | 'user-activity';

export interface NavItemConfig {
  id: AdminTab;
  label: string;
  icon: ReactNode;
}

export interface NavSection {
  label: string;
  items: NavItemConfig[];
}
