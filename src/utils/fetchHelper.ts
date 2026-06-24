// ============================================================
// 🌐  fetchHelper.ts — الإصدار النهائي
// ============================================================

const TOKEN_KEY = "mutafer_auth_token";

export function saveToken(token: string) {
  localStorage.setItem(TOKEN_KEY, token);
}

export function clearToken() {
  localStorage.removeItem(TOKEN_KEY);
}

export function getToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}

// ✅ دقيقة جداً في تحديد نوع المحتوى
function needsJsonContentType(body: RequestInit["body"]): boolean {
  if (!body) return false;
  if (body instanceof FormData) return false;
  if (body instanceof Blob) return false;
  if (body instanceof ArrayBuffer) return false;
  if (body instanceof URLSearchParams) return false;
  if (typeof body === "string") {
    try { JSON.parse(body); return true; }
    catch { return false; }
  }
  return false;
}

export async function fetchWithRetry(
  url: string,
  options?: RequestInit,
  retries = 5,
  baseDelay = 400
): Promise<Response> {
  const token = getToken();

  // بناء الهيدر
  const headers: Record<string, string> = {
    ...(options?.headers as Record<string, string> || {}),
  };
  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  // تحويل body إلى JSON إذا كان كائن (وليس FormData/Blob)
  let bodyToSend = options?.body;
  if (
    options?.body &&
    typeof options.body === "object" &&
    !(options.body instanceof FormData) &&
    !(options.body instanceof Blob)
  ) {
    bodyToSend = JSON.stringify(options.body);
  }

  // إضافة Content-Type فقط إذا كان JSON
  if (needsJsonContentType(bodyToSend)) {
    headers["Content-Type"] = "application/json";
  }

  const finalOptions: RequestInit = { ...options, body: bodyToSend, headers };

  for (let i = 0; i < retries; i++) {
    try {
      const response = await fetch(url, finalOptions);

      if (response.ok) return response;

      if (response.status === 401) {
        clearToken();
        return response;
      }

      if (response.status >= 500 && i < retries - 1) {
        const delay = baseDelay * Math.pow(1.5, i);
        console.warn(`[Fetch Retry] ${response.status} for ${url}. Retry ${i + 1}/${retries}`);
        await new Promise(r => setTimeout(r, delay));
        continue;
      }

      return response;
    } catch (error) {
      if (i === retries - 1) throw error;
      const delay = baseDelay * Math.pow(1.5, i);
      console.warn(`[Fetch Retry] Connection failed to ${url}. Retry ${i + 1}/${retries}`);
      await new Promise(r => setTimeout(r, delay));
    }
  }

  throw new Error(`fetchWithRetry: failed after ${retries} attempts for ${url}`);
}