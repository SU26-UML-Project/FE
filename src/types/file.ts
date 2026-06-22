export interface FileUploadResult {
  bucket: string;
  path: string;
  url?: string; // public URL — chỉ có với bucket public (avatars)
}
