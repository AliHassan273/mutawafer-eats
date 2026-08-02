import { fetchWithRetry } from './fetchHelper';

export async function uploadImageFile(file: File): Promise<string> {
  const dataUrl = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ''));
    reader.onerror = () => reject(new Error('تعذر قراءة الصورة'));
    reader.readAsDataURL(file);
  });
  const comma = dataUrl.indexOf(',');
  const data = comma >= 0 ? dataUrl.slice(comma + 1) : dataUrl;
  const response = await fetchWithRetry('/api/uploads/image', {
    method: 'POST',
    body: JSON.stringify({ data, mimeType: file.type || 'image/jpeg', fileName: file.name }),
  }, 2, 700);
  const result = await response.json().catch(() => ({}));
  if (!response.ok || !result.url) throw new Error(result.error || 'تعذر رفع الصورة');
  return result.url;
}
