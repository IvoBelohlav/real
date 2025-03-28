// src/middleware/AdminRoute.jsx
import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { getAuthToken } from '../utils/auth';

const AdminRoute = ({ children }) => {
  const token = getAuthToken();
  const location = useLocation();

  if (!token) {
    return <Navigate to="/admin/login" state={{ from: location }} replace />;
  }

  return children;
};

export default AdminRoute;