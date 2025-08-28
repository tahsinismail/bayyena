import { createContext, useState, type ReactNode, useEffect } from 'react';
import axios from 'axios';

interface User {
  id: number;
  email: string;
  fullName: string; // Add this
  phoneNumber?: string; // Add this (optional)
  role: string; // Add role field
}

interface AuthContextType {
  user: User | null;
  setUser: (user: User | null) => void;
  isLoading: boolean;
}

export const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Check the session status when the app loads
    const checkAuthStatus = async () => {
      try {
        const { data } = await axios.get('/api/auth/status');
        setUser(data.user);
      } catch (error) {
        setUser(null);
      } finally {
        setIsLoading(false);
      }
    };
    checkAuthStatus();
  }, []);

  return (
    <AuthContext.Provider value={{ user, setUser, isLoading }}>
      {children}
    </AuthContext.Provider>
  );
};
