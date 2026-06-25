import { createContext, useContext, useState, useEffect, ReactNode } from 'react';

interface Outlet { _id: string; name: string }

interface User {
  id: string;
  userId: string;
  name: string;
  email: string;
  role: string;
  outlets?: Outlet[];
  defaultStartingCash?: number;
}

interface AuthContextType {
  user: User | null;
  token: string | null;
  loading: boolean;
  login: (userId: string, password: string) => Promise<void>;
  logout: () => void;
  selectedOutlet: Outlet | null;
  setSelectedOutlet: (o: Outlet) => void;
}

const AuthContext = createContext<AuthContextType>(null!);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(localStorage.getItem('token'));
  const [loading, setLoading] = useState(true);
  const [selectedOutlet, setSelectedOutlet] = useState<Outlet | null>(() => {
    const saved = localStorage.getItem('selectedOutlet');
    return saved ? JSON.parse(saved) : null;
  });

  useEffect(() => {
    if (token) {
      fetch('/api/auth/me', {
        headers: { Authorization: `Bearer ${token}` },
      })
        .then((res) => (res.ok ? res.json() : null))
        .then((data) => {
          if (data) setUser(data);
          else logout();
        })
        .finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, [token]);

  const handleSetSelectedOutlet = (o: Outlet) => {
    setSelectedOutlet(o);
    localStorage.setItem('selectedOutlet', JSON.stringify(o));
  };

  async function login(userId: string, password: string) {
    const res = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId, password }),
    });
    if (!res.ok) throw new Error('Login failed');
    const data = await res.json();
    localStorage.setItem('token', data.token);
    setToken(data.token);
    setUser(data.user);
  }

  function logout() {
    localStorage.removeItem('token');
    localStorage.removeItem('selectedOutlet');
    setToken(null);
    setUser(null);
    setSelectedOutlet(null);
  }

  return (
    <AuthContext.Provider value={{ user, token, loading, login, logout, selectedOutlet, setSelectedOutlet: handleSetSelectedOutlet }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
