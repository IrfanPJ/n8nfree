"use server";

import { supabase } from "@/lib/supabase";
import { auth } from "@/lib/auth";
import { randomUUID } from "crypto";

export async function uploadImageFromBase64(
  bucket: string,
  base64Data: string,
  contentType: string,
  folder?: string
): Promise<{ url: string | null; error: string | null }> {
  const session = await auth();
  if (!session?.user) return { url: null, error: "Unauthorized" };

  try {
    // Strip data URL prefix if present
    const base64 = base64Data.replace(/^data:[^;]+;base64,/, "");
    const buffer = Buffer.from(base64, "base64");
    const ext = contentType.split("/")[1] ?? "jpg";
    const path = folder ? `${folder}/${randomUUID()}.${ext}` : `${randomUUID()}.${ext}`;

    const { error } = await supabase.storage.from(bucket).upload(path, buffer, {
      contentType,
      upsert: false,
    });

    if (error) throw error;

    const { data: urlData } = supabase.storage.from(bucket).getPublicUrl(path);
    return { url: urlData.publicUrl, error: null };
  } catch (err: any) {
    return { url: null, error: err?.message ?? "Upload failed" };
  }
}

export async function deleteStorageImage(
  bucket: string,
  url: string
): Promise<{ error: string | null }> {
  const session = await auth();
  if (!session?.user) return { error: "Unauthorized" };

  try {
    // Extract path from public URL
    const urlObj = new URL(url);
    const parts = urlObj.pathname.split(`/storage/v1/object/public/${bucket}/`);
    const path = parts[1];
    if (!path) return { error: "Invalid URL" };

    const { error } = await supabase.storage.from(bucket).remove([path]);
    if (error) throw error;
    return { error: null };
  } catch (err: any) {
    return { error: err?.message ?? "Delete failed" };
  }
}
