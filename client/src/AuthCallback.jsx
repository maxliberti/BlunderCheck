import React, { useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from './AuthContext';

export default function AuthCallback() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const { setToken } = useAuth();

  useEffect(() => {
    const token = params.get('token');
    const error = params.get('error');
    if (token) {
      setToken(token);
      navigate('/review', { replace: true });
    } else {
      navigate('/', { replace: true, state: { error: error || 'Login failed' } });
    }
  }, [params, setToken, navigate]);

  return <p>Signing you in...</p>;
}
