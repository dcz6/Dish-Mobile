import axios from "axios";

// Access the environment variable
const API_URL = process.env.EXPO_PUBLIC_API_URL || "http://localhost:5000/api";

export const api = axios.create({
  baseURL: API_URL,
  headers: {
    "Content-Type": "application/json",
  },
});

// Add a response interceptor to handle errors globally if needed
api.interceptors.response.use(
  (response) => response,
  (error) => {
    // You can add global error logging here
    console.error("API Error:", error.response?.data || error.message);
    return Promise.reject(error);
  }
);
