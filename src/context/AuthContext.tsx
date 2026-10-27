import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { UserAccount, AuthResponse } from '../types';

interface AuthContextType {
  user: UserAccount | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  isAuthModalOpen: boolean;
  authModalTab: 'login' | 'register' | 'verify';
  pendingVerifyEmail: string | null;
  openAuthModal: (tab?: 'login' | 'register' | 'verify', pendingEmail?: string) => void;
  closeAuthModal: () => void;
  login: (identifier: string, pass: string) => Promise<AuthResponse>;
  register: (username: string, email: string, pass: string, institution?: string, major?: string) => Promise<AuthResponse>;
  verifyCode: (emailOrUser: string, code: string) => Promise<AuthResponse>;
  resendCode: (emailOrUser: string) => Promise<AuthResponse>;
  logout: () => Promise<void>;
  updateUserLocal: (updates: Partial<UserAccount>) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const TOKEN_KEY = 'noetic_auth_token_v1';
const USER_KEY = 'noetic_auth_user_v1';

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [token, setToken] = useState<string | null>(() => {
    try {
      return localStorage.getItem(TOKEN_KEY);
    } catch {
      return null;
    }
  });

  const [user, setUser] = useState<UserAccount | null>(() => {
    try {
      const raw = localStorage.getItem(USER_KEY);
      if (raw) return JSON.parse(raw);
    } catch {}
    return null;
  });

  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState<boolean>(false);
  const [authModalTab, setAuthModalTab] = useState<'login' | 'register' | 'verify'>('login');
  const [pendingVerifyEmail, setPendingVerifyEmail] = useState<string | null>(null);

  // Validate session on mount
  useEffect(() => {
    const checkSession = async () => {
      const savedToken = localStorage.getItem(TOKEN_KEY);
      if (savedToken) {
        try {
          const res = await fetch('/api/auth/me', {
            headers: { Authorization: `Bearer ${savedToken}` }
          });
          if (res.ok) {
            const data = await res.json();
            if (data.user) {
              setUser(data.user);
              localStorage.setItem(USER_KEY, JSON.stringify(data.user));
            }
          } else {
            // Invalid token
            localStorage.removeItem(TOKEN_KEY);
            setToken(null);
          }
        } catch (err) {
          console.warn('Session verification error:', err);
        }
      }
      setIsLoading(false);
    };

    checkSession();
  }, []);

  const openAuthModal = (tab: 'login' | 'register' | 'verify' = 'login', pendingEmail?: string) => {
    setAuthModalTab(tab);
    if (pendingEmail) setPendingVerifyEmail(pendingEmail);
    setIsAuthModalOpen(true);
  };

  const closeAuthModal = () => {
    setIsAuthModalOpen(false);
  };

  const login = async (identifier: string, pass: string): Promise<AuthResponse> => {
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ identifier, password: pass })
      });
      const data: AuthResponse = await res.json();

      if (data.requiresVerification) {
        setPendingVerifyEmail(data.email || identifier);
        setAuthModalTab('verify');
        return data;
      }

      if (data.success && data.token && data.user) {
        setToken(data.token);
        setUser(data.user);
        try {
          localStorage.setItem(TOKEN_KEY, data.token);
          localStorage.setItem(USER_KEY, JSON.stringify(data.user));
        } catch {}
        closeAuthModal();
      }

      return data;
    } catch (err: any) {
      return { success: false, error: err.message || 'Login connection failed.' };
    }
  };

  const register = async (
    username: string,
    email: string,
    pass: string,
    institution?: string,
    major?: string
  ): Promise<AuthResponse> => {
    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, email, password: pass, institution, major })
      });
      const data: AuthResponse = await res.json();

      if (data.requiresVerification) {
        setPendingVerifyEmail(email);
        setAuthModalTab('verify');
      }

      return data;
    } catch (err: any) {
      return { success: false, error: err.message || 'Registration connection failed.' };
    }
  };

  const verifyCode = async (emailOrUser: string, code: string): Promise<AuthResponse> => {
    try {
      const res = await fetch('/api/auth/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ emailOrUsername: emailOrUser, code })
      });
      const data: AuthResponse = await res.json();

      if (data.success && data.token && data.user) {
        setToken(data.token);
        setUser(data.user);
        try {
          localStorage.setItem(TOKEN_KEY, data.token);
          localStorage.setItem(USER_KEY, JSON.stringify(data.user));
        } catch {}
        closeAuthModal();
      }

      return data;
    } catch (err: any) {
      return { success: false, error: err.message || 'Verification connection failed.' };
    }
  };

  const resendCode = async (emailOrUser: string): Promise<AuthResponse> => {
    try {
      const res = await fetch('/api/auth/resend-code', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ emailOrUsername: emailOrUser })
      });
      const data: AuthResponse = await res.json();
      return data;
    } catch (err: any) {
      return { success: false, error: err.message || 'Resend code failed.' };
    }
  };

  const logout = async () => {
    if (token) {
      try {
        await fetch('/api/auth/logout', {
          method: 'POST',
          headers: { Authorization: `Bearer ${token}` }
        });
      } catch {}
    }
    setToken(null);
    setUser(null);
    try {
      localStorage.removeItem(TOKEN_KEY);
      localStorage.removeItem(USER_KEY);
    } catch {}
  };

  const updateUserLocal = (updates: Partial<UserAccount>) => {
    if (!user) return;
    const updated = { ...user, ...updates };
    setUser(updated);
    try {
      localStorage.setItem(USER_KEY, JSON.stringify(updated));
    } catch {}
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        isAuthenticated: Boolean(user && user.isVerified),
        isLoading,
        isAuthModalOpen,
        authModalTab,
        pendingVerifyEmail,
        openAuthModal,
        closeAuthModal,
        login,
        register,
        verifyCode,
        resendCode,
        logout,
        updateUserLocal
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
