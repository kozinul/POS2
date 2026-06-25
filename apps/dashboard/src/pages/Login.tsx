import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function Login() {
  const [userId, setUserId] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const { login } = useAuth();
  const navigate = useNavigate();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    try {
      await login(userId, password);
      navigate('/');
    } catch {
      setError('ID atau password salah');
    }
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        <div className="bg-white border border-outline-variant rounded-xl shadow-sm p-8">
          <div className="flex flex-col items-center mb-8">
            <div className="w-14 h-14 bg-primary rounded-xl flex items-center justify-center mb-4">
              <span className="material-symbols-outlined text-white text-[32px]" style={{ fontVariationSettings: "'FILL' 1" }}>cloud_done</span>
            </div>
            <h1 className="font-display-sm text-display-sm text-primary font-bold">HQ Central</h1>
            <p className="text-sm text-on-surface-variant mt-1">ENTERPRISE ADMIN</p>
          </div>

          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <div>
              <label className="font-label-sm text-label-sm text-on-surface-variant mb-1 block">User ID</label>
              <input
                placeholder="ADM001"
                value={userId}
                onChange={(e) => setUserId(e.target.value.toUpperCase())}
                required
                className="w-full px-3 py-2 border border-outline-variant rounded-lg font-body-md text-body-md font-mono focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
              />
            </div>
            <div>
              <label className="font-label-sm text-label-sm text-on-surface-variant mb-1 block">Password</label>
              <input
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="w-full px-3 py-2 border border-outline-variant rounded-lg font-body-md text-body-md focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
              />
            </div>

            {error && (
              <div className="flex items-center gap-2 px-3 py-2 bg-error-container/50 rounded-lg">
                <span className="material-symbols-outlined text-error text-[18px]">error</span>
                <p className="text-sm font-semibold text-error">{error}</p>
              </div>
            )}

            <button
              type="submit"
              className="w-full py-3 bg-primary text-white font-bold rounded-lg hover:bg-primary/90 transition-colors shadow-sm mt-2"
            >
              Login
            </button>
          </form>
        </div>

        <p className="text-center text-xs text-outline mt-6">
          Copyright &copy; 2022 — POS, Inc.
        </p>
      </div>
    </div>
  );
}
