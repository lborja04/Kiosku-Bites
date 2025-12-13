import React, { createContext, useState, useContext, useEffect } from 'react';
import { supabase } from '@/services/supabaseAuthClient';

const AuthContext = createContext(null);

function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

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

        // AQUÍ ESTÁ EL ARREGLO: Priorizamos el nombre de la BD (dbUser.nombre)
        // Si no hay DB, usamos metadata, si no hay metadata, usamos email.
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
        // Retorno de emergencia con datos básicos de auth
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
        // No ponemos setLoading(true) aquí para evitar parpadeos en refrescos
        const completeUser = await fetchRealUserData(sessionUser);
        setUser(completeUser);
        setLoading(false);
    };

    // 2. Verificación inicial
    supabase.auth.getSession().then(({ data: { session } }) => {
        loadSession(session?.user);
    });

    // 3. Escuchador de eventos (Login, Logout, Auto-Refresh)
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED' || event === 'USER_UPDATED') {
        loadSession(session?.user);
      } else if (event === 'SIGNED_OUT') {
        setUser(null);
        setLoading(false);
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);


  // Login manual (actualiza estado rápido mientras se verifican datos en segundo plano si es necesario)
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

  return (
    <AuthContext.Provider value={{ user, login, logout, loading }}>
      {!loading && children}
    </AuthContext.Provider>
  );
}

function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth debe usarse dentro de AuthProvider');
  return context;
}

export { AuthProvider, useAuth };