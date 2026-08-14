import { supabase } from '../lib/supabase';
import { extractFunctionErrorMessage } from './functionError';

export async function uploadImageFile(file: File): Promise<string> {
  const dataUrl = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ''));
    reader.onerror = () => reject(new Error('تعذر قراءة الصورة'));
    reader.readAsDataURL(file);
  });
  const comma = dataUrl.indexOf(',');
  const data = comma >= 0 ? dataUrl.slice(comma + 1) : dataUrl;
  const cloudName = (import.meta as any).env?.VITE_CLOUDINARY_CLOUD_NAME;
  const uploadPreset = (import.meta as any).env?.VITE_CLOUDINARY_UPLOAD_PRESET;
  if (cloudName && uploadPreset) {
    const form = new FormData();
    form.append('file', file);
    form.append('upload_preset', uploadPreset);
    form.append('folder', 'mutawafer-eats');
    const cloudResponse = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/image/upload`, { method: 'POST', body: form });
    const cloudResult = await cloudResponse.json().catch(() => ({}));
    if (!cloudResponse.ok || !cloudResult.secure_url) throw new Error(cloudResult.error?.message || 'تعذر رفع الصورة إلى Cloudinary');
    return cloudResult.secure_url;
  }
  const { data: result, error } = await supabase.functions.invoke('upload-image', { body: { data, mimeType: file.type || 'image/jpeg', fileName: file.name } });
  if (error) throw new Error(await extractFunctionErrorMessage(error, 'تعذر رفع الصورة.'));
  if (!result?.url) throw new Error(result?.error || 'تعذر رفع الصورة');
  return result.url;
}
