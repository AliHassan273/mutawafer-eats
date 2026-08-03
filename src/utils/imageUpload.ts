import { fetchWithRetry } from './fetchHelper';
import { supabaseConfigured, supabase } from '../lib/supabase';

export async function uploadImageFile(file: File): Promise<string> {
  const dataUrl = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ''));
    reader.onerror = () => reject(new Error('تعذر قراءة الصورة'));
    reader.readAsDataURL(file);
  });
  const comma = dataUrl.indexOf(',');
  const data = comma >= 0 ? dataUrl.slice(comma + 1) : dataUrl;
  if (supabaseConfigured) {
    const { data: result, error } = await supabase.functions.invoke('upload-image', { body: { data, mimeType: file.type || 'image/jpeg', fileName: file.name } });
    if (error || !result?.url) throw new Error(error?.message || result?.error || 'تعذر رفع الصورة');
    return result.url;
  }
  const response = await fetchWithRetry('/api/uploads/image', { method: 'POST', body: JSON.stringify({ data, mimeType: file.type || 'image/jpeg', fileName: file.name }) }, 2, 700);
  const result = await response.json().catch(() => ({}));
  if (!response.ok || !result.url) throw new Error(result.error || 'تعذر رفع الصورة');
  return result.url;
}
