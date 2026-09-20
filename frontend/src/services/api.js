import axios from 'axios';

// Default to configured base URL, or fallback to relative '/api' which Vite proxies
const BASE_URL = import.meta.env.VITE_API_BASE_URL || '/api';

const apiClient = axios.create({
  baseURL: BASE_URL,
  headers: {
    'Content-Type': 'application/json'
  },
  timeout: 15000
});

// Response interceptor to format errors user-friendly
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    let message = 'Unable to connect to the campus network service.';
    if (error.response) {
      message = error.response.data?.message || error.response.data?.error || `Server returned error (${error.response.status})`;
    } else if (error.code === 'ECONNABORTED') {
      message = 'Campus network request timed out. Please try again.';
    }
    return Promise.reject(new Error(message));
  }
);

export default apiClient;
