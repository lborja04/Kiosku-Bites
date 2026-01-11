import React, { createContext, useState, useContext, useEffect } from 'react';
import { supabase } from '@/services/supabaseAuthClient';

const AuthContext = createContext(null);

function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true); // IMPORTANTE: Inicia en true

  // Esta función busca los datos reales en la tabla 'usuario' de tu base de datos
  const fetchRealUserData = async (authUser) => {
    if (!authUser) return null;

    try {
        // Buscamos el usuario en la tabla SQL usando su ID de autenticación
        const { data: dbUser, error } = await supabase
            .from('usuario')
            .select('*')
            .eq('id_auth_supabase', authUser.id)
            .single();
        
        if (error && error.code !== 'PGRST116') {
             console.warn("No se pudieron obtener detalles de la tabla usuario:", error.message);
        }

        // Metadata de respaldo por si falla la BD
        const meta = authUser.user_metadata || {};

        const realName = dbUser?.nombre || meta.nombre || meta.full_name || authUser.email;
        const realRole = dbUser?.tipo_usuario || meta.tipo_usuario || 'cliente';

        return {
            id: authUser.id, // ID de Auth (UUID)
            db_id: dbUser?.id_usuario, // ID Numérico de la BD
            email: authUser.email,
            nombre: realName,
            name: realName, // Alias para compatibilidad
            tipo_usuario: realRole,
            type: realRole, // Alias
            estado: dbUser?.estado || 'Activo',
            user_metadata: meta
        };

    } catch (err) {
        console.error("Error inesperado fetching user data:", err);
        return {
            id: authUser.id,
            email: authUser.email,
            name: authUser.email,
            type: 'cliente'
        };
    }
  };

  useEffect(() => {
    // 1. Función encargada de orquestar la carga y setear el estado
    const loadSession = async (sessionUser) => {
        if (!sessionUser) {
            setUser(null);
            setLoading(false);
            return;
        }
        
        const completeUser = await fetchRealUserData(sessionUser);
        setUser(completeUser);
        setLoading(false); // Aquí termina la carga y quita el spinner
    };

    // 2. Verificación inicial (Carga rápida al abrir la app)
    supabase.auth.getSession().then(({ data: { session } }) => {
        loadSession(session?.user);
    });

    // 3. Escuchador de eventos (Login, Logout, LINK DE CORREO, Auto-Refresh)
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      console.log("Auth Event:", event); // Debug útil
      
      if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED' || event === 'USER_UPDATED') {
        // Cuando das clic en el correo, ocurre un evento SIGNED_IN
        loadSession(session?.user);
      } else if (event === 'SIGNED_OUT') {
        setUser(null);
        setLoading(false);
      } else if (event === 'INITIAL_SESSION') {
        // Maneja casos donde la sesión ya existe al montar
        loadSession(session?.user);
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  // Login manual
  const login = (userData) => {
    setUser(userData);
  };

  const logout = async () => {
    try {
      await supabase.auth.signOut();
      setUser(null);
    } catch (error) {
      console.error("Error al cerrar sesión:", error);
    }
  };

  // --- SOLUCIÓN VISUAL: SPINNER DE CARGA ---
  // Si loading es true, mostramos esto EN LUGAR de la app.
  // Esto evita que se renderice el Dashboard o el Login antes de tiempo.
  if (loading) {
    return (
      <div className="h-screen w-full flex items-center justify-center bg-gray-50">
        <div className="flex flex-col items-center gap-4">
            {/* Spinner animado con Tailwind */}
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
            <p className="text-gray-500 font-medium animate-pulse text-sm">Verificando sesión...</p>
        </div>
      </div>
    );
  }

  return (
    <AuthContext.Provider value={{ user, login, logout, loading }}>
      {children}
    </AuthContext.Provider>
  );
}

function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth debe usarse dentro de AuthProvider');
  return context;
}

export { AuthProvider, useAuth };