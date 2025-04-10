// Simple authentication utilities for demo purposes

/**
 * Check if a request is authenticated
 * In a real app, you'd verify JWT tokens, session cookies, etc.
 * @param {Request} request - The incoming request object
 * @returns {boolean} Whether the request is authenticated
 */
export const isAuthenticated = (request) => {
  // For demo purposes, always return true
  // In a real app, you'd check cookies, headers, etc.
  return true;
};

/**
 * Get user information from a request
 * In a real app, you'd decode the JWT token or session
 * @param {Request} request - The incoming request object
 * @returns {Object} User information
 */
export const getUserFromRequest = (request) => {
  // For demo purposes, return a mock user
  return {
    id: 'mock_user_id',
    email: 'demo@example.com',
    name: 'Demo User',
    role: 'admin'
  };
};

/**
 * Check if a user has admin privileges
 * @param {Object} user - User object
 * @returns {boolean} Whether the user is an admin
 */
export const isAdmin = (user) => {
  return user?.role === 'admin';
}; 