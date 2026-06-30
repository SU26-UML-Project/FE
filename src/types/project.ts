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
  projectData?: string;
  isDraft?: boolean;
  createdAt: string;
  updatedAt: string;
}
