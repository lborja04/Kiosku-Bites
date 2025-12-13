import { useState, useEffect } from 'react';
import { Routes, Route, Link, useLocation } from 'react-router-dom';
import { Helmet } from 'react-helmet';
// Agregué nuevos iconos para las sugerencias
import { Package, BarChart2, Star, LogOut, Menu, X, Loader2, ShoppingBag, Settings, Store } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import ManageCombos from '@/pages/business/ManageCombos';
import BusinessStats from '@/pages/business/BusinessStats';
import ManageReviews from '@/pages/business/ManageReviews';
import BusinessSettings from './BusinessSettings';
import { Button } from '@/components/ui/button';
import { supabase } from '../../services/supabaseAuthClient';
import LocalDetailsForm from '../../components/business/LocalDetailsForm';
import ManageOrders from './ManageOrders';

const BusinessDashboard = () => {
  const location = useLocation();
  const { user, logout } = useAuth();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  
  // Estado para controlar si ya llenó el perfil
  const [localDetailsComplete, setLocalDetailsComplete] = useState(null);
  const [loadingDetails, setLoadingDetails] = useState(true);
  const [actualLocalId, setActualLocalId] = useState(null);
  
  // Estado para guardar el nombre real del local y mostrarlo en el sidebar
  const [localName, setLocalName] = useState('');

  useEffect(() => {
    const checkLocalDetails = async () => {
      if (!user?.id) {
        setLoadingDetails(false);
        setLocalDetailsComplete(false);
        return;
      }

      try {
        setLoadingDetails(true);
        
        // 1. Obtener el ID numérico del local desde la tabla usuario
        const { data: userData, error: userError } = await supabase
          .from('usuario')
          .select('id_usuario')
          .eq('id_auth_supabase', user.id)
          .single();

        if (userError || !userData) throw userError;
        
        const localNumericId = userData.id_usuario;
        setActualLocalId(localNumericId);

        // 2. Obtener los detalles del local para ver si están completos
        // NOTA: Cambié 'direccion' por 'ubicacion' y 'horario' para coincidir con tu formulario anterior
        const { data: localData, error: localError } = await supabase
          .from('local')
          .select('nombre_local, descripcion, telefono, ubicacion, horario') 
          .eq('id_local', localNumericId);

        if (localError) throw localError;

        // Verificamos si existe data y si los campos críticos tienen valor
        const currentLocal = localData?.[0];
        
        if (currentLocal) {
            // Guardamos el nombre para el UI
            setLocalName(currentLocal.nombre_local);

            const isComplete = 
                currentLocal.nombre_local && 
                currentLocal.descripcion && 
                currentLocal.telefono && 
                currentLocal.ubicacion && // Verificamos ubicación
                currentLocal.horario;     // Verificamos horario

            setLocalDetailsComplete(!!isComplete);
        } else {
            setLocalDetailsComplete(false);
        }

      } catch (err) {
        console.error('Error checking local details:', err);
        setLocalDetailsComplete(false);
      } finally {
        setLoadingDetails(false);
      }
    };

    checkLocalDetails();
  }, [user?.id]);

  // --- SUGERENCIAS DE NUEVAS SECCIONES ---
  const navLinks = [
    { to: '', text: 'Resumen', icon: <BarChart2 className="w-5 h-5" /> }, // Stats
    { to: 'pedidos', text: 'Pedidos / Entregas', icon: <ShoppingBag className="w-5 h-5" /> }, // ¡NUEVO!
    { to: 'combos', text: 'Mis Combos', icon: <Package className="w-5 h-5" /> },
    { to: 'opiniones', text: 'Reseñas', icon: <Star className="w-5 h-5" /> },
    { to: 'configuracion', text: 'Configuración', icon: <Settings className="w-5 h-5" /> }, // ¡NUEVO!
  ];

  const handleLinkClick = () => {
    setIsMobileMenuOpen(false);
  };

  // Callback cuando el formulario se completa exitosamente
  const handleLocalDetailsComplete = () => {
    // Forzamos una recarga rápida o actualizamos estado para quitar el formulario
    setLocalDetailsComplete(true);
    // Opcional: Podrías volver a hacer fetch del nombre aquí
    window.location.reload(); 
  };

  // 1. Estado de Carga
  if (loadingDetails) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col justify-center items-center">
        <Loader2 className="h-12 w-12 animate-spin text-primary mb-4" />
        <p className="text-xl text-gray-600 font-medium">Cargando tu negocio...</p>
      </div>
    );
  }

  // 2. Si falta info, mostramos el formulario que creamos antes
  if (!localDetailsComplete && actualLocalId !== null) {
    return <LocalDetailsForm userId={actualLocalId} onComplete={handleLocalDetailsComplete} />;
  }

  // 3. Si hay error de auth
  if (!user?.id || actualLocalId === null) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col justify-center items-center p-4 text-center">
        <p className="text-xl text-red-600 mb-4">No pudimos identificar tu cuenta de local.</p>
        <Button onClick={logout}>Volver al inicio</Button>
      </div>
    );
  }

  return (
    <>
      <Helmet>
        <title>{localName ? `${localName} - Panel` : 'Dashboard Local'}</title>
      </Helmet>
      
      <div className="min-h-screen bg-gray-50 flex flex-col md:flex-row">
        
        {/* --- SIDEBAR DESKTOP --- */}
        <aside className="w-64 bg-white border-r border-gray-200 hidden md:flex flex-col fixed h-full z-10">
          <div className="p-6 border-b border-gray-100 flex items-center space-x-3">
             <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center text-primary">
                <Store className="w-6 h-6" />
             </div>
             <div>
                <h2 className="font-bold text-gray-800 leading-tight truncate w-32" title={localName}>
                    {localName || 'Mi Local'}
                </h2>
                <span className="text-xs text-green-600 font-medium flex items-center">
                    <span className="w-2 h-2 bg-green-500 rounded-full mr-1"></span> Online
                </span>
             </div>
          </div>

          <nav className="flex-grow p-4 space-y-1 overflow-y-auto">
            {navLinks.map((link) => {
               const isActive = location.pathname === `/dashboard/local/${link.to}` || (link.to === '' && location.pathname === '/dashboard/local');
               return (
                  <Link
                    key={link.to}
                    to={`/dashboard/local/${link.to}`}
                    className={`flex items-center space-x-3 px-4 py-3 rounded-xl transition-all duration-200 font-medium ${
                      isActive
                        ? 'bg-primary text-white shadow-md shadow-primary/20'
                        : 'text-gray-500 hover:bg-gray-50 hover:text-primary'
                    }`}
                  >
                    {link.icon}
                    <span>{link.text}</span>
                  </Link>
               );
            })}
          </nav>

          <div className="p-4 border-t border-gray-100">
            <button 
                onClick={logout} 
                className="flex items-center space-x-3 px-4 py-3 rounded-xl text-gray-500 hover:bg-red-50 hover:text-red-600 w-full transition-colors font-medium"
            >
                <LogOut className="w-5 h-5" />
                <span>Cerrar Sesión</span>
            </button>
          </div>
        </aside>

        {/* --- MAIN CONTENT --- */}
        <div className="flex-1 md:ml-64 flex flex-col min-h-screen">
            
            {/* HEADER MÓVIL */}
            <header className="md:hidden bg-white border-b border-gray-200 p-4 sticky top-0 z-20 flex justify-between items-center shadow-sm">
              <div className="flex items-center space-x-2">
                 <Store className="w-6 h-6 text-primary" />
                 <span className="font-bold text-lg truncate max-w-[200px]">{localName || 'Mi Local'}</span>
              </div>
              <Button variant="ghost" size="icon" onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}>
                {isMobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
              </Button>
            </header>

            {/* MENÚ MÓVIL OVERLAY */}
            {isMobileMenuOpen && (
              <div className="md:hidden fixed inset-0 z-10 bg-gray-800/50" onClick={() => setIsMobileMenuOpen(false)}>
                <div className="bg-white w-3/4 h-full shadow-2xl p-4 pt-20 space-y-2" onClick={e => e.stopPropagation()}>
                    {navLinks.map((link) => {
                        const isActive = location.pathname === `/dashboard/local/${link.to}` || (link.to === '' && location.pathname === '/dashboard/local');
                        return (
                            <Link
                                key={link.to}
                                to={`/dashboard/local/${link.to}`}
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
                    <button 
                        onClick={() => { logout(); handleLinkClick(); }} 
                        className="flex items-center space-x-3 px-4 py-3 rounded-xl text-red-500 hover:bg-red-50 w-full mt-8 font-medium"
                    >
                        <LogOut className="w-5 h-5" />
                        <span>Cerrar Sesión</span>
                    </button>
                </div>
              </div>
            )}

            {/* CONTENIDO DE LAS PÁGINAS */}
            <main className="flex-1 p-4 sm:p-8 overflow-y-auto">
              <Routes>
                <Route path="/" element={<BusinessStats />} />
                <Route path="combos" element={<ManageCombos />} />
                <Route path="opiniones" element={<ManageReviews />} />
                
                {/* Rutas nuevas (puedes implementarlas paso a paso) */}
                <Route path="pedidos" element={<ManageOrders />} />
                <Route path="configuracion" element={<BusinessSettings />} />
              </Routes>
            </main>
        </div>
      </div>
    </>
  );
};

export default BusinessDashboard;