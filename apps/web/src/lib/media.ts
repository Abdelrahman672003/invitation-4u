import { API_BASE_PATH } from '@invite/shared';
import { ApiError } from './api';

const MAX_SIDE = 1600;

/** Public URL of a stored photo. */
export const mediaUrl = (name: string) => `${API_BASE_PATH}/media/${name}`;

/** Shrinks the picture in the browser (also drops camera metadata such as location) and returns a JPEG. */
async function downsize(file: File): Promise<Blob> {
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, MAX_SIDE / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement('canvas');
  canvas.width = Math.round(bitmap.width * scale);
  canvas.height = Math.round(bitmap.height * scale);
  canvas.getContext('2d')?.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  bitmap.close();
  const blob = await new Promise<Blob | null>((resolve) =>
    canvas.toBlob(resolve, 'image/jpeg', 0.86),
  );
  if (!blob) throw new ApiError(400, 'VALIDATION_ERROR', 'validation.photo');
  return blob;
}

/** Uploads a photo for an invitation and returns its stored name. */
export async function uploadPhoto(invitationId: string, file: File): Promise<string> {
  let body: Blob;
  try {
    body = await downsize(file);
  } catch {
    throw new ApiError(400, 'VALIDATION_ERROR', 'validation.photo');
  }
  let response: Response;
  try {
    response = await fetch(`${API_BASE_PATH}/invitations/${invitationId}/photo`, {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'image/jpeg' },
      body,
    });
  } catch {
    throw new ApiError(0, 'NETWORK_ERROR', 'Network error');
  }
  const payload = (await response.json().catch(() => null)) as { data?: { photo: string } } | null;
  if (!response.ok || !payload?.data)
    throw new ApiError(response.status, 'VALIDATION_ERROR', 'validation.photo');
  return payload.data.photo;
}

const MAX_MUSIC_BYTES = 6 * 1024 * 1024;

/** Uploads an mp3 background track and returns its stored name. */
export async function uploadMusic(invitationId: string, file: File): Promise<string> {
  if (file.size > MAX_MUSIC_BYTES) throw new ApiError(400, 'VALIDATION_ERROR', 'validation.music');
  let response: Response;
  try {
    response = await fetch(`${API_BASE_PATH}/invitations/${invitationId}/music`, {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'audio/mpeg' },
      body: file,
    });
  } catch {
    throw new ApiError(0, 'NETWORK_ERROR', 'Network error');
  }
  const payload = (await response.json().catch(() => null)) as { data?: { music: string } } | null;
  if (!response.ok || !payload?.data)
    throw new ApiError(response.status, 'VALIDATION_ERROR', 'validation.music');
  return payload.data.music;
}

/** Admin: uploads template artwork as it is (no resizing, so PNG transparency is kept). */
export async function uploadAsset(file: File): Promise<string> {
  if (
    file.size > 6 * 1024 * 1024 ||
    !['image/png', 'image/jpeg', 'image/webp'].includes(file.type)
  ) {
    throw new ApiError(400, 'VALIDATION_ERROR', 'validation.photo');
  }
  const response = await fetch(`${API_BASE_PATH}/admin/assets`, {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': file.type },
    body: file,
  });
  const payload = (await response.json().catch(() => null)) as { data?: { name: string } } | null;
  if (!response.ok || !payload?.data)
    throw new ApiError(response.status, 'VALIDATION_ERROR', 'validation.photo');
  return payload.data.name;
}

/** Customer: uploads Design Studio artwork for an invitation, as it is (PNG transparency is kept). */
export async function uploadArt(invitationId: string, file: File): Promise<string> {
  if (
    file.size > 3 * 1024 * 1024 ||
    !['image/png', 'image/jpeg', 'image/webp'].includes(file.type)
  ) {
    throw new ApiError(400, 'VALIDATION_ERROR', 'validation.photo');
  }
  const response = await fetch(`${API_BASE_PATH}/invitations/${invitationId}/art`, {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': file.type },
    body: file,
  });
  const payload = (await response.json().catch(() => null)) as { data?: { name: string } } | null;
  if (!response.ok || !payload?.data)
    throw new ApiError(response.status, 'VALIDATION_ERROR', 'validation.photo');
  return payload.data.name;
}
