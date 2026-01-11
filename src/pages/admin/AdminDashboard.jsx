import React, { useState, useEffect } from 'react';
import { Routes, Route, Link, useLocation, useNavigate } from 'react-router-dom';
import { Helmet } from 'react-helmet';
import { 
    LayoutDashboard, 
    Users, 
    Store, 
    LogOut, 
    Menu, 
    X, 
    ShieldAlert, 
    TrendingUp,
    ShoppingBag,
    Loader2,
    Trophy, // Nuevo icono
    Award   // Nuevo icono
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/services/supabaseAuthClient';
import { Button } from '@/components/ui/button'; 

// Importamos los otros módulos
import ManageReviews from './ManageReviews';
import ManageLocals from './ManageLocals'; 
import ManageUsers from './ManageUsers';

// --- SUB-COMPONENTE: VISTA GENERAL (ESTADÍSTICAS MEJORADAS) ---
const DashboardStats = () => {
    const [stats, setStats] = useState({
        totalUsers: 0,
        activeLocals: 0,
        monthlySales: 0,
        totalOrders: 0,
        topLocal: { name: 'N/A', count: 0 },
        topCombo: { name: 'N/A', count: 0 }
    });
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchStats = async () => {
            try {
                setLoading(true);

                // 1. Contar Usuarios
                const { count: userCount } = await supabase
                    .from('usuario')
                    .select('*', { count: 'exact', head: true })
                    .eq('tipo_usuario', 'cliente');

                // 2. Contar Locales Activos
                const { count: localCount } = await supabase
                    .from('local')
                    .select('*', { count: 'exact', head: true })
                    .eq('aprobado', true);

                // 3. Obtener Datos de Ventas y Productos para Cálculos
                // Traemos todas las compras con la info del combo y el local anidada
                const { data: salesData, error: salesError } = await supabase
                    .from('compra')
                    .select(`
                        precio_unitario_pagado,
                        fecha_compra,
                        combo:id_combo (
                            nombre_bundle,
                            local:id_local ( nombre_local )
                        )
                    `);

                if (salesError) throw salesError;

                // --- CÁLCULOS EN JAVASCRIPT ---
                
                // A. Ventas del Mes (Dinero)
                const startOfMonth = new Date();
                startOfMonth.setDate(1);
                startOfMonth.setHours(0, 0, 0, 0);
                
                const currentMonthSales = salesData
                    .filter(s => new Date(s.fecha_compra) >= startOfMonth)
                    .reduce((acc, curr) => acc + (Number(curr.precio_unitario_pagado) || 0), 0);

                // B. Calcular Top Local y Top Combo (Histórico)
                const localCounts = {};
                const comboCounts = {};

                salesData.forEach(order => {
                    // Contar Combo
                    const comboName = order.combo?.nombre_bundle || 'Desconocido';
                    comboCounts[comboName] = (comboCounts[comboName] || 0) + 1;

                    // Contar Local
                    // Nota: Accedemos a local a través de combo
                    const localName = order.combo?.local?.nombre_local || 'Desconocido';
                    localCounts[localName] = (localCounts[localName] || 0) + 1;
                });

                // Encontrar el ganador de Locales
                let bestLocal = { name: 'Ninguno', count: 0 };
                Object.entries(localCounts).forEach(([name, count]) => {
                    if (count > bestLocal.count) bestLocal = { name, count };
                });

                // Encontrar el ganador de Combos
                let bestCombo = { name: 'Ninguno', count: 0 };
                Object.entries(comboCounts).forEach(([name, count]) => {
                    if (count > bestCombo.count) bestCombo = { name, count };
                });

                setStats({
                    totalUsers: userCount || 0,
                    activeLocals: localCount || 0,
                    monthlySales: currentMonthSales,
                    totalOrders: salesData.length || 0,
                    topLocal: bestLocal,
                    topCombo: bestCombo
                });

            } catch (error) {
                console.error("Error cargando estadísticas:", error);
            } finally {
                setLoading(false);
            }
        };

        fetchStats();
    }, []);

    if (loading) return <div className="p-12 flex justify-center"><Loader2 className="animate-spin text-indigo-600 w-10 h-10"/></div>;

    return (
        <div className="space-y-8">
            <h1 className="text-3xl font-bold text-gray-800">Panel de Control</h1>
            
            {/* 1. SECCIÓN PRINCIPAL: TARJETAS GRANDES */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {/* Usuarios */}
                <div className="bg-white p-8 rounded-2xl shadow-sm border border-gray-100 flex flex-col justify-between h-40 hover:shadow-md transition-shadow">
                    <div className="flex justify-between items-start">
                        <div>
                            <p className="text-gray-500 font-medium text-sm uppercase tracking-wider">Usuarios</p>
                            <h3 className="text-4xl font-extrabold text-gray-900 mt-2">{stats.totalUsers}</h3>
                        </div>
                        <div className="p-3 bg-blue-50 rounded-xl text-blue-600">
                            <Users className="w-8 h-8"/>
                        </div>
                    </div>
                    <div className="text-xs text-green-600 font-medium mt-auto flex items-center">
                        <span className="w-2 h-2 bg-green-500 rounded-full mr-2"></span> Activos en plataforma
                    </div>
                </div>
                
                {/* Locales */}
                <div className="bg-white p-8 rounded-2xl shadow-sm border border-gray-100 flex flex-col justify-between h-40 hover:shadow-md transition-shadow">
                    <div className="flex justify-between items-start">
                        <div>
                            <p className="text-gray-500 font-medium text-sm uppercase tracking-wider">Locales</p>
                            <h3 className="text-4xl font-extrabold text-gray-900 mt-2">{stats.activeLocals}</h3>
                        </div>
                        <div className="p-3 bg-orange-50 rounded-xl text-orange-600">
                            <Store className="w-8 h-8"/>
                        </div>
                    </div>
                    <div className="text-xs text-orange-600 font-medium mt-auto flex items-center">
                        <span className="w-2 h-2 bg-orange-500 rounded-full mr-2"></span> Aprobados y vendiendo
                    </div>
                </div>

                {/* Ventas */}
                <div className="bg-white p-8 rounded-2xl shadow-sm border border-gray-100 flex flex-col justify-between h-40 hover:shadow-md transition-shadow">
                    <div className="flex justify-between items-start">
                        <div>
                            <p className="text-gray-500 font-medium text-sm uppercase tracking-wider">Ventas (Mes)</p>
                            <h3 className="text-4xl font-extrabold text-green-600 mt-2">${stats.monthlySales.toFixed(2)}</h3>
                        </div>
                        <div className="p-3 bg-green-50 rounded-xl text-green-600">
                            <TrendingUp className="w-8 h-8"/>
                        </div>
                    </div>
                    <div className="text-xs text-gray-400 font-medium mt-auto">
                        Ingresos brutos este mes
                    </div>
                </div>

                {/* Pedidos */}
                <div className="bg-white p-8 rounded-2xl shadow-sm border border-gray-100 flex flex-col justify-between h-40 hover:shadow-md transition-shadow">
                    <div className="flex justify-between items-start">
                        <div>
                            <p className="text-gray-500 font-medium text-sm uppercase tracking-wider">Pedidos Totales</p>
                            <h3 className="text-4xl font-extrabold text-gray-900 mt-2">{stats.totalOrders}</h3>
                        </div>
                        <div className="p-3 bg-purple-50 rounded-xl text-purple-600">
                            <ShoppingBag className="w-8 h-8"/>
                        </div>
                    </div>
                    <div className="text-xs text-gray-400 font-medium mt-auto">
                        Histórico de transacciones
                    </div>
                </div>
            </div>

            {/* 2. SECCIÓN DESTACADOS: TARJETAS ESPECIALES */}
            <h2 className="text-xl font-bold text-gray-800 mt-8">Líderes de la Plataforma</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                
                {/* Local Estrella */}
                <div className="bg-gradient-to-br from-indigo-600 to-indigo-800 rounded-2xl p-8 text-white shadow-xl relative overflow-hidden">
                    <div className="absolute top-0 right-0 p-8 opacity-10">
                        <Trophy className="w-32 h-32" />
                    </div>
                    <div className="relative z-10">
                        <div className="flex items-center gap-3 mb-4">
                            <div className="p-2 bg-white/20 rounded-lg backdrop-blur-sm">
                                <Trophy className="w-6 h-6 text-yellow-300" />
                            </div>
                            <span className="font-semibold text-indigo-100 uppercase tracking-wide text-sm">Local con más ventas</span>
                        </div>
                        <h3 className="text-3xl font-bold mb-1">{stats.topLocal.name}</h3>
                        <p className="text-indigo-200 text-lg">
                            <span className="font-bold text-white">{stats.topLocal.count}</span> pedidos completados
                        </p>
                    </div>
                </div>

                {/* Combo Más Pedido */}
                <div className="bg-gradient-to-br from-pink-600 to-rose-700 rounded-2xl p-8 text-white shadow-xl relative overflow-hidden">
                    <div className="absolute top-0 right-0 p-8 opacity-10">
                        <Award className="w-32 h-32" />
                    </div>
                    <div className="relative z-10">
                        <div className="flex items-center gap-3 mb-4">
                            <div className="p-2 bg-white/20 rounded-lg backdrop-blur-sm">
                                <Award className="w-6 h-6 text-yellow-300" />
                            </div>
                            <span className="font-semibold text-pink-100 uppercase tracking-wide text-sm">Combo Favorito</span>
                        </div>
                        <h3 className="text-3xl font-bold mb-1">{stats.topCombo.name}</h3>
                        <p className="text-pink-200 text-lg">
                            Elegido <span className="font-bold text-white">{stats.topCombo.count}</span> veces por los usuarios
                        </p>
                    </div>
                </div>

            </div>
        </div>
    );
};

// --- COMPONENTE PRINCIPAL: LAYOUT DASHBOARD ---
const AdminDashboard = () => {
  const { user, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const navLinks = [
    { to: '', text: 'Dashboard', icon: <LayoutDashboard className="w-5 h-5" /> },
    { to: 'locales', text: 'Locales', icon: <Store className="w-5 h-5" /> },
    { to: 'usuarios', text: 'Usuarios', icon: <Users className="w-5 h-5" /> },
    { to: 'moderacion', text: 'Moderación', icon: <ShieldAlert className="w-5 h-5" /> },
  ];

  const handleLogout = async () => {
      await logout();
      navigate('/login');
  };

  return (
    <>
      <Helmet>
        <title>Admin Panel - KIOSKU BITES</title>
        <meta name="robots" content="noindex" />
      </Helmet>

      <div className="min-h-screen bg-gray-100 flex flex-col md:flex-row">
        
        {/* SIDEBAR */}
        <aside className="w-64 bg-slate-900 text-slate-300 hidden md:flex flex-col fixed h-full z-20 shadow-xl">
          <div className="p-6 border-b border-slate-800 flex items-center space-x-3">
             <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center font-bold text-white text-xl shadow-lg shadow-indigo-900/50">
                A
             </div>
             <div>
                <h2 className="font-bold text-white text-lg tracking-wide">ADMIN</h2>
                <p className="text-xs text-slate-500 font-medium">Control Center</p>
             </div>
          </div>

          <nav className="flex-grow p-4 space-y-2 mt-4">
            {navLinks.map((link) => {
               const isActive = location.pathname === `/admin/${link.to}` || (link.to === '' && location.pathname === '/admin');
               return (
                  <Link
                    key={link.to}
                    to={`/admin/${link.to}`}
                    className={`flex items-center space-x-3 px-4 py-3 rounded-lg transition-all duration-200 font-medium ${
                      isActive
                        ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-900/20'
                        : 'hover:bg-slate-800 hover:text-white'
                    }`}
                  >
                    {link.icon}
                    <span>{link.text}</span>
                  </Link>
               );
            })}
          </nav>

          <div className="p-4 border-t border-slate-800">
            <div className="mb-4 px-4 flex items-center">
                <div className="w-2 h-2 rounded-full bg-green-500 mr-3 animate-pulse"></div>
                <div className="flex flex-col overflow-hidden">
                    <span className="text-xs font-bold text-white uppercase">Super Admin</span>
                    <span className="text-xs text-slate-500 truncate">{user?.email}</span>
                </div>
            </div>
            <button onClick={handleLogout} className="flex items-center justify-center space-x-2 w-full px-4 py-2 rounded-lg bg-red-500/10 text-red-400 hover:bg-red-600 hover:text-white transition-all font-medium text-sm group">
                <LogOut className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
                <span>Cerrar Sesión</span>
            </button>
          </div>
        </aside>

        {/* CONTENIDO PRINCIPAL */}
        <div className="flex-1 md:ml-64 flex flex-col min-h-screen transition-all duration-300">
            {/* Header Móvil */}
            <header className="md:hidden bg-slate-900 text-white p-4 sticky top-0 z-30 flex justify-between items-center shadow-md">
               <div className="flex items-center gap-2">
                   <div className="w-8 h-8 bg-indigo-600 rounded flex items-center justify-center font-bold">A</div>
                   <span className="font-bold text-lg">Panel Admin</span>
               </div>
               <Button variant="ghost" size="icon" onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)} className="text-white hover:bg-slate-800">
                 {isMobileMenuOpen ? <X /> : <Menu />}
               </Button>
            </header>

            {/* Menú Móvil Overlay */}
            {isMobileMenuOpen && (
                <div className="md:hidden fixed inset-0 z-20 bg-slate-900 pt-20 px-4 space-y-2">
                    {navLinks.map(link => (
                        <Link 
                            key={link.to} 
                            to={`/admin/${link.to}`} 
                            onClick={() => setIsMobileMenuOpen(false)}
                            className="block py-4 px-4 rounded-lg bg-slate-800 text-white font-medium mb-2"
                        >
                            <div className="flex items-center gap-3">
                                {link.icon} {link.text}
                            </div>
                        </Link>
                    ))}
                    <button onClick={handleLogout} className="flex items-center gap-3 w-full py-4 px-4 mt-8 rounded-lg bg-red-600 text-white font-medium">
                        <LogOut className="w-5 h-5"/> Cerrar Sesión
                    </button>
                </div>
            )}

            {/* Rutas del Dashboard */}
            <main className="flex-1 p-6 md:p-8 lg:p-10 bg-gray-50/50">
                <div className="max-w-7xl mx-auto">
                    <Routes>
                        <Route path="/" element={<DashboardStats />} />
                        <Route path="locales" element={<ManageLocals />} />
                        <Route path="usuarios" element={<ManageUsers />} />
                        <Route path="moderacion" element={<ManageReviews />} />
                        <Route path="*" element={<div className="text-center py-20 text-gray-500">Sección en construcción 🚧</div>} />
                    </Routes>
                </div>
            </main>
        </div>
      </div>
    </>
  );
};

export default AdminDashboard;