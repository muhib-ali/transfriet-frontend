// src/lib/api-client.ts
import axios from "axios";
import Cookies from "js-cookie";

const apiClient = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL, // should be http://localhost:5005 (for direct) OR http://localhost:3000/api (for proxy)
  headers: { "Content-Type": "application/json" },
});

// Debug: baseURL
if (typeof window !== "undefined") {
  console.log("[apiClient] baseURL =", apiClient.defaults.baseURL);
}

// Request debug + token attach
apiClient.interceptors.request.use(
  (config) => {
    const token = Cookies.get("access_token");
    if (token) config.headers.Authorization = `Bearer ${token}`;

    // DEBUG: print the final URL
    const full = (config.baseURL ?? "") + (config.url ?? "");
    console.log("[apiClient][request]", config.method?.toUpperCase(), full);
    return config;
  },
  (error) => Promise.reject(error)
);

// Response debug
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    const url = (error?.config?.baseURL ?? "") + (error?.config?.url ?? "");
    console.log("[apiClient][error] url:", url);
    console.log("[apiClient][error] message:", error?.message);
    console.log("[apiClient][error] status:", error?.response?.status);
    console.log("[apiClient][error] data:", error?.response?.data);

    // If unauthorized (likely expired token), clear auth and redirect to login
    if (error?.response?.status === 401) {
      try {
        Cookies.remove("access_token", { path: "/" });
        Cookies.remove("refresh_token", { path: "/" });
        if (typeof window !== "undefined") {
          localStorage.removeItem("user");
          localStorage.removeItem("permissions");
          window.location.href = "/login";
        }
      } catch (e) {
        console.error("[apiClient] failed to clear auth on 401:", e);
      }
    }
    return Promise.reject(error);
  }
);

export default apiClient;
