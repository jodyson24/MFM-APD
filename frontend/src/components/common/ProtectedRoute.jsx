import React from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../../context/index.js';
import Loading from '../ui/Loading.jsx';

const ProtectedRoute = () => {
  const { user, loading } = useAuth();
  if (loading) return <Loading full label="Checking your session…" />;
  return user ? <Outlet /> : <Navigate to="/login" replace />;
};

export default ProtectedRoute;
