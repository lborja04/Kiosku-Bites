import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { Helmet } from 'react-helmet';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import HomePage from '@/pages/HomePage';
import SearchCombos from '@/pages/SearchCombos';
import OurStory from '@/pages/OurStory';
import Contact from '@/pages/Contact';
import ComboDetail from '@/pages/ComboDetail';
import LoginPage from '@/pages/LoginPage';
import RegisterPage from '@/pages/RegisterPage';
import ForBusinessPage from '@/pages/ForBusinessPage';
import { Toaster } from '@/components/ui/toaster';
import { AuthProvider, useAuth } from '@/contexts/AuthContext';
import BusinessDashboard from '@/pages/business/BusinessDashboard';
import CustomerDashboard from '@/pages/customer/CustomerDashboard';
import ShoppingCart from '@/pages/ShoppingCart';
import RestaurantProfile from '@/pages/RestaurantProfile';

const PrivateRoute = ({ children, role }) => {
  const { user } = useAuth();
  if (!user) {
    return <Navigate to="/login" replace />;
  }
  // Support both `type` and `tipo_usuario` keys on the user object
  const userRole = user?.type || user?.tipo_usuario;
  if (role && userRole !== role) {
    return <Navigate to="/" replace />;
  }
  return children;
};

// COMPONENTE AUXILIAR PARA CONTROLAR EL FOOTER
const LayoutWithFooterControl = ({ children }) => {
  const location = useLocation();
  // Lista de rutas donde NO queremos footer
  const hideFooterRoutes = ['/dashboard/local', '/dashboard/cliente'];
  
  // Verificamos si la ruta actual empieza con alguna de las rutas prohibidas
  const showFooter = !hideFooterRoutes.some(path => location.pathname.startsWith(path));

  return (
    <>
      <main className="flex-grow">
        {children}
      </main>
      {showFooter && <Footer />}
    </>
  );
};

function AppContent() {
  return (
    <Router>
      <div className="min-h-screen bg-white flex flex-col">
        <Helmet>
          <title>KIOSKU BITES - Combos de comida a precio reducido</title>
          <meta name="description" content="Descubre combos de comida deliciosos a precios reducidos y ayuda a reducir el desperdicio alimentario con KIOSKU BITES." />
        </Helmet>
        
        {/* Navbar ya tiene su propia lógica interna para ocultarse, así que la dejamos aquí */}
        <Navbar />
        
        {/* Envolvemos las rutas y el footer con nuestra lógica de control */}
        <LayoutWithFooterControl>
          <Routes>
            <Route path="/" element={<HomePage />} />
            <Route path="/buscar-combos" element={<SearchCombos />} />
            <Route path="/nuestra-historia" element={<OurStory />} />
            <Route path="/para-empresas" element={<ForBusinessPage />} />
            <Route path="/contacto" element={<Contact />} />
            <Route path="/combo/:id" element={<ComboDetail />} />
            <Route path="/login" element={<LoginPage />} />
            <Route path="/register" element={<RegisterPage />} />
            <Route path="/local/:id" element={<RestaurantProfile />} />
            
            <Route path="/carrito" element={
              <PrivateRoute>
                <ShoppingCart />
              </PrivateRoute>
            } />

            <Route path="/dashboard/cliente/*" element={
              <PrivateRoute role="cliente">
                <CustomerDashboard />
              </PrivateRoute>
            }/>
            <Route path="/dashboard/local/*" element={
              <PrivateRoute role="local">
                <BusinessDashboard />
              </PrivateRoute>
            }/>
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </LayoutWithFooterControl>
        
        <Toaster />
      </div>
    </Router>
  );
}

function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}

export default App;
