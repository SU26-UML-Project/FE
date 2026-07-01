export interface ProjectRequest {
  projectName?: string;
  description?: string;
  projectData?: string;
  isDraft?: boolean;
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
  createdAt: string;
  updatedAt: string;
}
