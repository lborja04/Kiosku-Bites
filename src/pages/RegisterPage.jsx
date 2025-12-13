import React, { useState } from 'react';
import { Helmet } from 'react-helmet';
import { Link, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { User, Briefcase, Mail, Lock, UserPlus, X, CheckCircle, AlertCircle, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { signUpWithSupabase } from '../services/supabaseAuthClient';

// --- COMPONENTE POPUP (MODAL) ---
const StatusModal = ({ isOpen, onClose, type, title, message }) => {
  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div 
        initial={{ opacity: 0 }} 
        animate={{ opacity: 1 }} 
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
      >
        <motion.div 
          initial={{ scale: 0.9, opacity: 0 }} 
          animate={{ scale: 1, opacity: 1 }} 
          className="bg-white rounded-2xl shadow-2xl max-w-md w-full overflow-hidden"
        >
          <div className={`p-6 flex flex-col items-center text-center ${type === 'success' ? 'bg-green-50' : 'bg-red-50'}`}>
            {type === 'success' ? (
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mb-4">
                <CheckCircle className="w-8 h-8 text-green-600" />
              </div>
            ) : (
              <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mb-4">
                <AlertCircle className="w-8 h-8 text-red-600" />
              </div>
            )}
            
            <h3 className={`text-2xl font-bold mb-2 ${type === 'success' ? 'text-green-800' : 'text-red-800'}`}>
              {title}
            </h3>
            <p className="text-gray-600 mb-6 leading-relaxed">
              {message}
            </p>
            
            <Button 
              onClick={onClose} 
              className={`w-full py-6 text-lg ${type === 'success' ? 'bg-green-600 hover:bg-green-700' : 'bg-red-600 hover:bg-red-700'}`}
            >
              {type === 'success' ? 'Ir a Iniciar Sesión' : 'Entendido, volver a intentar'}
            </Button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};

// --- PÁGINA DE REGISTRO ---
const RegisterPage = () => {
  const [accountType, setAccountType] = useState('cliente');
  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState({});
  const navigate = useNavigate();

  // Estado para el Popup
  const [modalState, setModalState] = useState({
    isOpen: false,
    type: 'success', // 'success' | 'error'
    title: '',
    message: ''
  });

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const closeModal = () => {
    setModalState({ ...modalState, isOpen: false });
    // Si fue éxito, redirigir al login al cerrar
    if (modalState.type === 'success') {
      navigate('/login', { replace: true });
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);

    const { email, password } = formData;
    
    // 1. Validación simple de campos vacíos
    let isValid = false;
    let missingFieldMessage = "Por favor completa todos los campos requeridos.";

    if (accountType === 'cliente') {
        isValid = email && password && formData.nombre;
    } else {
        isValid = email && password && formData.nombreLocal && formData.dueno;
    }

    if (!isValid) {
      setModalState({
        isOpen: true,
        type: 'error',
        title: 'Faltan datos',
        message: missingFieldMessage
      });
      setIsLoading(false);
      return;
    }

    const nombreDisplay = accountType === 'local' ? formData.nombreLocal : formData.nombre;

    try {
      const extra = {};
      if (accountType === 'local') {
        extra.nombre_local = formData.nombreLocal;
        extra.nombre_dueno = formData.dueno;
      }

      const result = await signUpWithSupabase({
        email,
        password,
        nombre: nombreDisplay,
        tipo_usuario: accountType,
        extra,
      });

      if (result?.auth?.user) {
        setModalState({
          isOpen: true,
          type: 'success',
          title: '¡Cuenta Creada!',
          message: 'Tu registro ha sido exitoso. Hemos enviado un enlace de confirmación a tu correo. Por favor verifícalo.'
        });
      }

    } catch (error) {
      console.error("Error en registro:", error);
      
      // CAMBIO AQUÍ: Usamos directamente el mensaje que viene del error
      // ya que tu servicio 'signUpWithSupabase' ya lo devuelve en español.
      setModalState({
        isOpen: true,
        type: 'error',
        title: 'No se pudo registrar',
        message: error.message || "Ocurrió un error inesperado al intentar registrarte."
      });

    } finally {
        setIsLoading(false);
    }
  };

  const renderForm = () => {
    // FORMULARIO CLIENTE
    if (accountType === 'cliente') {
      return (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Nombre completo</label>
            <div className="relative">
              <User className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
              <input
                name="nombre" type="text" required onChange={handleChange}
                className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary outline-none transition-all"
                placeholder="Ej. Juan Pérez"
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Correo electrónico</label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
              <input
                name="email" type="email" required onChange={handleChange}
                className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary outline-none transition-all"
                placeholder="tu@email.com"
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Contraseña</label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
              <input
                name="password" type="password" required onChange={handleChange}
                className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary outline-none transition-all"
                placeholder="********"
              />
            </div>
          </div>
        </motion.div>
      );
    }

    // FORMULARIO LOCAL (Sin ubicación ni teléfono)
    if (accountType === 'local') {
      return (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Nombre del Negocio</label>
            <div className="relative">
              <Briefcase className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
              <input
                name="nombreLocal" type="text" required onChange={handleChange}
                className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary outline-none transition-all"
                placeholder="Ej. Panadería La Espiga"
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Nombre del Dueño/Gerente</label>
            <div className="relative">
              <User className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
              <input
                name="dueno" type="text" required onChange={handleChange}
                className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary outline-none transition-all"
                placeholder="Tu nombre completo"
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Correo Comercial</label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
              <input
                name="email" type="email" required onChange={handleChange}
                className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary outline-none transition-all"
                placeholder="contacto@negocio.com"
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Contraseña</label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
              <input
                name="password" type="password" required onChange={handleChange}
                className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary outline-none transition-all"
                placeholder="********"
              />
            </div>
          </div>
        </motion.div>
      );
    }
  };

  return (
    <>
      <Helmet>
        <title>Registro - KIOSKU BITES</title>
        <meta name="description" content="Únete a KIOSKU BITES." />
      </Helmet>

      {/* Renderizamos el Popup si está activo */}
      <StatusModal 
        isOpen={modalState.isOpen} 
        onClose={closeModal} 
        type={modalState.type}
        title={modalState.title}
        message={modalState.message}
      />

      <div className="min-h-screen flex bg-gray-50 font-sans">
        {/* Imagen lateral */}
        <div className="hidden lg:block relative w-0 flex-1 lg:w-1/2 xl:w-2/3">
          <img
            alt="Chef cocinando"
            className="absolute inset-0 h-full w-full object-cover"
            src="https://images.unsplash.com/photo-1556911220-bff31c812dba?q=80&w=2787&auto=format&fit=crop"
          />
          <div className="absolute inset-0 bg-primary/80 backdrop-blur-sm flex flex-col items-center justify-center text-white p-12 text-center">
             <motion.div
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8 }}
            >
              <Link to="/" className="flex items-center justify-center space-x-4 mb-8 hover:scale-105 transition-transform">
                <div className="w-16 h-16 bg-white rounded-2xl flex items-center justify-center shadow-lg">
                  <span className="text-primary font-black text-4xl">K</span>
                </div>
                <span className="text-4xl font-bold tracking-tight">KIOSKU BITES</span>
              </Link>
              <h1 className="text-4xl font-extrabold leading-tight mb-4">Únete al cambio.</h1>
            </motion.div>
          </div>
        </div>

        {/* Formulario */}
        <div className="flex flex-1 flex-col justify-center py-12 px-4 sm:px-6 lg:flex-none lg:px-20 xl:px-24 bg-white">
          <motion.div
            initial={{ opacity: 0, x: 50 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.8 }}
            className="mx-auto w-full max-w-sm lg:w-96"
          >
            <div className="text-center lg:text-left mb-8">
              <h2 className="text-3xl font-bold tracking-tight text-gray-900">Crear cuenta</h2>
              <p className="mt-2 text-md text-gray-600">Empieza a salvar comida o a venderla.</p>
            </div>

            {/* Switch Cliente / Local */}
            <div className="grid grid-cols-2 gap-2 mb-8 bg-gray-100 p-1.5 rounded-xl">
                <button 
                    onClick={() => setAccountType('cliente')} 
                    className={`flex items-center justify-center rounded-lg py-2.5 text-sm font-bold transition-all ${accountType === 'cliente' ? 'bg-white shadow-sm text-primary' : 'text-gray-500 hover:text-gray-900'}`}
                >
                  <User className="w-4 h-4 mr-2" /> Soy Cliente
                </button>
                <button 
                    onClick={() => setAccountType('local')} 
                    className={`flex items-center justify-center rounded-lg py-2.5 text-sm font-bold transition-all ${accountType === 'local' ? 'bg-white shadow-sm text-primary' : 'text-gray-500 hover:text-gray-900'}`}
                >
                  <Briefcase className="w-4 h-4 mr-2" /> Soy Local
                </button>
            </div>

            <form className="space-y-6" onSubmit={handleSubmit}>
              {renderForm()}
              
              <div className="flex items-center pt-2">
                <input id="terms" name="terms" type="checkbox" required className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary cursor-pointer" />
                <label htmlFor="terms" className="ml-2 block text-sm text-gray-700 cursor-pointer">
                  Acepto los <Link to="/terminos" className="text-primary hover:underline font-bold">Términos y Condiciones</Link>
                </label>
              </div>

              <Button 
                type="submit" 
                disabled={isLoading}
                className="w-full btn-gradient py-6 text-lg shadow-md hover:shadow-xl transition-all disabled:opacity-70"
              >
                {isLoading ? (
                    <div className="flex items-center">
                        <Loader2 className="mr-2 h-5 w-5 animate-spin" /> Procesando...
                    </div>
                ) : (
                    <div className="flex items-center">
                        <UserPlus className="w-5 h-5 mr-2" /> Crear cuenta
                    </div>
                )}
              </Button>
            </form>

            <p className="mt-8 text-center text-sm text-gray-600">
              ¿Ya tienes cuenta?{' '}
              <Link to="/login" className="font-bold text-primary hover:text-[#1f3a5e] hover:underline">
                Inicia sesión aquí
              </Link>
            </p>
          </motion.div>
        </div>
      </div>
    </>
  );
};

export default RegisterPage;