import { useState, useEffect } from 'react';
import { Routes, Route, Link, useLocation } from 'react-router-dom';
import { Helmet } from 'react-helmet';
import { motion, AnimatePresence } from 'framer-motion'; // Asegúrate de importar esto
import { 
    User, 
    LogOut, 
    Menu, 
    X, 
    Heart, 
    ShoppingBag,
    ChevronRight,
    Ban, // Nuevo icono
    AlertTriangle // Nuevo icono
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/services/supabaseAuthClient'; 
import OrderHistory from '@/pages/customer/OrderHistory';
import Profile from '@/pages/customer/Profile';
import { Button } from '@/components/ui/button';
import ManageFavorites from './ManageFavorites';

// --- MODAL DE BLOQUEO EN TIEMPO REAL ---
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
                        Tu cuenta ha sido suspendida por un administrador mientras estabas activo. 
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

// --- DASHBOARD PRINCIPAL ---
const CustomerDashboard = () => {
  const location = useLocation();
  const { user, logout } = useAuth();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [userName, setUserName] = useState('Cliente');
  const [loadingName, setLoadingName] = useState(true);
  
  // Estado para controlar el bloqueo en tiempo real
  const [isBlocked, setIsBlocked] = useState(false);

  // 1. EFECTO PARA NOMBRE Y VALIDACIÓN INICIAL
  useEffect(() => {
    const fetchUserData = async () => {
        if (!user || !user.id) return;
        
        try {
            const { data, error } = await supabase
                .from('usuario')
                .select('nombre, estado') // Traemos también el estado
                .eq('id_auth_supabase', user.id)
                .single();

            if (error) {
                console.error("Error fetching user data:", error);
                if (user.user_metadata?.nombre) setUserName(user.user_metadata.nombre);
            } else if (data) {
                setUserName(data.nombre);
                
                // Validación inicial: Si ya entró bloqueado (por caché o sesión vieja)
                if (data.estado === 'Bloqueado') {
                    setIsBlocked(true);
                }
            }
        } catch (err) {
            console.error(err);
        } finally {
            setLoadingName(false);
        }
    };

    fetchUserData();
  }, [user]);

  // 2. EFECTO REALTIME: ESCUCHAR SI ME BLOQUEAN
  useEffect(() => {
      if (!user?.id) return;

      // Creamos un canal de suscripción a la tabla 'usuario'
      const channel = supabase
          .channel('user-status-changes')
          .on(
              'postgres_changes',
              {
                  event: 'UPDATE', // Solo nos interesan actualizaciones
                  schema: 'public',
                  table: 'usuario',
                  filter: `id_auth_supabase=eq.${user.id}` // ESCUCHAMOS SOLO MI FILA (Eficiente)
              },
              (payload) => {
                  // payload.new contiene la fila actualizada
                  if (payload.new.estado === 'Bloqueado') {
                      console.log("¡Usuario bloqueado en tiempo real!");
                      setIsBlocked(true);
                  }
              }
          )
          .subscribe();

      // Limpieza al desmontar
      return () => {
          supabase.removeChannel(channel);
      };
  }, [user?.id]);

  const firstName = userName.split(' ')[0]; 

  const navLinks = [
    { to: '', text: 'Mi Perfil', icon: <User className="w-5 h-5" /> },
    { to: 'pedidos', text: 'Historial de Pedidos', icon: <ShoppingBag className="w-5 h-5" /> },
    { to: 'favoritos', text: 'Favoritos', icon: <Heart className="w-5 h-5" /> },
  ];

  const handleLinkClick = () => {
    setIsMobileMenuOpen(false);
  };

  // Si está bloqueado, forzamos el modal y oscurecemos todo, 
  // pero NO hacemos return null para que el Modal se renderice encima.
  
  return (
    <>
      <Helmet>
        <title>Mi Cuenta - KIOSKU BITES</title>
      </Helmet>

      {/* MODAL DE BLOQUEO (Siempre presente en el DOM, visible si isBlocked=true) */}
      <BlockedSessionModal isOpen={isBlocked} onLogout={logout} />
      
      {/* Contenido normal (se verá borroso o tapado por el modal si isBlocked es true) */}
      <div className={`min-h-screen bg-gray-50 flex flex-col md:flex-row pt-16 transition-all ${isBlocked ? 'blur-sm pointer-events-none' : ''}`}>
        
        {/* --- SIDEBAR DESKTOP --- */}
        <aside className="w-72 bg-white border-r border-gray-200 hidden md:flex flex-col fixed left-0 top-16 h-[calc(100vh-4rem)] z-10 overflow-y-auto">
           
           {/* Perfil Header */}
           <div className="p-8 border-b border-gray-100 flex flex-col items-center text-center">
              <div className="w-20 h-20 bg-gradient-to-tr from-primary to-orange-400 rounded-full flex items-center justify-center text-white text-3xl font-bold shadow-lg mb-4">
                  {loadingName ? '...' : firstName.charAt(0).toUpperCase()}
              </div>
              <h2 className="text-xl font-bold text-gray-800">
                  {loadingName ? 'Cargando...' : userName}
              </h2>
              <span className="text-sm text-gray-500 mt-1">Foodie &bull; Kiosku Member</span>
           </div>

           {/* Navegación */}
           <nav className="flex-grow p-4 space-y-2">
              {navLinks.map((link) => {
                 const isActive = location.pathname === `/dashboard/cliente/${link.to}` || (link.to === '' && location.pathname === '/dashboard/cliente');
                 return (
                    <Link
                      key={link.to}
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

        {/* --- MAIN CONTENT --- */}
        <div className="flex-1 md:ml-72 flex flex-col min-h-[calc(100vh-4rem)]">
            
            {/* Header Móvil */}
            <header className="md:hidden bg-white border-b border-gray-200 p-4 sticky top-16 z-20 flex justify-between items-center shadow-sm">
                <div className="flex items-center space-x-3">
                   <div className="w-8 h-8 bg-primary rounded-full flex items-center justify-center text-white font-bold">
                      {firstName.charAt(0)}
                   </div>
                   <span className="font-bold text-gray-800">Hola, {firstName}</span>
                </div>
                <Button variant="ghost" size="icon" onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}>
                  {isMobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
                </Button>
            </header>

            {/* Menú Móvil Overlay */}
            {isMobileMenuOpen && (
              <div className="md:hidden fixed inset-0 z-30 bg-gray-800/50 top-16" onClick={() => setIsMobileMenuOpen(false)}>
                <div className="bg-white w-3/4 h-full shadow-2xl p-4 pt-6 space-y-2 flex flex-col" onClick={e => e.stopPropagation()}>
                    {navLinks.map((link) => {
                        const isActive = location.pathname === `/dashboard/cliente/${link.to}` || (link.to === '' && location.pathname === '/dashboard/cliente');
                        return (
                            <Link
                                key={link.to}
                                to={`/dashboard/cliente/${link.to}`}
                                onClick={handleLinkClick}
                                className={`flex items-center space-x-3 px-4 py-3 rounded-xl transition-colors font-medium ${
                                isActive
                                    ? 'bg-primary text-white'
                                    : 'text-gray-600 hover:bg-gray-100'
                                }`}
                            >
                                {link.icon}
                                <span>{link.text}</span>
                            </Link>
                        );
                    })}
                    
                    <div className="mt-auto border-t pt-4">
                        <button 
                            onClick={() => { logout(); handleLinkClick(); }} 
                            className="flex items-center space-x-3 px-4 py-3 rounded-xl text-red-500 hover:bg-red-50 w-full font-medium"
                        >
                            <LogOut className="w-5 h-5" />
                            <span>Cerrar Sesión</span>
                        </button>
                    </div>
                </div>
              </div>
            )}

            {/* Contenido de Rutas */}
            <main className="flex-1 p-4 sm:p-8 max-w-5xl mx-auto w-full">
               <Routes>
                  <Route path="/" element={<Profile />} />
                  <Route path="pedidos" element={<OrderHistory />} />
                  <Route path="favoritos" element={<ManageFavorites />} />
               </Routes>
            </main>
        </div>
      </div>
    </>
  );
};

export default CustomerDashboard;