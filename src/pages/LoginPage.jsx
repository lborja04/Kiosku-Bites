import React, { useState } from 'react';
import { Helmet } from 'react-helmet';
import { Link, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Mail, Lock, LogIn, AlertCircle, Loader2, KeyRound, CheckCircle2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';
// ASEGÚRATE DE HABER ACTUALIZADO supabaseAuthClient.js CON LA FUNCIÓN sendPasswordResetEmail
import { signInWithSupabase, supabase, sendPasswordResetEmail } from '../services/supabaseAuthClient';

// --- COMPONENTE POPUP (MODAL DE ESTADO) CORREGIDO ---
const StatusModal = ({ isOpen, onClose, title, message, isSuccess }) => {
  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div 
          initial={{ opacity: 0 }} 
          animate={{ opacity: 1 }} 
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
        >
          <motion.div 
            initial={{ scale: 0.9, opacity: 0 }} 
            animate={{ scale: 1, opacity: 1 }} 
            exit={{ scale: 0.9, opacity: 0 }}
            className="bg-white rounded-2xl shadow-2xl max-w-md w-full overflow-hidden"
          >
            <div className={`p-6 flex flex-col items-center text-center ${isSuccess ? 'bg-green-50' : 'bg-red-50'}`}>
              <div className={`w-16 h-16 rounded-full flex items-center justify-center mb-4 ${isSuccess ? 'bg-green-100' : 'bg-red-100'}`}>
                {isSuccess ? <CheckCircle2 className="w-8 h-8 text-green-600" /> : <AlertCircle className="w-8 h-8 text-red-600" />}
              </div>
              <h3 className={`text-2xl font-bold mb-2 ${isSuccess ? 'text-green-800' : 'text-red-800'}`}>{title}</h3>
              <p className="text-gray-600 mb-6 leading-relaxed">{message}</p>
              <Button onClick={onClose} className={`w-full py-6 text-lg ${isSuccess ? 'bg-green-600 hover:bg-green-700' : 'bg-red-600 hover:bg-red-700'}`}>
                {isSuccess ? 'Genial' : 'Entendido'}
              </Button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

// --- COMPONENTE POPUP (OLVIDÉ CONTRASEÑA) CORREGIDO ---
const ForgotPasswordModal = ({ isOpen, onClose, onSubmit, isLoading }) => {
  const [email, setEmail] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit(email);
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div 
          initial={{ opacity: 0 }} 
          animate={{ opacity: 1 }} 
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
        >
          <motion.div 
            initial={{ scale: 0.9, opacity: 0 }} 
            animate={{ scale: 1, opacity: 1 }} 
            exit={{ scale: 0.9, opacity: 0 }}
            className="bg-white rounded-2xl shadow-2xl max-w-md w-full overflow-hidden"
          >
            <div className="p-6 bg-white relative">
              {/* Botón X para cerrar */}
              <button onClick={onClose} className="absolute top-4 right-4 text-gray-400 hover:text-gray-600">
                ✕
              </button>

              <div className="flex flex-col items-center text-center mb-6">
                <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mb-4">
                  <KeyRound className="w-8 h-8 text-blue-600" />
                </div>
                <h3 className="text-2xl font-bold text-gray-900">Recuperar Contraseña</h3>
                <p className="text-gray-500 mt-2">Ingresa tu correo y te enviaremos un enlace mágico para restablecer tu acceso.</p>
              </div>
              
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1 text-left">Correo electrónico</label>
                  <input 
                    type="email" 
                    required 
                    value={email} 
                    onChange={(e) => setEmail(e.target.value)} 
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary outline-none" 
                    placeholder="tu@email.com" 
                  />
                </div>
                <div className="flex gap-3 mt-6">
                  <Button type="button" variant="outline" onClick={onClose} className="flex-1 py-6">
                    Cancelar
                  </Button>
                  <Button type="submit" disabled={isLoading} className="flex-1 py-6 btn-gradient text-white">
                    {isLoading ? <Loader2 className="animate-spin" /> : 'Enviar Enlace'}
                  </Button>
                </div>
              </form>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

const LoginPage = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { login } = useAuth();
  
  // Estado para modales
  const [modalState, setModalState] = useState({ isOpen: false, title: '', message: '', isSuccess: false });
  const [forgotModalOpen, setForgotModalOpen] = useState(false);
  const [resetLoading, setResetLoading] = useState(false);

  const closeModal = () => setModalState({ ...modalState, isOpen: false });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    if (!email || !password) {
      setModalState({ isOpen: true, title: "Campos vacíos", message: "Por favor, introduce tu correo y contraseña.", isSuccess: false });
      setLoading(false);
      return;
    }

    try {
      const { auth } = await signInWithSupabase({ email, password });

      const { data: dbUser, error: dbError } = await supabase
        .from('usuario')
        .select('tipo_usuario, nombre')
        .eq('id_auth_supabase', auth.user.id)
        .single();

      if (dbError || !dbUser) throw new Error("Error verificando datos de usuario.");

      if (dbUser.tipo_usuario === 'admin') {
          await supabase.auth.signOut();
          throw new Error("ADMIN_RESTRICTED");
      }

      const tipo = dbUser.tipo_usuario;
      const payload = {
        id: auth.user.id,
        email: auth.user.email,
        nombre: dbUser.nombre || auth.user.user_metadata?.full_name || email,
        type: tipo,
        user_metadata: auth.user.user_metadata
      };
      
      login(payload);

      if (tipo === 'cliente') navigate('/dashboard/cliente', { replace: true });
      else if (tipo === 'local') navigate('/dashboard/local', { replace: true });
      else navigate('/', { replace: true });

    } catch (error) {
      console.error("Login error:", error);
      let errorTitle = "Error de inicio de sesión";
      let friendlyMessage = error.message;
      const msg = error.message?.toLowerCase() || "";

      if (msg.includes("invalid login")) {
        errorTitle = "Credenciales incorrectas";
        friendlyMessage = "El correo o la contraseña no coinciden.";
      } else if (msg.includes("email not confirmed")) {
        errorTitle = "Cuenta no verificada";
        friendlyMessage = "Por favor verifica tu correo electrónico antes de entrar.";
      } else if (error.message === "ADMIN_RESTRICTED") {
        errorTitle = "Acceso Restringido";
        friendlyMessage = "Esta área de ingreso es exclusiva para Clientes y Locales. Los administradores no tienen acceso por aquí.";
      }

      setModalState({ isOpen: true, title: errorTitle, message: friendlyMessage, isSuccess: false });
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async (resetEmail) => {
    if (!resetEmail) return;
    setResetLoading(true);
    try {
      if (typeof sendPasswordResetEmail !== 'function') {
        throw new Error("La función de reset no está configurada correctamente en el sistema.");
      }
      
      await sendPasswordResetEmail(resetEmail);
      setForgotModalOpen(false); // Cierra el modal de input
      
      // Abre modal de éxito
      setModalState({
        isOpen: true,
        title: "¡Correo enviado!",
        message: "Hemos enviado un enlace a tu correo. Revisa tu bandeja de entrada (y spam) para restablecer tu contraseña.",
        isSuccess: true
      });
    } catch (error) {
      console.error("Reset error:", error);
      alert("Error: " + (error.message || "No se pudo enviar el correo."));
    } finally {
      setResetLoading(false);
    }
  };

  return (
    <>
      <Helmet><title>Iniciar Sesión - KIOSKU BITES</title></Helmet>
      
      <StatusModal 
        isOpen={modalState.isOpen} 
        onClose={closeModal} 
        title={modalState.title} 
        message={modalState.message} 
        isSuccess={modalState.isSuccess} 
      />

      <ForgotPasswordModal 
        isOpen={forgotModalOpen} 
        onClose={() => setForgotModalOpen(false)} 
        onSubmit={handleResetPassword}
        isLoading={resetLoading}
      />

      <div className="min-h-screen flex bg-gray-50 font-sans">
        {/* Imagen Lateral */}
        <div className="hidden lg:block relative w-0 flex-1 lg:w-1/2 xl:w-2/3">
          <img 
            className="absolute inset-0 h-full w-full object-cover" 
            alt="Deliciosa comida" 
            src="https://images.unsplash.com/photo-1656167718265-a05fe70cdf52?q=80&w=2070&auto=format&fit=crop" 
          />
          <div className="absolute inset-0 bg-primary/70 backdrop-blur-[2px] flex flex-col items-center justify-center text-white p-12 text-center">
            <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.8 }}>
              <Link to="/" className="flex items-center justify-center space-x-4 mb-8 hover:scale-105 transition-transform">
                <div className="w-16 h-16 bg-white rounded-2xl flex items-center justify-center shadow-lg">
                  <span className="text-primary font-black text-4xl">K</span>
                </div>
                <span className="text-4xl font-bold tracking-tight">KIOSKU BITES</span>
              </Link>
              <h1 className="text-4xl font-extrabold leading-tight">Salva comida,<br/>ahorra dinero.</h1>
            </motion.div>
          </div>
        </div>

        {/* Formulario */}
        <div className="flex flex-1 flex-col justify-center py-12 px-4 sm:px-6 lg:flex-none lg:px-20 xl:px-24 bg-white">
          <motion.div initial={{ opacity: 0, x: 50 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.8 }} className="mx-auto w-full max-w-sm lg:w-96">
            <div className="mb-8">
              <h2 className="text-3xl font-bold tracking-tight text-gray-900">¡Hola de nuevo!</h2>
              <p className="mt-2 text-lg text-gray-600">Ingresa tus datos para continuar.</p>
            </div>
            
            <form onSubmit={handleSubmit} className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Correo electrónico</label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
                  <input id="email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary outline-none" placeholder="tu@email.com" />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Contraseña</label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
                  <input id="password" type="password" required value={password} onChange={(e) => setPassword(e.target.value)} className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary outline-none" placeholder="********" />
                </div>
              </div>

              <div className="flex justify-end">
                <button 
                  type="button" 
                  onClick={() => setForgotModalOpen(true)}
                  className="text-sm font-bold text-primary hover:underline hover:text-[#1f3a5e] focus:outline-none"
                >
                  ¿Olvidaste tu contraseña?
                </button>
              </div>

              <Button type="submit" disabled={loading} className="flex w-full justify-center btn-gradient py-6 text-lg shadow-md hover:shadow-xl transition-all disabled:opacity-70">
                {loading ? <><Loader2 className="mr-2 h-5 w-5 animate-spin" /> Iniciando...</> : <><LogIn className="w-5 h-5 mr-2" /> Iniciar Sesión</>}
              </Button>
            </form>

            <p className="mt-8 text-center text-md text-gray-600">
              ¿No tienes una cuenta? <Link to="/register" className="font-bold text-primary hover:text-[#1f3a5e] hover:underline">Regístrate aquí</Link>
            </p>
          </motion.div>
        </div>
      </div>
    </>
  );
};

export default LoginPage;