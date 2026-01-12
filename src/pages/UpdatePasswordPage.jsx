import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/services/supabaseAuthClient';
import { Button } from '@/components/ui/button';
import { Lock, Save, Loader2, CheckCircle, XCircle } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast'; 

const UpdatePasswordPage = () => {
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [verifyingSession, setVerifyingSession] = useState(true); // Nuevo estado para evitar redirección prematura
  const navigate = useNavigate();
  const { toast } = useToast();

  // 1. GESTIÓN DE SESIÓN MEJORADA
  useEffect(() => {
    // Escuchamos los cambios de estado de autenticación
    const { data: authListener } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === 'PASSWORD_RECOVERY') {
        // El usuario entró por el link de recuperación, todo bien.
        setVerifyingSession(false);
      } else if (session) {
        // El usuario tiene sesión, todo bien.
        setVerifyingSession(false);
      } else {
        // Si no hay sesión y NO estamos procesando un hash de recuperación en la URL
        // (A veces el hash tarda unos milisegundos en procesarse)
        const hash = window.location.hash;
        if (!hash || !hash.includes('type=recovery')) {
             // Solo redirigimos si estamos seguros que no es un intento de recuperación
             // navigate('/login'); // Opcional: Descomentar si quieres ser estricto, pero a veces es mejor dejar que intenten.
        }
        setVerifyingSession(false);
      }
    });

    return () => {
      authListener.subscription.unsubscribe();
    };
  }, [navigate]);

  const handleUpdate = async (e) => {
    e.preventDefault();
    setLoading(true);

    if (password.length < 6) {
      toast({
        title: "Contraseña muy corta",
        description: "Debe tener al menos 6 caracteres.",
        variant: "destructive",
      });
      setLoading(false);
      return;
    }

    try {
      // A. ACTUALIZAR EN SUPABASE AUTH (El sistema de login real)
      const { data: authData, error: authError } = await supabase.auth.updateUser({ 
        password: password 
      });

      if (authError) throw authError;

      // B. ACTUALIZAR EN TABLA USUARIO (Tu base de datos pública)
      // Usamos el ID del usuario autenticado para encontrar su registro en la tabla 'usuario'
      if (authData.user) {
          const { error: dbError } = await supabase
            .from('usuario')
            .update({ contrasena: password }) // ⚠️ Nota de seguridad abajo
            .eq('id_auth_supabase', authData.user.id);

          if (dbError) {
              console.error("Error sync DB:", dbError);
              // No lanzamos error fatal aquí para no asustar al usuario si el Auth ya funcionó
          }
      }

      toast({
        title: "¡Contraseña Actualizada!",
        description: "Tu cuenta ha sido asegurada correctamente.",
        className: "bg-green-50 border-green-200",
        action: <CheckCircle className="text-green-600 w-5 h-5"/>
      });

      // Redirigir después de un momento
      setTimeout(() => {
          navigate('/'); 
      }, 1500);
      
    } catch (error) {
      console.error(error);
      toast({
        title: "Error al actualizar",
        description: error.message || "Inténtalo de nuevo más tarde.",
        variant: "destructive",
        action: <XCircle className="text-white w-5 h-5"/>
      });
    } finally {
      setLoading(false);
    }
  };

  if (verifyingSession) {
      return (
          <div className="min-h-screen flex items-center justify-center bg-gray-50">
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div>
      );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="max-w-md w-full bg-white rounded-xl shadow-lg p-8 border border-gray-100">
        <div className="text-center mb-8">
          <div className="mx-auto w-14 h-14 bg-blue-50 rounded-full flex items-center justify-center mb-4">
            <Lock className="w-7 h-7 text-primary" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900">Establecer Nueva Contraseña</h2>
          <p className="text-gray-500 mt-2 text-sm">Crea una contraseña segura que puedas recordar.</p>
        </div>

        <form onSubmit={handleUpdate} className="space-y-6">
          <div>
            <label className="block text-sm font-bold text-gray-700 mb-2">Nueva Contraseña</label>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-all"
              placeholder="••••••••"
              minLength={6}
            />
          </div>

          <Button type="submit" disabled={loading} className="w-full py-6 btn-gradient text-lg shadow-md transition-transform active:scale-95">
            {loading ? <Loader2 className="animate-spin mr-2" /> : <Save className="mr-2 w-5 h-5" />}
            Guardar y Entrar
          </Button>
        </form>
      </div>
    </div>
  );
};

export default UpdatePasswordPage;