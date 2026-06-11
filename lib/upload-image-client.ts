export async function uploadImage(
  bucket: string,
  file: File,
  folder?: string
): Promise<{ url: string | null; error: string | null }> {
  const form = new FormData();
  form.append("file", file);
  form.append("bucket", bucket);
  if (folder) form.append("folder", folder);

  const res = await fetch("/api/upload-image", { method: "POST", body: form });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    return { url: null, error: body.error ?? `Upload failed (${res.status})` };
  }
  const { url } = await res.json();
  return { url, error: null };
}
