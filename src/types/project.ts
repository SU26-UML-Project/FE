export interface ProjectRequest {
  projectName?: string;
  description?: string;
  projectData?: string;
  isDraft?: boolean;
  publicAccess?: boolean;
}

export interface ProjectResponse {
  id: string;
  projectName: string;
  description?: string;
  userId?: string;
  ownerName?: string;
  ownerEmail?: string;
  diagramCount?: number;
  isDraft?: boolean;
  publicAccess?: boolean;
  createdAt: string;
  updatedAt: string;
}

// Admin Projects — thống kê toàn hệ thống (endpoint /projects/admin/stats)
export interface ProjectStats {
  total: number;
  onTrack: number;
  needAttention: number;
  drafts: number;
}

// Admin Projects — nhóm dự án theo chủ sở hữu (endpoint /projects/admin/owners)
export interface OwnerGroup {
  ownerId: string;
  ownerName?: string;
  ownerEmail?: string;
  projectCount: number;
}
