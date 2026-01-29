import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';

export type UserRole = 'admin' | 'vendor';

export interface User {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  organization_id: string;
  whatsapp_connected: boolean;
  whatsapp_session_id?: string;
  avatar_url?: string;
  created_at: string;
}

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  updateUser: (updates: Partial<User>) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Mock user for demo purposes
const mockAdminUser: User = {
  id: '1',
  email: 'admin@proposalflow.com',
  name: 'Carlos Silva',
  role: 'admin',
  organization_id: 'org-1',
  whatsapp_connected: true,
  whatsapp_session_id: 'session-123',
  created_at: new Date().toISOString(),
};

const mockVendorUser: User = {
  id: '2',
  email: 'vendor@proposalflow.com',
  name: 'Ana Santos',
  role: 'vendor',
  organization_id: 'org-1',
  whatsapp_connected: false,
  created_at: new Date().toISOString(),
};

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Simulate checking for stored session
    const storedUser = localStorage.getItem('proposalflow_user');
    if (storedUser) {
      setUser(JSON.parse(storedUser));
    }
    setIsLoading(false);
  }, []);

  const login = async (email: string, password: string) => {
    setIsLoading(true);
    // Simulate API call
    await new Promise((resolve) => setTimeout(resolve, 1000));

    // Demo login logic
    let loggedInUser: User;
    if (email.includes('admin')) {
      loggedInUser = mockAdminUser;
    } else {
      loggedInUser = mockVendorUser;
    }

    setUser(loggedInUser);
    localStorage.setItem('proposalflow_user', JSON.stringify(loggedInUser));
    setIsLoading(false);
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem('proposalflow_user');
  };

  const updateUser = (updates: Partial<User>) => {
    if (user) {
      const updatedUser = { ...user, ...updates };
      setUser(updatedUser);
      localStorage.setItem('proposalflow_user', JSON.stringify(updatedUser));
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoading,
        isAuthenticated: !!user,
        login,
        logout,
        updateUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
