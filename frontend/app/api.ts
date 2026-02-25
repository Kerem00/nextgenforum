import axios from "axios";

// Defaults for local development if environment variables are not set
const USERS_API_URL = import.meta.env.VITE_USERS_API_URL || "http://localhost:8001";
const POSTS_API_URL = import.meta.env.VITE_POSTS_API_URL || "http://localhost:8002";

export const usersClient = axios.create({
    baseURL: USERS_API_URL,
});

export const postsClient = axios.create({
    baseURL: POSTS_API_URL,
});

const authInterceptor = (config: any) => {
    const token = localStorage.getItem("token");
    if (token) {
        config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
};

// Apply auth headers mainly to POSTs client, but added to usersClient as well in case of protected user routes
postsClient.interceptors.request.use(authInterceptor);
usersClient.interceptors.request.use(authInterceptor);
