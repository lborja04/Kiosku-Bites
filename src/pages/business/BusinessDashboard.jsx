import { useState, useEffect } from 'react';
import { Routes, Route, Link, useLocation } from 'react-router-dom';
import { Helmet } from 'react-helmet';
import { Package, BarChart2, Star, LogOut, Menu, X, Loader2 } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import ManageCombos from '@/pages/business/ManageCombos';
import BusinessStats from '@/pages/business/BusinessStats';
import ManageReviews from '@/pages/business/ManageReviews';
import { Button } from '@/components/ui/button';
import { supabase } from '../../services/supabaseAuthClient';
import LocalDetailsForm from '../../components/business/LocalDetailsForm';

const BusinessDashboard = () => {
  const location = useLocation();
  const { user, logout } = useAuth();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [localDetailsComplete, setLocalDetailsComplete] = useState(null);
  const [loadingDetails, setLoadingDetails] = useState(true);
  const [actualLocalId, setActualLocalId] = useState(null);

  useEffect(() => {
    const checkLocalDetails = async () => {
      if (!user?.id) {
        console.log('No user Auth ID available. Redirecting or showing error.');
        setLoadingDetails(false);
        setLocalDetailsComplete(false);
        return;
      }

      try {
        setLoadingDetails(true);
        console.log('User Auth ID from AuthContext:', user.id);
        const { data: userData, error: userError } = await supabase
          .from('usuario')
          .select('id_usuario')
          .eq('id_auth_supabase', user.id)
          .single();

        if (userError || !userData) {
          console.error('Error fetching id_usuario from "usuario" table or user not found:', userError);
          setLoadingDetails(false);
          setLocalDetailsComplete(false);
          return;
        }
        
        const localNumericId = userData.id_usuario;
        setActualLocalId(localNumericId);
        console.log('Found actual local ID (int8):', localNumericId);
        const { data: localData, error: localError } = await supabase
          .from('local')
          .select('nombre_local, descripcion, telefono, direccion') 
          .eq('id_local', localNumericId);
        if (localError) {
          console.error('Supabase error fetching local details:', localError);
          setLocalDetailsComplete(false);
          return;
        }

        const isComplete = localData && localData.length > 0 && 
          localData[0].nombre_local && 
          localData[0].descripcion && 
          localData[0].telefono && 
          localData[0].direccion;
        
        console.log('Local details complete:', isComplete, 'Data:', localData);
        setLocalDetailsComplete(isComplete);

      } catch (err) {
        console.error('Error checking local details in BusinessDashboard:', err);
        setLocalDetailsComplete(false);
      } finally {
        setLoadingDetails(false);
      }
    };

    checkLocalDetails();
  }, [user?.id]);

  const navLinks = [
    { to: '', text: 'Estadísticas', icon: <BarChart2 className="w-5 h-5" /> },
    { to: 'combos', text: 'Gestionar Combos', icon: <Package className="w-5 h-5" /> },
    { to: 'opiniones', text: 'Gestionar Opiniones', icon: <Star className="w-5 h-5" /> },
  ];

  const handleLinkClick = () => {
    setIsMobileMenuOpen(false);
  };

  const handleLocalDetailsComplete = () => {
    setLocalDetailsComplete(true);
  };

  if (loadingDetails) {
    return (
      <div className="min-h-screen bg-gray-50 flex justify-center items-center">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
        <p className="ml-4 text-xl text-gray-700">Verificando datos de tu local...</p>
      </div>
    );
  }

  if (!localDetailsComplete && actualLocalId !== null) {
    return <LocalDetailsForm userId={actualLocalId} onComplete={handleLocalDetailsComplete} />;
  }

  if (!user?.id || actualLocalId === null) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col justify-center items-center">
        <p className="text-xl text-red-600">No se pudo cargar la información de tu local o no estás autorizado.</p>
        <Button onClick={logout} className="mt-4">Volver a iniciar sesión</Button>
      </div>
    );
  }


  return (
    <>
      <Helmet>
        <title>Dashboard del Local - KIOSKU BITES</title>
      </Helmet>
      <div className="min-h-screen bg-gray-50 pt-16 overflow-x-auto">
        <div className="flex">
          {/* Sidebar para Desktop */}
          <aside className="w-64 bg-white p-4 border-r border-gray-200 hidden md:flex flex-col h-screen fixed top-16 left-0">
            <div className="flex-grow">
              <h2 className="text-lg font-semibold mb-4 p-2">{user?.name || 'Local'}</h2>
              <nav className="flex flex-col space-y-2">
                {navLinks.map((link) => (
                  <Link
                    key={link.to}
                    to={`/dashboard/local/${link.to}`}
                    className={`flex items-center space-x-3 px-3 py-2 rounded-lg transition-colors ${
                      location.pathname === `/dashboard/local/${link.to}` || (link.to === '' && location.pathname === '/dashboard/local')
                        ? 'bg-primary text-white'
                        : 'text-gray-600 hover:bg-gray-100'
                    }`}
                  >
                    {link.icon}
                    <span>{link.text}</span>
                  </Link>
                ))}
              </nav>
            </div>
            <div>
                <button onClick={logout} className="flex items-center space-x-3 px-3 py-2 rounded-lg text-gray-600 hover:bg-red-100 hover:text-red-600 w-full">
                    <LogOut className="w-5 h-5" />
                    <span>Cerrar Sesión</span>
                </button>
            </div>
          </aside>

          <main className="flex-1 md:ml-64 p-4 sm:p-6 pt-8">
            {/* Header para Móvil */}
            <div className="md:hidden mb-4 p-2 bg-white rounded-lg shadow-sm flex justify-between items-center">
              <h2 className="text-lg font-semibold">{user?.name || 'Menú del Local'}</h2>
              <Button variant="ghost" size="icon" onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}>
                {isMobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
              </Button>
            </div>

            {/* Menú para Móvil */}
            {isMobileMenuOpen && (
              <div className="md:hidden mb-4 bg-white rounded-lg shadow-sm p-4">
                <nav className="flex flex-col space-y-2">
                  {navLinks.map((link) => (
                    <Link
                      key={link.to}
                      to={`/dashboard/local/${link.to}`}
                      onClick={handleLinkClick}
                      className={`flex items-center space-x-3 px-3 py-2 rounded-lg transition-colors ${
                        location.pathname === `/dashboard/local/${link.to}` || (link.to === '' && location.pathname === '/dashboard/local')
                          ? 'bg-primary text-white'
                          : 'text-gray-600 hover:bg-gray-100'
                      }`}
                    >
                      {link.icon}
                      <span>{link.text}</span>
                    </Link>
                  ))}
                  <button onClick={() => { logout(); handleLinkClick(); }} className="flex items-center space-x-3 px-3 py-2 rounded-lg text-gray-600 hover:bg-red-100 hover:text-red-600 w-full">
                      <LogOut className="w-5 h-5" />
                      <span>Cerrar Sesión</span>
                  </button>
                </nav>
              </div>
            )}

            <Routes>
              <Route path="/" element={<BusinessStats />} />
              <Route path="combos" element={<ManageCombos />} />
              <Route path="opiniones" element={<ManageReviews />} />
            </Routes>
          </main>
        </div>
      </div>
    </>
  );
};

export default BusinessDashboard;