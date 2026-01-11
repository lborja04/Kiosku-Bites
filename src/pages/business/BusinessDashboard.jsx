import { useState, useEffect } from 'react';
import { Routes, Route, Link, useLocation } from 'react-router-dom';
import { Helmet } from 'react-helmet';
import { motion, AnimatePresence } from 'framer-motion'; // Asegúrate de importar motion
import { Package, BarChart2, Star, LogOut, Menu, X, Loader2, ShoppingBag, Settings, Store, AlertTriangle } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import ManageCombos from '@/pages/business/ManageCombos';
import BusinessStats from '@/pages/business/BusinessStats';
import ManageReviews from '@/pages/business/ManageReviews';
import BusinessSettings from './BusinessSettings';
import { Button } from '@/components/ui/button';
import { supabase } from '../../services/supabaseAuthClient';
import LocalDetailsForm from '../../components/business/LocalDetailsForm';
import ManageOrders from './ManageOrders';

// --- MODAL DE CUENTA NO APROBADA ---
const ApprovalPendingModal = ({ isOpen, onLogout }) => {
    if (!isOpen) return null;
    return (
        <AnimatePresence>
            <motion.div 
                initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
            >
                <motion.div 
                    initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} 
                    className="bg-white rounded-2xl shadow-2xl max-w-md w-full overflow-hidden p-6 text-center"
                >
                    <div className="w-16 h-16 bg-yellow-100 rounded-full flex items-center justify-center mx-auto mb-4">
                        <AlertTriangle className="w-8 h-8 text-yellow-600" />
                    </div>
                    <h3 className="text-xl font-bold text-gray-900 mb-2">Cuenta en Revisión</h3>
                    <p className="text-gray-600 mb-6 leading-relaxed">
                        Tu perfil de local ha sido creado pero aún está pendiente de aprobación por parte de nuestros administradores. 
                        <br/><br/>
                        Te notificaremos cuando tu cuenta esté activa.
                    </p>
                    <Button onClick={onLogout} className="w-full btn-gradient">
                        Entendido, Cerrar Sesión
                    </Button>
                </motion.div>
            </motion.div>
        </AnimatePresence>
    );
};

const BusinessDashboard = () => {
  const location = useLocation();
  const { user, logout } = useAuth();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  
  // Estados de control
  const [localDetailsComplete, setLocalDetailsComplete] = useState(null);
  const [loadingDetails, setLoadingDetails] = useState(true);
  const [actualLocalId, setActualLocalId] = useState(null);
  const [localName, setLocalName] = useState('');
  
  // Nuevo Estado: Aprobación
  const [isApproved, setIsApproved] = useState(true); // Asumimos true para no flashear error, luego validamos

  useEffect(() => {
    const checkLocalDetails = async () => {
      if (!user?.id) {
        setLoadingDetails(false);
        setLocalDetailsComplete(false);
        return;
      }

      try {
        setLoadingDetails(true);
        
        // 1. Obtener ID local
        const { data: userData, error: userError } = await supabase
          .from('usuario')
          .select('id_usuario')
          .eq('id_auth_supabase', user.id)
          .single();

        if (userError || !userData) throw userError;
        
        const localNumericId = userData.id_usuario;
        setActualLocalId(localNumericId);

        // 2. Obtener detalles del local (incluyendo 'aprobado')
        const { data: localData, error: localError } = await supabase
          .from('local')
          .select('nombre_local, descripcion, telefono, ubicacion, horario, aprobado') 
          .eq('id_local', localNumericId);

        if (localError) throw localError;

        const currentLocal = localData?.[0];
        
        if (currentLocal) {
            setLocalName(currentLocal.nombre_local);

            // Verificamos si completó el formulario básico
            const isComplete = 
                currentLocal.nombre_local && 
                currentLocal.descripcion && 
                currentLocal.telefono && 
                currentLocal.ubicacion && 
                currentLocal.horario; 

            setLocalDetailsComplete(!!isComplete);
            
            // Verificamos APROBACIÓN
            // Solo si ya completó el perfil nos importa si está aprobado o no.
            if (isComplete) {
                setIsApproved(currentLocal.aprobado); 
            }

        } else {
            // Si no existe registro en tabla 'local', no está completo (es nuevo)
            setLocalDetailsComplete(false);
            setIsApproved(false); // Técnicamente no está aprobado, pero dejaremos que llene el form primero
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

  const navLinks = [
    { to: '', text: 'Resumen', icon: <BarChart2 className="w-5 h-5" /> },
    { to: 'pedidos', text: 'Pedidos / Entregas', icon: <ShoppingBag className="w-5 h-5" /> },
    { to: 'combos', text: 'Mis Combos', icon: <Package className="w-5 h-5" /> },
    { to: 'opiniones', text: 'Reseñas', icon: <Star className="w-5 h-5" /> },
    { to: 'configuracion', text: 'Configuración', icon: <Settings className="w-5 h-5" /> },
  ];

  const handleLinkClick = () => {
    setIsMobileMenuOpen(false);
  };

  const handleLocalDetailsComplete = () => {
    setLocalDetailsComplete(true);
    // Al terminar el registro, recargamos para que ahora caiga en la validación de "aprobado"
    window.location.reload(); 
  };

  // --- RENDERING CONDICIONAL ---

  // 1. Cargando
  if (loadingDetails) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col justify-center items-center">
        <Loader2 className="h-12 w-12 animate-spin text-primary mb-4" />
        <p className="text-xl text-gray-600 font-medium">Cargando tu negocio...</p>
      </div>
    );
  }

  // 2. Si falta info, mostramos el formulario (PRIMERA VEZ)
  if (!localDetailsComplete && actualLocalId !== null) {
    return <LocalDetailsForm userId={actualLocalId} onComplete={handleLocalDetailsComplete} />;
  }

  // 3. Si perfil está completo PERO NO APROBADO -> Popup y bloqueo
  if (localDetailsComplete && !isApproved) {
      return (
          <>
            <Helmet><title>Cuenta en Revisión - KIOSKU BITES</title></Helmet>
            <div className="min-h-screen bg-gray-100 flex items-center justify-center">
                {/* Fondo borroso del dashboard (efecto visual) */}
                <div className="absolute inset-0 bg-white/50 backdrop-blur-md z-10" />
                <ApprovalPendingModal isOpen={true} onLogout={logout} />
            </div>
          </>
      );
  }

  // 4. Si hay error de auth
  if (!user?.id || actualLocalId === null) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col justify-center items-center p-4 text-center">
        <p className="text-xl text-red-600 mb-4">No pudimos identificar tu cuenta de local.</p>
        <Button onClick={logout}>Volver al inicio</Button>
      </div>
    );
  }

  // 5. Dashboard Normal (Aprobado y Completo)
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