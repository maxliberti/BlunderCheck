import './App.css';
import {BrowserRouter, Routes, Route, Navigate, Link, useNavigate} from "react-router-dom";
import GameReviewChessboard from "./Chessboard.jsx";
import { AuthProvider, useAuth } from './AuthContext.jsx';
import AuthCallback from './AuthCallback.jsx';
import Login from './Login.jsx';

function AppShell() {
  const { token, setToken } = useAuth();
  const navigate = useNavigate();
  return (
    <div>
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 16px', borderBottom: '1px solid #5a4f45' }}>
        <Link
          to="/"
          style={{
            textDecoration: 'none',
            color: '#ffffff',
            fontWeight: 700,
            textShadow:
              '1px 1px 0 #2d6a4f, -1px 1px 0 #2d6a4f, 1px -1px 0 #2d6a4f, -1px -1px 0 #2d6a4f'
          }}
        >
          BlunderCheck
        </Link>
        <nav>
          {!token ? (
            <Link to="/login" aria-label="Login" title="Login" style={{ fontSize: 20, textDecoration: 'none' }}>👤</Link>
          ) : (
            <button onClick={() => { setToken(''); navigate('/'); }}>Sign out</button>
          )}
        </nav>
      </header>
      <main style={{ padding: 16 }}>
        <Routes>
          <Route path='/' element={<GameReviewChessboard />}></Route>
          <Route path='/login' element={<Login />}></Route>
          <Route path='/review' element={<Navigate to="/" replace />}></Route>
          <Route path='/auth/callback' element={<AuthCallback />}></Route>
        </Routes>
      </main>
    </div>
  );
}

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AppShell />
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;
