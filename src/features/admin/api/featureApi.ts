import apiClient from '../../../shared/api/apiClient';
import type { ApiResponse } from '../../../types/api';

/** Một dòng trong danh mục tính năng hệ thống (rows của matrix Pricing). */
export interface FeatureCatalogItem {
  id: string; // UUID
  label: string;
  sortOrder: number;
}

export interface FeatureRequest {
  label: string;
  sortOrder: number;
}

export const featureService = {
  /** Danh mục chung — rows matrix + công tắc form admin. */
  getFeatures: () =>
    apiClient.get<any, ApiResponse<FeatureCatalogItem[]>>("/admin/features").then((r) => r.result),

  createFeature: (body: FeatureRequest) =>
    apiClient.post<any, ApiResponse<FeatureCatalogItem>>("/admin/features", body).then((r) => r.result),

  updateFeature: (id: string, body: FeatureRequest) =>
    apiClient.put<any, ApiResponse<FeatureCatalogItem>>(`/admin/features/${id}`, body).then((r) => r.result),

  deleteFeature: (id: string) =>
    apiClient.delete<any, ApiResponse<void>>(`/admin/features/${id}`).then((r) => r.result),
};
