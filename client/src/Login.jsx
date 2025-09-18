import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from './AuthContext.jsx';
import api from './api';

export default function Login() {
  const { setToken, token } = useAuth();
  const navigate = useNavigate();

  const [mode, setMode] = useState('login'); // 'login' | 'register'
  const [nameInput, setNameInput] = useState('');
  const [usernameInput, setUsernameInput] = useState('');
  const [emailInput, setEmailInput] = useState('');
  const [passwordInput, setPasswordInput] = useState('');
  const [authLoading, setAuthLoading] = useState(false);

  if (token) {
    // Already signed in, bounce back to home
    navigate('/');
  }

  return (
    <div style={{ maxWidth: 420, margin: '40px auto' }}>
      <h1 style={{ marginBottom: 12 }}>Login</h1>
      <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
        <button onClick={() => setMode('login')} style={{ background: mode === 'login' ? '#2d6a4f' : '#888' }}>Login</button>
        <button onClick={() => setMode('register')} style={{ background: mode === 'register' ? '#2d6a4f' : '#888' }}>Register</button>
        <button onClick={() => api.auth.googleStart()} style={{ marginLeft: 'auto' }}>Sign in with Google</button>
      </div>

      {mode === 'login' ? (
        <form
          onSubmit={async (e) => {
            e.preventDefault();
            try {
              setAuthLoading(true);
              const identifier = usernameInput || emailInput;
              const { token: t } = await api.auth.login({ identifier, password: passwordInput });
              setToken(t);
              navigate('/');
            } catch (err) {
              alert(err.message);
            } finally {
              setAuthLoading(false);
            }
          }}
          style={{ display: 'grid', gap: 8 }}
        >
          <input
            type="text"
            placeholder="Username or Email"
            value={usernameInput || emailInput}
            onChange={(e) => {
              setUsernameInput(e.target.value);
              setEmailInput('');
            }}
          />
          <input
            type="password"
            placeholder="Password"
            value={passwordInput}
            onChange={(e) => setPasswordInput(e.target.value)}
          />
          <button type="submit" disabled={authLoading || !(usernameInput || emailInput) || !passwordInput}>
            {authLoading ? 'Signing in...' : 'Login'}
          </button>
        </form>
      ) : (
        <form
          onSubmit={async (e) => {
            e.preventDefault();
            try {
              setAuthLoading(true);
              const { token: t } = await api.auth.register({ name: nameInput, username: usernameInput, email: emailInput, password: passwordInput });
              setToken(t);
              navigate('/');
            } catch (err) {
              alert(err.message);
            } finally {
              setAuthLoading(false);
            }
          }}
          style={{ display: 'grid', gap: 8 }}
        >
          <input
            type="text"
            placeholder="Name (optional)"
            value={nameInput}
            onChange={(e) => setNameInput(e.target.value)}
          />
          <input
            type="text"
            placeholder="Username"
            value={usernameInput}
            onChange={(e) => setUsernameInput(e.target.value)}
            required
          />
          <input
            type="email"
            placeholder="Email (optional)"
            value={emailInput}
            onChange={(e) => setEmailInput(e.target.value)}
          />
          <input
            type="password"
            placeholder="Password"
            value={passwordInput}
            onChange={(e) => setPasswordInput(e.target.value)}
            required
          />
          <button type="submit" disabled={authLoading || !usernameInput || !passwordInput}>
            {authLoading ? 'Creating account...' : 'Register'}
          </button>
        </form>
      )}
    </div>
  );
}
