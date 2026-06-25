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
    <div className="min-h-screen bg-[#F3F4F6] flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        <div className="bg-white border border-gray-200 rounded-xl shadow-sm p-8">
          <div className="flex flex-col items-center mb-8">
            <div className="w-14 h-14 bg-[#2176D2] rounded-xl flex items-center justify-center mb-4">
              <span className="material-symbols-outlined text-white text-[32px]" style={{ fontVariationSettings: "'FILL' 1" }}>point_of_sale</span>
            </div>
            <h1 className="text-2xl font-bold text-[#2176D2]">POS Kasir</h1>
            <p className="text-sm text-gray-500 mt-1">LOGIN KASIR</p>
          </div>

          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <div>
              <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1 block">User ID</label>
              <input
                placeholder="CSH001"
                value={userId}
                onChange={(e) => setUserId(e.target.value.toUpperCase())}
                required
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm font-mono focus:outline-none focus:ring-2 focus:ring-[#2176D2]/20 focus:border-[#2176D2] transition-all"
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1 block">Password</label>
              <input
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#2176D2]/20 focus:border-[#2176D2] transition-all"
              />
            </div>

            {error && (
              <div className="flex items-center gap-2 px-3 py-2 bg-red-50 rounded-lg">
                <span className="material-symbols-outlined text-red-500 text-[18px]">error</span>
                <p className="text-sm font-semibold text-red-500">{error}</p>
              </div>
            )}

            <button
              type="submit"
              className="w-full py-3 bg-[#2176D2] text-white font-bold rounded-lg hover:opacity-90 transition-opacity mt-2"
            >
              Login
            </button>
          </form>
        </div>

        <p className="text-center text-xs text-gray-400 mt-6">
          Copyright &copy; 2022 — POS, Inc.
        </p>
      </div>
    </div>
  );
}
