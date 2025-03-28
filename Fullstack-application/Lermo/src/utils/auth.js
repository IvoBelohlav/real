const AUTH_TOKEN_KEY = 'auth_token';
const REFRESH_TOKEN_KEY = 'refresh_token';

// Consistent naming and exports
export const setAuthToken = (token) => {
    localStorage.setItem(AUTH_TOKEN_KEY, token);
};

export const getAuthToken = () => {
    return localStorage.getItem(AUTH_TOKEN_KEY);
};

export const setRefreshToken = (token) => {
    localStorage.setItem(REFRESH_TOKEN_KEY, token);
};

export const getRefreshToken = () => {
    return localStorage.getItem(REFRESH_TOKEN_KEY);
};

export const removeAuthToken = () => {
    localStorage.removeItem(AUTH_TOKEN_KEY);
    localStorage.removeItem(REFRESH_TOKEN_KEY);
};

export const isAuthenticated = () => {
    return !!getAuthToken();
};

export const refreshToken = async () => {
    try {
        const refreshToken = getRefreshToken();
        if (!refreshToken) throw new Error('No refresh token available');

        const response = await fetch('/api/auth/refresh', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${refreshToken}`
            }
        });

        if (!response.ok) throw new Error('Token refresh failed');

        const { access_token, refresh_token } = await response.json();
        setAuthToken(access_token);
        if (refresh_token) setRefreshToken(refresh_token);
        return access_token;
    } catch (error) {
        removeAuthToken();
        throw error;
    }
};