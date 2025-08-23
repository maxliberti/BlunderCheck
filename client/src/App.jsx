import './App.css';
import {BrowserRouter, Routes, Route, Navigate} from "react-router-dom";
import GameReviewChessboard from "./Chessboard.jsx";
import { AuthProvider } from './AuthContext.jsx';
import AuthCallback from './AuthCallback.jsx';

function App() {

  return (
    <div>
        <BrowserRouter>
          <AuthProvider>
            <Routes>
                <Route path='/' element={<GameReviewChessboard />}></Route>
                <Route path='/review' element={<Navigate to="/" replace />}></Route>
                <Route path='/auth/callback' element={<AuthCallback />}></Route>
            </Routes>
          </AuthProvider>
        </BrowserRouter>
    </div>
  );
}

export default App;
