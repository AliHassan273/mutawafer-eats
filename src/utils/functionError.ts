// عند فشل Supabase Edge Function (رد بكود غير 2xx)، الـ SDK بيرمي خطأ عام
// "Edge Function returned a non-2xx status code" بدل الرسالة الحقيقية اللي رجعتها الدالة.
// الدالة دي بتقرأ الرسالة الحقيقية من جسم الرد نفسه.
export async function extractFunctionErrorMessage(error: any, fallback = 'حصل خطأ غير متوقع، حاول تاني.'): Promise<string> {
  if (!error) return fallback;
  try {
    const response: Response | undefined = error.context;
    if (response && typeof response.clone === 'function') {
      const body = await response.clone().json().catch(() => null);
      if (body?.error) return String(body.error);
      if (body?.message) return String(body.message);
    }
  } catch {
    // تجاهل، وارجع للرسالة الافتراضية
  }
  return error.message && error.message !== 'Edge Function returned a non-2xx status code'
    ? error.message
    : fallback;
}
