import { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Menu, X, User, LogOut, LayoutDashboard, ShoppingCart, UtensilsCrossed } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/services/supabaseAuthClient';

const Navbar = () => {
  // 1. SIEMPRE DECLARA TODOS LOS HOOKS AL PRINCIPIO
  const [isOpen, setIsOpen] = useState(false);
  const location = useLocation();
  const { user, logout } = useAuth();
  const [dbName, setDbName] = useState(null);
  
  // NUEVO: Estado para el contador del carrito
  const [cartCount, setCartCount] = useState(0);

  // Hook useEffect siempre debe estar aquí
  useEffect(() => {
    // A. Lógica para obtener el nombre real
    const fetchRealName = async () => {
        if (!user || !user.id) return;

        const metaName = user.user_metadata?.nombre || user.user_metadata?.full_name;
        if (metaName && !metaName.includes('@')) {
            setDbName(metaName);
        }

        try {
            const { data } = await supabase
                .from('usuario')
                .select('nombre')
                .eq('id_auth_supabase', user.id)
                .single();

            if (data && data.nombre) {
                setDbName(data.nombre);
            }
        } catch (err) {
            console.error(err);
        }
    };

    fetchRealName();
  }, [user]);

  // NUEVO: Hook para mantener actualizado el carrito
  useEffect(() => {
    const updateCartCount = async () => {
        if (!user || user.type !== 'cliente') {
            setCartCount(0);
            return;
        }

        try {
            // 1. Obtener el ID numérico del cliente
            const { data: userData } = await supabase
                .from('usuario')
                .select('id_usuario')
                .eq('id_auth_supabase', user.id)
                .single();
            
            if (!userData) return;

            // 2. Obtener los items del carrito para ese cliente
            const { data: cartItems, error } = await supabase
                .from('carrito_item')
                .select('cantidad')
                .eq('id_cliente', userData.id_usuario);

            if (error) throw error;

            // 3. Sumar las cantidades (ej: 2 hamburguesas + 1 soda = 3 items)
            const total = cartItems?.reduce((acc, item) => acc + item.cantidad, 0) || 0;
            setCartCount(total);

        } catch (error) {
            console.error("Error actualizando contador carrito:", error);
        }
    };

    // Ejecutar al inicio
    updateCartCount();

    // Escuchar el evento personalizado que disparamos desde ComboDetail y ShoppingCart
    window.addEventListener('cart-updated', updateCartCount);

    // Limpieza
    return () => {
        window.removeEventListener('cart-updated', updateCartCount);
    };
  }, [user]);


  // Lógica de variables (siempre se ejecuta)
  const displayName = dbName || user?.user_metadata?.nombre || 'Usuario';
  const firstName = displayName.split(' ')[0]; 

  const landingItems = [
    { name: 'Inicio', path: '/' },
    { name: 'Buscar Combos', path: '/buscar-combos' },
    { name: 'Para Empresas', path: '/para-empresas' },
    { name: 'Nuestra Historia', path: '/nuestra-historia' },
  ];

  const clientItems = [
    { name: 'Explorar Comida', path: '/buscar-combos' }, 
    { name: 'Mi Cuenta', path: '/dashboard/cliente' }, 
  ];

  const navItems = (user && user.type === 'cliente') ? clientItems : landingItems;

  // 2. CONDICIÓN DE RETORNO (Si es panel local/admin no mostramos navbar)
  if ((user?.type === 'local' && location.pathname.startsWith('/dashboard/local')) ||
    location.pathname.startsWith('/admin')) {
    return null; 
  }

  // 3. RETORNO NORMAL (JSX)
  return (
    <nav className="fixed top-0 w-full bg-white/95 backdrop-blur-md border-b border-gray-200 z-50 shadow-sm transition-all">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          
          <Link to={user?.type === 'cliente' ? '/buscar-combos' : '/'} className="flex items-center space-x-2 group">
            <div className="w-10 h-10 bg-primary rounded-xl flex items-center justify-center shadow-lg group-hover:scale-105 transition-transform">
              <span className="text-white font-black text-xl">K</span>
            </div>
            <span className="text-xl font-bold text-[#453255] tracking-tight group-hover:text-primary transition-colors">
              KIOSKU BITES
            </span>
          </Link>

          <div className="hidden md:flex items-center space-x-8">
            {navItems.map((item) => (
              <Link
                key={item.name}
                to={item.path}
                className={`text-sm font-medium transition-all hover:text-primary relative group ${
                  location.pathname === item.path ? 'text-primary' : 'text-gray-600'
                }`}
              >
                {item.name}
                {location.pathname === item.path && (
                    <motion.div 
                        layoutId="underline"
                        className="absolute left-0 right-0 h-0.5 bg-primary bottom-[-4px]" 
                    />
                )}
              </Link>
            ))}
          </div>

          <div className="hidden md:flex items-center space-x-4">
            {user ? (
              <>
                {user.type === 'cliente' && (
                  <Link to="/carrito">
                    <Button variant="ghost" size="icon" className="relative hover:bg-orange-50 hover:text-orange-600 group">
                      <ShoppingCart className="w-5 h-5" />
                      
                      {/* --- BADGE DEL CARRITO --- */}
                      <AnimatePresence>
                        {cartCount > 0 && (
                            <motion.span 
                                initial={{ scale: 0 }}
                                animate={{ scale: 1 }}
                                exit={{ scale: 0 }}
                                className="absolute -top-1 -right-1 bg-red-600 text-white text-[10px] font-bold w-5 h-5 flex items-center justify-center rounded-full border-2 border-white"
                            >
                                {cartCount > 9 ? '9+' : cartCount}
                            </motion.span>
                        )}
                      </AnimatePresence>

                    </Button>
                  </Link>
                )}

                <div className="flex items-center space-x-2 pl-2 border-l border-gray-200">
                    <span className="text-sm font-medium text-gray-700 max-w-[120px] truncate">
                        Hola, {firstName}
                    </span>
                    
                    {user.type === 'cliente' && (
                          <Link to="/dashboard/cliente">
                            <Button variant="outline" size="sm" className="h-9 border-gray-200 hover:border-primary hover:text-primary">
                                <User className="w-4 h-4 mr-2" /> Mi Perfil
                            </Button>
                          </Link>
                    )}

                    <Button 
                        onClick={logout} 
                        size="sm" 
                        variant="ghost"
                        className="text-gray-400 hover:text-red-600 hover:bg-red-50"
                        title="Cerrar Sesión"
                    >
                        <LogOut className="w-4 h-4" />
                    </Button>
                </div>
              </>
            ) : (
              <>
                <Link to="/login">
                  <Button variant="ghost" size="sm" className="text-gray-700 font-medium hover:text-primary hover:bg-primary/5">
                    Iniciar Sesión
                  </Button>
                </Link>
                <Link to="/register">
                  <Button size="sm" className="btn-gradient shadow-md hover:shadow-lg transition-all rounded-full px-6">
                    Comenzar
                  </Button>
                </Link>
              </>
            )}
          </div>

          <div className="md:hidden">
            <Button variant="ghost" size="icon" onClick={() => setIsOpen(!isOpen)} className="relative">
              {isOpen ? <X className="w-6 h-6 text-gray-800" /> : <Menu className="w-6 h-6 text-gray-800" />}
              {/* Badge para móvil también si está cerrado el menú */}
              {!isOpen && cartCount > 0 && (
                  <span className="absolute top-1 right-1 bg-red-600 w-2.5 h-2.5 rounded-full border border-white"></span>
              )}
            </Button>
          </div>
        </div>
      </div>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="md:hidden bg-white border-t border-gray-100 overflow-hidden shadow-xl"
          >
            <div className="px-4 py-6 space-y-4">
              {navItems.map((item) => (
                <Link
                  key={item.name}
                  to={item.path}
                  onClick={() => setIsOpen(false)}
                  className={`block px-4 py-3 rounded-lg text-base font-medium transition-colors ${
                    location.pathname === item.path 
                        ? 'bg-primary/10 text-primary' 
                        : 'text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  {item.name}
                </Link>
              ))}
              
              <div className="pt-4 mt-4 border-t border-gray-100">
                {user ? (
                    <div className="space-y-3">
                      <div className="px-4 text-sm text-gray-500 mb-2">
                        Sesión iniciada como <strong className="text-primary">{displayName}</strong>
                      </div>
                      
                      {user.type === 'cliente' && (
                          <>
                             <Link to="/buscar-combos" onClick={() => setIsOpen(false)}>
                                <Button variant="secondary" className="w-full justify-start h-12 text-base mb-2">
                                    <UtensilsCrossed className="w-5 h-5 mr-3" /> Explorar Comida
                                </Button>
                             </Link>
                             <Link to="/carrito" onClick={() => setIsOpen(false)}>
                                <Button variant="outline" className="w-full justify-start h-12 text-base relative">
                                    <ShoppingCart className="w-5 h-5 mr-3" /> Ver Carrito
                                    {cartCount > 0 && (
                                        <span className="ml-auto bg-red-600 text-white text-xs font-bold px-2 py-0.5 rounded-full">
                                            {cartCount} items
                                        </span>
                                    )}
                                </Button>
                             </Link>
                          </>
                      )}
                      
                      {user.type === 'local' && (
                          <Link to="/dashboard/local" onClick={() => setIsOpen(false)}>
                             <Button className="w-full btn-gradient justify-start h-12 text-base">
                                <LayoutDashboard className="w-5 h-5 mr-3" /> Ir a mi Panel
                             </Button>
                          </Link>
                      )}

                      <Button 
                        onClick={() => { logout(); setIsOpen(false); }} 
                        variant="ghost" 
                        className="w-full justify-start h-12 text-base text-red-600 hover:bg-red-50 hover:text-red-700 mt-2"
                      >
                        <LogOut className="w-5 h-5 mr-3" /> Cerrar Sesión
                      </Button>
                    </div>
                ) : (
                  <div className="grid grid-cols-2 gap-3">
                    <Link to="/login" onClick={() => setIsOpen(false)}>
                      <Button variant="outline" className="w-full h-12 text-base">Entrar</Button>
                    </Link>
                    <Link to="/register" onClick={() => setIsOpen(false)}>
                      <Button className="w-full btn-gradient h-12 text-base">Registrarse</Button>
                    </Link>
                  </div>
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </nav>
  );
};

export default Navbar;