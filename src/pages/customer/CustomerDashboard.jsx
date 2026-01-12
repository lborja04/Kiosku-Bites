import { useState, useEffect } from 'react';
import { Routes, Route, Link, useLocation } from 'react-router-dom';
import { Helmet } from 'react-helmet';
import { motion, AnimatePresence } from 'framer-motion';
import { 
    User, 
    ShoppingBag,
    Heart, 
    Ban, 
    LogOut,
    ChevronRight
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/services/supabaseAuthClient'; 
import OrderHistory from '@/pages/customer/OrderHistory';
import Profile from '@/pages/customer/Profile';
import { Button } from '@/components/ui/button';
import ManageFavorites from './ManageFavorites';

// --- MODAL DE BLOQUEO ---
const BlockedSessionModal = ({ isOpen, onLogout }) => {
    if (!isOpen) return null;
    return (
        <AnimatePresence>
            <motion.div 
                initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-md p-4"
            >
                <motion.div 
                    initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} 
                    className="bg-white rounded-2xl shadow-2xl max-w-md w-full overflow-hidden p-8 text-center"
                >
                    <div className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-6">
                        <Ban className="w-10 h-10 text-red-600" />
                    </div>
                    <h3 className="text-2xl font-bold text-gray-900 mb-2">Acceso Revocado</h3>
                    <p className="text-gray-600 mb-8 leading-relaxed">
                        Tu cuenta ha sido suspendida por un administrador. 
                        Tu sesión se cerrará automáticamente.
                    </p>
                    <Button onClick={onLogout} className="w-full py-6 text-lg bg-red-600 hover:bg-red-700 text-white">
                        Cerrar Sesión
                    </Button>
                </motion.div>
            </motion.div>
        </AnimatePresence>
    );
};

// --- DASHBOARD ---
const CustomerDashboard = () => {
  const location = useLocation();
  const { user, logout } = useAuth();
  
  const [userName, setUserName] = useState('Cliente');
  const [loadingName, setLoadingName] = useState(true);
  const [isBlocked, setIsBlocked] = useState(false);

  // 1. CARGA DE DATOS
  useEffect(() => {
    const fetchUserData = async () => {
        if (!user || !user.id) return;
        try {
            const { data, error } = await supabase
                .from('usuario')
                .select('nombre, estado')
                .eq('id_auth_supabase', user.id)
                .single();

            if (error) {
                if (user.user_metadata?.nombre) setUserName(user.user_metadata.nombre);
            } else if (data) {
                setUserName(data.nombre);
                if (data.estado === 'Bloqueado') setIsBlocked(true);
            }
        } catch (err) {
            console.error(err);
        } finally {
            setLoadingName(false);
        }
    };
    fetchUserData();
  }, [user]);

  // 2. REALTIME BLOCKING
  useEffect(() => {
      if (!user?.id) return;
      const channel = supabase
          .channel('user-status-changes')
          .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'usuario', filter: `id_auth_supabase=eq.${user.id}` }, 
          (payload) => {
              if (payload.new.estado === 'Bloqueado') setIsBlocked(true);
          })
          .subscribe();
      return () => { supabase.removeChannel(channel); };
  }, [user?.id]);

  const firstName = userName.split(' ')[0]; 

  const navLinks = [
    { to: '', text: 'Mi Perfil', icon: <User className="w-5 h-5" /> },
    { to: 'pedidos', text: 'Mis Pedidos', icon: <ShoppingBag className="w-5 h-5" /> },
    { to: 'favoritos', text: 'Favoritos', icon: <Heart className="w-5 h-5" /> },
  ];

  return (
    <>
      <Helmet><title>Mi Cuenta - KIOSKU BITES</title></Helmet>

      <BlockedSessionModal isOpen={isBlocked} onLogout={logout} />
      
      {/* Contenedor Principal */}
      <div className={`min-h-screen bg-gray-50 pt-16 transition-all ${isBlocked ? 'blur-sm pointer-events-none' : ''}`}>
        
        {/* 1. SIDEBAR (PC) */}
        <aside className="hidden md:flex w-72 bg-white border-r border-gray-200 flex-col fixed left-0 top-16 h-[calc(100vh-4rem)] z-10 overflow-y-auto">
            <div className="p-8 border-b border-gray-100 flex flex-col items-center text-center">
                <div className="w-20 h-20 bg-gradient-to-tr from-primary to-orange-400 rounded-full flex items-center justify-center text-white text-3xl font-bold shadow-lg mb-4">
                    {loadingName ? '...' : firstName.charAt(0).toUpperCase()}
                </div>
                <h2 className="text-xl font-bold text-gray-800">
                    {loadingName ? 'Cargando...' : userName}
                </h2>
                <span className="text-sm text-gray-500 mt-1">Cliente Kiosku</span>
            </div>

            <nav className="flex-grow p-4 space-y-2">
                {navLinks.map((link) => {
                    const isActive = location.pathname === `/dashboard/cliente/${link.to}` || (link.to === '' && location.pathname === '/dashboard/cliente');
                    return (
                        <Link
                            key={link.text}
                            to={`/dashboard/cliente/${link.to}`}
                            className={`flex items-center justify-between px-4 py-3 rounded-xl transition-all duration-200 font-medium group ${
                                isActive
                                ? 'bg-primary text-white shadow-md shadow-primary/20'
                                : 'text-gray-600 hover:bg-gray-50 hover:text-primary'
                            }`}
                        >
                            <div className="flex items-center space-x-3">
                                {link.icon}
                                <span>{link.text}</span>
                            </div>
                            {isActive && <ChevronRight className="w-4 h-4 opacity-50" />}
                        </Link>
                    );
                })}
            </nav>

            <div className="p-4 border-t border-gray-100">
                <button 
                    onClick={logout} 
                    className="flex items-center justify-center space-x-2 w-full px-4 py-3 rounded-xl text-gray-500 hover:bg-red-50 hover:text-red-600 transition-colors font-medium"
                >
                    <LogOut className="w-5 h-5" />
                    <span>Cerrar Sesión</span>
                </button>
            </div>
        </aside>

        {/* ========================================================================
            2. ÁREA DE CONTENIDO PRINCIPAL (CORREGIDA)
            ========================================================================
        */}
        {/* Capa Externa: Se encarga SOLO del margen izquierdo para respetar el sidebar */}
        <div className="flex-1 md:ml-72 w-full">
            
            {/* Capa Interna: Se encarga de CENTRAR el contenido y dar padding */}
            <div className="max-w-6xl mx-auto p-4 sm:p-8">
                
                {/* --- HEADER Y TABS (SOLO MÓVIL) --- */}
                <div className="md:hidden mb-8">
                    <div className="flex justify-between items-center mb-6">
                        <div className="flex items-center gap-3">
                            <div className="w-12 h-12 bg-gradient-to-br from-primary to-orange-400 rounded-full flex items-center justify-center text-white text-xl font-bold shadow-md">
                                {loadingName ? '...' : firstName.charAt(0).toUpperCase()}
                            </div>
                            <div>
                                <h1 className="text-xl font-bold text-gray-900">Hola, {firstName}</h1>
                                <p className="text-gray-500 text-xs">Gestiona tu cuenta</p>
                            </div>
                        </div>
                        <Button variant="ghost" size="icon" onClick={logout} className="text-red-500">
                            <LogOut className="w-5 h-5" />
                        </Button>
                    </div>

                    <div className="bg-white p-2 rounded-xl shadow-sm border border-gray-100 overflow-x-auto">
                        <nav className="flex space-x-2 min-w-max">
                            {navLinks.map((link) => {
                                const isActive = location.pathname === `/dashboard/cliente/${link.to}` || (link.to === '' && location.pathname === '/dashboard/cliente');
                                return (
                                    <Link 
                                        key={link.text} 
                                        to={`/dashboard/cliente/${link.to}`}
                                        className="relative group"
                                    >
                                        <div className={`
                                            flex items-center px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200
                                            ${isActive 
                                                ? 'bg-primary text-white shadow-sm' 
                                                : 'text-gray-600 hover:bg-gray-50 hover:text-primary'
                                            }
                                        `}>
                                            <span className="mr-2 transform scale-75">{link.icon}</span>
                                            {link.text}
                                        </div>
                                    </Link>
                                );
                            })}
                        </nav>
                    </div>
                </div>

                {/* --- RENDERIZADO DE RUTAS --- */}
                <motion.div 
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.1 }}
                >
                    <Routes>
                        <Route path="/" element={<Profile />} />
                        <Route path="pedidos" element={<OrderHistory />} />
                        <Route path="favoritos" element={<ManageFavorites />} />
                    </Routes>
                </motion.div>

            </div>
        </div>
      </div>
    </>
  );
};

export default CustomerDashboard;