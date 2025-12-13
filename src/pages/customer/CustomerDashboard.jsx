import { useState, useEffect } from 'react';
import { Routes, Route, Link, useLocation } from 'react-router-dom';
import { Helmet } from 'react-helmet';
import { 
    User, 
    LogOut, 
    Menu, 
    X, 
    Heart, 
    ShoppingBag,
    ChevronRight,
    PiggyBank, // Icono para ahorros
    Leaf       // Icono para impacto ambiental
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/services/supabaseAuthClient'; // Asegúrate de importar tu cliente supabase
import OrderHistory from '@/pages/customer/OrderHistory';
import Profile from '@/pages/customer/Profile';
import { Button } from '@/components/ui/button';
import ManageFavorites from './ManageFavorites';
// --- NUEVA SECCIÓN: IMPACTO / AHORRO ---
const ImpactPlaceholder = () => (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="p-8 bg-white rounded-xl shadow-sm border border-gray-100 flex flex-col items-center text-center">
            <div className="w-16 h-16 bg-green-50 rounded-full flex items-center justify-center mb-4">
                <PiggyBank className="w-8 h-8 text-green-600" />
            </div>
            <h2 className="text-3xl font-bold text-gray-800">$45.50</h2>
            <p className="text-gray-500 font-medium">Dinero Ahorrado</p>
            <p className="text-sm text-gray-400 mt-2">Comprando combos sorpresa en lugar de precio regular.</p>
        </div>

        <div className="p-8 bg-white rounded-xl shadow-sm border border-gray-100 flex flex-col items-center text-center">
            <div className="w-16 h-16 bg-blue-50 rounded-full flex items-center justify-center mb-4">
                <Leaf className="w-8 h-8 text-blue-600" />
            </div>
            <h2 className="text-3xl font-bold text-gray-800">12</h2>
            <p className="text-gray-500 font-medium">Combos Rescatados</p>
            <p className="text-sm text-gray-400 mt-2">Has evitado que esta comida termine en la basura. ¡Bien hecho!</p>
        </div>
    </div>
);

// --- DASHBOARD PRINCIPAL ---
const CustomerDashboard = () => {
  const location = useLocation();
  const { user, logout } = useAuth();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [userName, setUserName] = useState('Cliente'); // Estado para el nombre real
  const [loadingName, setLoadingName] = useState(true);

  // 1. EFECTO PARA TRAER EL NOMBRE REAL DESDE LA TABLA 'USUARIO'
  useEffect(() => {
    const fetchUserName = async () => {
        if (!user || !user.id) return;
        
        try {
            // Buscamos en la tabla padre 'usuario' usando el ID de auth
            const { data, error } = await supabase
                .from('usuario')
                .select('nombre')
                .eq('id_auth_supabase', user.id)
                .single();

            if (error) {
                console.error("Error fetching user name:", error);
                // Fallback: intentar usar metadata si falla la base de datos
                if (user.user_metadata?.nombre) setUserName(user.user_metadata.nombre);
            } else if (data) {
                setUserName(data.nombre);
            }
        } catch (err) {
            console.error(err);
        } finally {
            setLoadingName(false);
        }
    };

    fetchUserName();
  }, [user]);

  const firstName = userName.split(' ')[0]; // Solo el primer nombre para saludos

  // Links de Navegación
  const navLinks = [
    { to: '', text: 'Mi Perfil', icon: <User className="w-5 h-5" /> },
    { to: 'pedidos', text: 'Historial de Pedidos', icon: <ShoppingBag className="w-5 h-5" /> },
    { to: 'favoritos', text: 'Favoritos', icon: <Heart className="w-5 h-5" /> },
    { to: 'impacto', text: 'Mi Impacto y Ahorro', icon: <Leaf className="w-5 h-5" /> }, // ¡NUEVO!
  ];

  const handleLinkClick = () => {
    setIsMobileMenuOpen(false);
  };

  return (
    <>
      <Helmet>
        <title>Mi Cuenta - KIOSKU BITES</title>
      </Helmet>
      
      {/* LAYOUT FIX: 
         Agregamos 'pt-16' (padding top) para compensar la Navbar fija de 64px (h-16).
         Así el contenido empieza justo debajo y no se esconde.
      */}
      <div className="min-h-screen bg-gray-50 flex flex-col md:flex-row pt-16">
        
        {/* --- SIDEBAR DESKTOP --- */}
        {/* CSS FIX: 
            'top-16': Empieza 64px abajo (debajo de la navbar).
            'h-[calc(100vh-4rem)]': La altura es 100% de la pantalla MENOS la altura de la navbar.
        */}
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
            
            {/* Header Móvil (Solo visible en pantallas pequeñas) */}
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
                  <Route path="impacto" element={<ImpactPlaceholder />} />
               </Routes>
            </main>
        </div>
      </div>
    </>
  );
};

export default CustomerDashboard;