import type { ReactNode } from 'react';
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { AuthProvider, useAuth } from './auth';
import { EditorPage } from './pages/EditorPage';
import { HomePage } from './pages/HomePage';
import { LoginPage } from './pages/LoginPage';
import { NewPage } from './pages/NewPage';

function Guard({ children }: { children: ReactNode }) {
  const { token } = useAuth();
  if (!token) return <Navigate to="/login" replace />;
  return children;
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route
            path="/"
            element={
              <Guard>
                <HomePage />
              </Guard>
            }
          />
          <Route
            path="/new"
            element={
              <Guard>
                <NewPage />
              </Guard>
            }
          />
          <Route
            path="/c/:id"
            element={
              <Guard>
                <EditorPage />
              </Guard>
            }
          />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
