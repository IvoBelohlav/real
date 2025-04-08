// src/utils/api.js
import axios from 'axios';
import { getAuthToken, removeAuthToken } from './auth'; // Make sure this path is correct

const API_URL = 'https://fastapi-production-ccae.up.railway.app/';//https://fastapi-production-ccae.up.railway.app/
const api = axios.create({    baseURL: API_URL,
    headers: {  
        'Content-Type': 'application/json', // Default Content-Type
    },
});

// Request interceptor
api.interceptors.request.use(
    async (config) => {
        // IMPORTANT: We'll keep the trailing slash logic since your backend requires it
        // Add trailing slash if not present AND it's not a file request (no .)
        if (!config.url.endsWith('/') && !config.url.includes('.')) {
            config.url += '/';
        }

        // VERY IMPORTANT: Remove Content-Type for FormData. Let the browser set it.
        if (config.data instanceof FormData) {
            delete config.headers['Content-Type'];
        }

        const token = getAuthToken();
        if (token) {
            config.headers['Authorization'] = `Bearer ${token}`;
        }
        
        // Add debug logging
        console.log(`API Request: ${config.method?.toUpperCase()} ${config.url}`, { 
            headers: config.headers,
            data: config.data
        });
        
        return config;
    },
    (error) => {
        console.error('Request interceptor error:', error);
        return Promise.reject(error);
    }
);

// Response interceptor
api.interceptors.response.use(
    (response) => {
        // Log successful responses for debugging
        console.log(`API Response (${response.status}):`, {
            url: response.config.url,
            data: response.data,
        });
        return response;
    },
    async (error) => {
        if (error.response) {
            console.error(`API Error (${error.response.status}):`, {
                url: error.config?.url,
                data: error.response?.data,
                status: error.response?.status,
                statusText: error.response?.statusText
            });
            
            // Handle 401 Unauthorized
            if (error.response.status === 401) {
                console.error('Authentication error: Token expired or invalid');
                removeAuthToken();
                window.location.href = '/admin/login'; // Redirect to login
                // Optionally throw a specific error, or let the caller handle it
                throw new Error('Session expired. Please login again.');
            }

            // Handle 422 Validation Error - IMPROVED
            if (error.response.status === 422) {
                const detail = error.response.data.detail;
                let errorMessage = 'Validation error'; // Default message

                if (Array.isArray(detail)) {
                    // Handle array of validation errors (FastAPI style)
                    errorMessage = detail.map(err => err.msg || err.loc?.join('.') || 'Unknown error').join('; ');
                } else if (typeof detail === 'object' && detail !== null) {
                    // Handle single object error (might be a string, or have 'msg')
                    errorMessage = detail.msg || JSON.stringify(detail);
                } else if (typeof detail === 'string') {
                    errorMessage = detail;
                }

                console.error('Validation Error (422):', {
                    message: errorMessage,
                    detail: detail,
                    fullResponse: error.response.data // Log the full response
                });

                throw new Error(errorMessage); // Throw a consistent error message
            }

            // Handle other HTTP errors (400, 403, 404, 500, etc.)
            // You might want to customize this based on your API's error structure
            const defaultErrorMessage = `HTTP Error ${error.response.status}: ${error.response.statusText}`;
            const serverMessage = error.response.data?.detail || error.response.data?.message;
            const errorMessage = serverMessage || defaultErrorMessage;

            console.error('HTTP Error:', {
                status: error.response.status,
                message: errorMessage,
                fullResponse: error.response.data // Log entire response
            });
            throw new Error(errorMessage); // Throw a consistent error message

        } else if (error.request) {
            // The request was made but no response was received
            console.error("Network Error (No Response):", error.request);
            throw new Error('No response received from the server. Please check your network connection.');
        } else {
            // Something happened in setting up the request that triggered an Error
            console.error('Request Setup Error:', error.message);
            throw new Error('An error occurred while setting up the request: ' + error.message);
        }
    }
);

export default api;