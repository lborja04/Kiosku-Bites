import { createContext, useState, useContext, useEffect } from 'react';
import { signOutSupabase } from '@/services/supabaseAuthClient';
import { supabase } from '@/services/supabase';

const AuthContext = createContext(null);

function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;

    const init = async () => {
      try {
        // Check Supabase Auth session first
        const { data, error } = await supabase.auth.getSession();
        if (error) {
          console.warn('Error checking supabase session:', error);
        }

        const sessionUser = data?.session?.user || null;

        if (mounted) {
          if (sessionUser) {
            // Build payload from Auth user metadata
            const payload = {
              email: sessionUser.email,
              nombre: sessionUser?.user_metadata?.full_name || sessionUser.email,
              tipo_usuario: sessionUser?.user_metadata?.tipo_usuario || 'cliente',
            };
            setUser(payload);
            localStorage.setItem('user', JSON.stringify(payload));
          } else {
            // No active session — ensure no stale localStorage login
            setUser(null);
            localStorage.removeItem('user');
          }
          setLoading(false);
        }
      } catch (err) {
        console.error('Auth init error:', err);
        if (mounted) {
          setLoading(false);
        }
      }
    };

    init();

    return () => {
      mounted = false;
    };
  }, []);

  const login = (userData) => {
    setUser(userData);
    localStorage.setItem('user', JSON.stringify(userData));
  };

  const logout = () => {
    // Cerrar sesión en Supabase y limpiar estado
    signOutSupabase()
      .catch((e) => console.warn('Error signing out:', e))
      .finally(() => {
        setUser(null);
        localStorage.removeItem('user');
      });
  };

  return (
    <AuthContext.Provider value={{ user, login, logout, loading }}>
      {children}
    </AuthContext.Provider>
  );
}

function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth debe usarse dentro de AuthProvider');
  }
  return context;
}

export { AuthProvider, useAuth };
