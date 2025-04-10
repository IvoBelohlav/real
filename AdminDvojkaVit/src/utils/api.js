import axios from 'axios';

console.log("--- Loading simplified utils/api.js ---");

// Create a very basic axios instance
const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000',
  headers: {
    'Content-Type': 'application/json',
  },
});

console.log("--- Basic api instance created ---", api ? "OK" : "Failed");

// Use named export
export { api };
