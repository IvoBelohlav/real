// src/utils/api.js
import axios from 'axios';
import { getAuthToken, removeAuthToken } from './auth'; // Make sure this path is correct

// Define base API URLs
const LOCAL_API_URL = 'http://localhost:8000/';
const PROD_API_URL = 'https://lermobackend.up.railway.app/';

// Choose the API URL based on environment
const API_URL = process.env.NODE_ENV === 'production' ? PROD_API_URL : LOCAL_API_URL;

// Get API key from initialization or configuration
let apiKey = null;

export const setApiKey = (key) => {
    apiKey = key;
    console.log('API key set for Lermo widget');
};

export const getApiKey = () => apiKey;

const api = axios.create({
    baseURL: API_URL,
    headers: {  
        'Content-Type': 'application/json', // Default Content-Type
    },
});

// Export the base URL for static files
export const getStaticUrl = (path, bustCache = false) => {
    if (path && path.startsWith('static/')) {
        const baseUrl = `${API_URL}${path}`;
        // Add cache busting parameter if requested
        return bustCache ? `${baseUrl}?t=${new Date().getTime()}` : baseUrl;
    }
    return path;
};

// Request interceptor
api.interceptors.request.use(
    async (config) => {
        // Removing the trailing slash addition as it's causing 404 errors
        
        // Remove Content-Type for FormData to let the browser set the correct boundary
        if (config.data instanceof FormData) {
            delete config.headers['Content-Type'];
        }

        // First try API key for widget authentication
        if (apiKey) {
            config.headers['X-Api-Key'] = apiKey;
        } 
        // Fallback to JWT for admin dashboard
        else {
            // Add authentication token if available
            const token = getAuthToken();
            if (token) {
                config.headers['Authorization'] = `Bearer ${token}`;
            }
        }
        
        // Debug logging
        console.log(`API Request: ${config.method?.toUpperCase()} ${config.url}`, { 
            headers: config.headers,
            data: config.data instanceof FormData ? 'FormData (not logged for size)' : config.data
        });
        
        // If there's data in the request, stringify and parse it to ensure clean objects
        if (config.data) {
            try {
                // First stringify the data to remove any circular references
                const jsonString = JSON.stringify(config.data);
                // Then parse it back to a clean object
                config.data = JSON.parse(jsonString);
            } catch (error) {
                console.error('Error preprocessing request data:', error);
            }
        }
        
        // Add a special interceptor for guided flow endpoints to prevent circular references
        if (config.url && config.url.includes('/guided-flows') && config.data) {
            try {
                // Handle PUT and POST requests to guided flows
                if ((config.method === 'put' || config.method === 'post') && config.data.options) {
                    // Process options to prevent any circular references
                    config.data.options = config.data.options.map(option => {
                        // Prevent self-references
                        if (option.next_flow === config.data.name) {
                            console.warn(`Prevented circular reference: option ${option.id} pointing to its own flow ${config.data.name}`);
                            option.next_flow = '';
                        }
                        
                        // Ensure bot_response is properly formatted
                        if (option.bot_response) {
                            // Create a new clean object to avoid reference issues
                            option.bot_response = {
                                text: typeof option.bot_response.text === 'string' ? option.bot_response.text : '',
                                followUp: typeof option.bot_response.followUp === 'string' ? option.bot_response.followUp : ''
                            };
                        } else {
                            option.bot_response = { text: '', followUp: '' };
                        }
                        
                        return option;
                    });
                }
            } catch (error) {
                console.error('Error preprocessing guided flow data:', error);
            }
        }
        
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
            
            // Handle 401 Unauthorized - Token expired or invalid
            if (error.response.status === 401) {
                console.error('Authentication error: Token expired or invalid');
                
                // If using API key, show widget-specific error
                if (apiKey) {
                    throw new Error('Widget API key is invalid or expired. Please contact support.');
                } else {
                    // If using JWT, redirect to login
                    removeAuthToken();
                    window.location.href = '/admin/login'; // Redirect to login
                    throw new Error('Session expired. Please login again.');
                }
            }

            // Handle 422 Validation Error
            if (error.response.status === 422) {
                const detail = error.response.data.detail;
                let errorMessage = 'Validation error'; // Default message

                if (Array.isArray(detail)) {
                    // Handle array of validation errors (FastAPI style)
                    errorMessage = detail.map(err => err.msg || err.loc?.join('.') || 'Unknown error').join('; ');
                } else if (typeof detail === 'object' && detail !== null) {
                    // Handle single object error
                    errorMessage = detail.msg || JSON.stringify(detail);
                } else if (typeof detail === 'string') {
                    errorMessage = detail;
                }

                console.error('Validation Error (422):', {
                    message: errorMessage,
                    detail: detail,
                    fullResponse: error.response.data
                });

                throw new Error(errorMessage);
            }

            // Handle other HTTP errors (400, 403, 404, 500, etc.)
            const defaultErrorMessage = `HTTP Error ${error.response.status}: ${error.response.statusText}`;
            const serverMessage = error.response.data?.detail || error.response.data?.message;
            const errorMessage = serverMessage || defaultErrorMessage;

            console.error('HTTP Error:', {
                status: error.response.status,
                message: errorMessage,
                fullResponse: error.response.data
            });
            throw new Error(errorMessage);

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