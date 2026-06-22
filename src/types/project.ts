export interface ProjectRequest {
  projectName: string;
  description?: string;
  projectData?: string;
}

export interface ProjectResponse {
  id: string;
  projectName: string;
  description?: string;
  projectData?: string;
  createdAt: string;
  updatedAt: string;
}
