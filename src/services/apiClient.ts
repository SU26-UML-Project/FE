import axios from 'axios';

const apiClient = axios.create({
  baseURL: 'http://localhost:8088/api/uml',
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Response interceptor to handle the standard envelope: { code, message, result }
apiClient.interceptors.response.use(
  (response) => {
    const { code, message, result } = response.data;
    
    // Backend returns 200 even for business errors, but code field tells the truth
    if (code !== 200 && code !== 0) {
      return Promise.reject({
        code,
        message: message || 'Đã có lỗi xảy ra',
        result
      });
    }
    
    return response.data; // Return the whole envelope so we can access result/code/message in services
  },
  (error) => {
    // Handle HTTP errors (4xx, 5xx)
    const apiError = {
      code: error.response?.data?.code || 500,
      message: error.response?.data?.message || error.message || 'Lỗi kết nối server',
    };
    return Promise.reject(apiError);
  }
);

export default apiClient;
