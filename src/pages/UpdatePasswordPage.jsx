import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/services/supabaseAuthClient';
import { Button } from '@/components/ui/button';
import { Lock, Save, Loader2 } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast'; // Usamos tu toast si lo tienes, o alert

const UpdatePasswordPage = () => {
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();

  // Verificamos si el usuario llegó aquí logueado (por el link del correo)
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) {
        // Si no hay sesión, no deberían estar aquí, los mandamos al login
        navigate('/login');
      }
    });
  }, [navigate]);

  const handleUpdate = async (e) => {
    e.preventDefault();
    setLoading(true);

    if (password.length < 6) {
      alert("La contraseña debe tener al menos 6 caracteres");
      setLoading(false);
      return;
    }

    try {
      // ESTA ES LA FUNCIÓN CLAVE: Actualiza la contraseña del usuario actual
      const { error } = await supabase.auth.updateUser({ 
        password: password 
      });

      if (error) throw error;

      alert("¡Contraseña actualizada con éxito!");
      // Redirigimos al dashboard o home
      navigate('/'); 
      
    } catch (error) {
      console.error(error);
      alert("Error al actualizar: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="max-w-md w-full bg-white rounded-xl shadow-lg p-8">
        <div className="text-center mb-8">
          <div className="mx-auto w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center mb-4">
            <Lock className="w-6 h-6 text-blue-600" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900">Nueva Contraseña</h2>
          <p className="text-gray-500 mt-2">Introduce tu nueva contraseña para asegurar tu cuenta.</p>
        </div>

        <form onSubmit={handleUpdate} className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Nueva Contraseña</label>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary outline-none"
              placeholder="Mínimo 6 caracteres"
            />
          </div>

          <Button type="submit" disabled={loading} className="w-full py-6 btn-gradient text-lg">
            {loading ? <Loader2 className="animate-spin mr-2" /> : <Save className="mr-2 w-5 h-5" />}
            Guardar Contraseña
          </Button>
        </form>
      </div>
    </div>
  );
};

export default UpdatePasswordPage;