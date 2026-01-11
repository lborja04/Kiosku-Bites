import React, { useState } from 'react';
import { Helmet } from 'react-helmet';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Lock, Mail, ShieldCheck, AlertOctagon, Loader2, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';
// Importamos signInWithSupabase (tu función) y supabase (cliente directo para la DB)
import { signInWithSupabase, supabase } from '@/services/supabaseAuthClient';

const AdminLogin = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  
  const navigate = useNavigate();
  const { login } = useAuth();

  const handleAdminLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg('');

    try {
      // 1. LOGIN DE SUPABASE (Igual que en LoginPage)
      // Desestructuramos 'auth' directamente como en tu código funcional
      const { auth } = await signInWithSupabase({ email, password });
      
      // Validación básica por si auth viene vacío
      if (!auth || !auth.user) {
        throw new Error("Credenciales inválidas");
      }

      // 2. VERIFICACIÓN ESTRICTA EN BASE DE DATOS
      // Usamos auth.user.id (Igual que en LoginPage)
      const { data: dbUser, error: dbError } = await supabase
        .from('usuario')
        .select('tipo_usuario, nombre')
        .eq('id_auth_supabase', auth.user.id)
        .single();

      if (dbError || !dbUser) {
        throw new Error("Error verificando permisos de administrador.");
      }

      // 3. SI NO ES ADMIN -> EXPULSAR
      if (dbUser.tipo_usuario !== 'admin') {
        // Cerramos la sesión inmediatamente
        await supabase.auth.signOut();
        throw new Error("ACCESO DENEGADO: Esta cuenta no tiene privilegios de administrador.");
      }

      // 4. SI ES ADMIN -> CONTINUAR
      // Construimos el payload igual que en LoginPage
      const payload = {
        id: auth.user.id,
        email: auth.user.email,
        nombre: dbUser.nombre || 'Admin',
        type: 'admin',
        tipo_usuario: 'admin',
        user_metadata: auth.user.user_metadata
      };
      
      login(payload); // Actualizar contexto
      navigate('/admin', { replace: true }); // Redirigir al dashboard

    } catch (error) {
      console.error("Admin Login Error:", error);
      
      // Manejo de mensajes de error
      const msg = error.message?.toLowerCase() || "";
      if (msg.includes("invalid login")) {
        setErrorMsg("Credenciales incorrectas.");
      } else {
        setErrorMsg(error.message);
      }

      // Aseguramos cierre de sesión si falló algo
      await supabase.auth.signOut();
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Helmet>
        <title>Admin Access - KIOSKU CONTROL</title>
        <meta name="robots" content="noindex, nofollow" />
      </Helmet>

      <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4 font-mono">
        
        {/* Fondo decorativo sutil */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
            <div className="absolute top-[-10%] left-[-10%] w-96 h-96 bg-indigo-900/20 rounded-full blur-3xl"></div>
            <div className="absolute bottom-[-10%] right-[-10%] w-96 h-96 bg-blue-900/10 rounded-full blur-3xl"></div>
        </div>

        <motion.div 
          initial={{ opacity: 0, scale: 0.95 }} 
          animate={{ opacity: 1, scale: 1 }} 
          className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden relative z-10"
        >
          {/* Header */}
          <div className="bg-slate-900 p-8 text-center border-b border-slate-800">
            <div className="w-16 h-16 bg-indigo-500/10 rounded-full flex items-center justify-center mx-auto mb-4 border border-indigo-500/20">
              <ShieldCheck className="w-8 h-8 text-indigo-500" />
            </div>
            <h1 className="text-2xl font-bold text-white tracking-tight">Kiosku Admin</h1>
            <p className="text-slate-400 text-sm mt-2">Acceso Restringido - Solo Personal Autorizado</p>
          </div>

          {/* Formulario */}
          <div className="p-8 pt-6">
            {errorMsg && (
              <motion.div 
                initial={{ opacity: 0, y: -10 }} 
                animate={{ opacity: 1, y: 0 }}
                className="mb-6 p-4 bg-red-950/30 border border-red-900/50 rounded-lg flex items-start gap-3"
              >
                <AlertOctagon className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
                <p className="text-red-400 text-sm">{errorMsg}</p>
              </motion.div>
            )}

            <form onSubmit={handleAdminLogin} className="space-y-5">
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-2 ml-1">ID de Administrador</label>
                <div className="relative group">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 group-focus-within:text-indigo-400 transition-colors w-5 h-5" />
                  <input 
                    type="email" 
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 text-slate-200 text-sm rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none pl-10 py-3 transition-all placeholder:text-slate-700"
                    placeholder="admin@kiosku.com"
                    autoComplete="off"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-2 ml-1">Clave de Acceso</label>
                <div className="relative group">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 group-focus-within:text-indigo-400 transition-colors w-5 h-5" />
                  <input 
                    type="password" 
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 text-slate-200 text-sm rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none pl-10 py-3 transition-all placeholder:text-slate-700"
                    placeholder="••••••••••••"
                  />
                </div>
              </div>

              <Button 
                type="submit" 
                disabled={loading}
                className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-6 rounded-lg shadow-lg shadow-indigo-900/20 transition-all mt-4"
              >
                {loading ? (
                  <><Loader2 className="mr-2 h-5 w-5 animate-spin" /> Verificando...</>
                ) : (
                  <><Lock className="mr-2 h-4 w-4" /> Acceder al Panel</>
                )}
              </Button>
            </form>
          </div>
          
          <div className="bg-slate-950/50 p-4 text-center border-t border-slate-800">
             <a href="/" className="text-xs text-slate-600 hover:text-indigo-400 transition-colors flex items-center justify-center gap-1">
                Volver al sitio público <ArrowRight className="w-3 h-3"/>
             </a>
          </div>
        </motion.div>
      </div>
    </>
  );
};

export default AdminLogin;