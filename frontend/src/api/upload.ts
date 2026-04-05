import { tokenStorage } from "../auth/token";

const API_URL =
  import.meta.env.VITE_API_URL ??
  "http://localhost:4000/api";

export type UploadResponse = {
  url: string;
  filename: string;
  mimetype: string;
  size: number;
};

export async function uploadFile(
  file: File,
): Promise<UploadResponse> {
  const token = tokenStorage.get();
  const formData = new FormData();
  formData.append("file", file);

  const res = await fetch(`${API_URL}/upload`, {
    method: "POST",
    headers: token
      ? { Authorization: `Bearer ${token}` }
      : {},
    body: formData,
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.message ?? "Upload failed");
  }

  return res.json();
}
