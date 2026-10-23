const API_BASE_URL = "/api"; // Relativ URL via nginx proxy

// Hent token frå localStorage
const getToken = () => localStorage.getItem("jwt_token");

export const apiClient = {
  async request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const isFormData = typeof FormData !== "undefined" && options.body instanceof FormData;

    const headers: Record<string, string> = {
      ...(isFormData ? {} : { "Content-Type": "application/json" }),
      ...(options.headers as Record<string, string> || {}),
    };

    // Legg alltid til JWT-token dersom brukaren er innlogga (inkludert GET for brukar-isolasjon og FormData-POST)
    const token = getToken();
    if (token) {
      headers["Authorization"] = `Bearer ${token}`;
    }

    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      ...options,
      headers,
    });

    if (response.status === 401 && !endpoint.startsWith("/auth/")) {
      localStorage.removeItem("jwt_token");
      localStorage.removeItem("jwt_user");
      window.location.reload();
      throw new Error("Session expired");
    }

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(errorText || `API Error: ${response.status}`);
    }

    if (response.status === 204) {
      return {} as T;
    }

    return response.json();
  },

  get: <T>(endpoint: string) => apiClient.request<T>(endpoint, { method: "GET" }),
  post: <T>(endpoint: string, body: any) =>
    apiClient.request<T>(endpoint, { method: "POST", body: JSON.stringify(body) }),
  postForm: <T>(endpoint: string, formData: FormData) =>
    apiClient.request<T>(endpoint, { method: "POST", body: formData }),
  put: <T>(endpoint: string, body: any) =>
    apiClient.request<T>(endpoint, { method: "PUT", body: JSON.stringify(body) }),
  delete: <T>(endpoint: string) => apiClient.request<T>(endpoint, { method: "DELETE" }),
};
