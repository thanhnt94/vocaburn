import axios from 'axios'

export const apiClient = axios.create({
  baseURL: '',
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
  },
})

// Global response interceptor for handling 401 Unauthorized redirect
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // If unauthorized on protected API call, notify or handle redirect
      console.warn('API returned 401 Unauthorized')
    }
    return Promise.reject(error)
  }
)

export default apiClient
