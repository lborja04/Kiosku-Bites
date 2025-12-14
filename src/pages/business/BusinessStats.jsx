import { useState, useEffect, useMemo } from 'react';
import { Helmet } from 'react-helmet';
import { motion } from 'framer-motion';
import { BarChart, Bar, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer, CartesianGrid } from 'recharts';
import { DollarSign, Package, Star, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { subDays, format, parseISO, getDay } from 'date-fns';
import { es } from 'date-fns/locale'; // Para nombres de días en español

// Importaciones de tu lógica de negocio
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/services/supabase';

const BusinessStats = () => {
  const { user } = useAuth();
  const [timeRange, setTimeRange] = useState(15);
  const [loading, setLoading] = useState(true);
  
  // Estados para almacenar la data procesada
  const [chartData, setChartData] = useState([]);
  const [statsTotals, setStatsTotals] = useState({ sales: 0, count: 0, rating: 0 });
  const [bestSelling, setBestSelling] = useState([]);
  const [busiestDays, setBusiestDays] = useState([]);

  useEffect(() => {
    if (user?.db_id) {
      fetchStats();
    }
  }, [user, timeRange]);

  const fetchStats = async () => {
    setLoading(true);
    try {
      const startDate = subDays(new Date(), timeRange);

      // 1. Obtener Compras (Ventas y Combos)
      // Hacemos un inner join con 'combo' para asegurar que la compra pertenece a un combo de ESTE local
      const { data: purchases, error: purchaseError } = await supabase
        .from('compra')
        .select(`
          id_compra,
          fecha_compra,
          precio_unitario_pagado,
          estado,
          combo!inner (
            id_local,
            nombre_bundle
          )
        `)
        .eq('combo.id_local', user.db_id)
        .gte('fecha_compra', startDate.toISOString())
        .neq('estado', 'Cancelado'); // Excluimos cancelados

      if (purchaseError) throw purchaseError;

      // 2. Obtener Calificaciones (Histórico general, no limitado por rango de fecha para ser más preciso en "reputación")
      const { data: reviews, error: reviewError } = await supabase
        .from('resena')
        .select(`
          calificacion,
          combo!inner (
            id_local
          )
        `)
        .eq('combo.id_local', user.db_id);

      if (reviewError) throw reviewError;

      processData(purchases || [], reviews || [], startDate);
    } catch (error) {
      console.error("Error cargando estadísticas:", error);
    } finally {
      setLoading(false);
    }
  };

  const processData = (purchases, reviews, startDate) => {
    // --- A. Totales Generales ---
    const totalSales = purchases.reduce((acc, curr) => acc + Number(curr.precio_unitario_pagado || 0), 0);
    const totalCombos = purchases.length;
    
    const avgRating = reviews.length > 0 
      ? reviews.reduce((acc, curr) => acc + curr.calificacion, 0) / reviews.length 
      : 0;

    setStatsTotals({
      sales: totalSales,
      count: totalCombos,
      rating: avgRating.toFixed(1)
    });

    // --- B. Datos para el Gráfico (Agrupar por día) ---
    // Inicializar mapa de fechas vacías para asegurar que el gráfico muestre días con 0 ventas
    const chartMap = new Map();
    for (let i = 0; i < timeRange; i++) {
        const d = subDays(new Date(), i);
        const key = format(d, 'MMM dd', { locale: es });
        chartMap.set(key, { date: key, ventas: 0, combos: 0, originalDate: d }); // originalDate para ordenar
    }

    purchases.forEach(p => {
        const dateKey = format(parseISO(p.fecha_compra), 'MMM dd', { locale: es });
        if (chartMap.has(dateKey)) {
            const current = chartMap.get(dateKey);
            current.ventas += Number(p.precio_unitario_pagado || 0);
            current.combos += 1;
        }
    });

    // Convertir a array y ordenar por fecha
    const processedChartData = Array.from(chartMap.values())
        .sort((a, b) => a.originalDate - b.originalDate);

    setChartData(processedChartData);

    // --- C. Combos más vendidos ---
    const comboCount = {};
    purchases.forEach(p => {
        const name = p.combo?.nombre_bundle || 'Desconocido';
        comboCount[name] = (comboCount[name] || 0) + 1;
    });

    const sortedCombos = Object.entries(comboCount)
        .map(([name, count]) => ({ name, sold: count }))
        .sort((a, b) => b.sold - a.sold)
        .slice(0, 3);
    
    setBestSelling(sortedCombos);

    // --- D. Días de Mayor Actividad ---
    const daysMap = { 0: 'Domingo', 1: 'Lunes', 2: 'Martes', 3: 'Miércoles', 4: 'Jueves', 5: 'Viernes', 6: 'Sábado' };
    const dayActivity = { 0: 0, 1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0 }; // 0-6 index

    purchases.forEach(p => {
        const dayIndex = getDay(parseISO(p.fecha_compra));
        dayActivity[dayIndex] += 1; // Contamos transacciones como actividad
    });

    // Encontrar el valor máximo para calcular porcentaje
    const maxActivity = Math.max(...Object.values(dayActivity));
    
    const sortedDays = Object.entries(dayActivity)
        .map(([dayIndex, count]) => ({
            day: daysMap[dayIndex],
            count: count,
            activity: maxActivity > 0 ? Math.round((count / maxActivity) * 100) : 0
        }))
        .sort((a, b) => b.count - a.count) // Ordenar por mayor actividad absoluta
        .slice(0, 3); // Top 3 días

    setBusiestDays(sortedDays);
  };

  const statCards = [
    { title: 'Ingresos Totales', value: `$${statsTotals.sales.toLocaleString('en-US', { minimumFractionDigits: 2 })}`, icon: <DollarSign />, color: 'text-green-500' },
    { title: 'Combos Vendidos', value: statsTotals.count, icon: <Package />, color: 'text-blue-500' },
    { title: 'Calificación Promedio', value: statsTotals.rating, icon: <Star />, color: 'text-yellow-500' },
  ];

  if (loading && timeRange === 15 && chartData.length === 0) {
     return <div className="flex justify-center items-center h-96"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;
  }

  return (
    <>
      <Helmet>
        <title>Estadísticas - Dashboard Local</title>
      </Helmet>
      <div className="space-y-8">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <h1 className="text-2xl sm:text-3xl font-bold">Estadísticas del Negocio</h1>
          <div className="flex items-center gap-2 bg-white p-1 rounded-lg shadow-sm self-stretch sm:self-auto">
            {[7, 15, 30].map(days => (
              <Button
                key={days}
                variant={timeRange === days ? 'default' : 'ghost'}
                onClick={() => setTimeRange(days)}
                className={`${timeRange === days ? 'btn-gradient' : ''} flex-1 sm:flex-none text-xs sm:text-sm`}
              >
                Últimos {days} días
              </Button>
            ))}
          </div>
        </div>

        {/* Tarjetas Superiores */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {statCards.map((card, index) => (
            <motion.div
              key={card.title}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
              className="bg-white p-6 rounded-xl shadow-md flex items-center space-x-4"
            >
              <div className={`p-3 rounded-full bg-primary/10 ${card.color}`}>{card.icon}</div>
              <div>
                <p className="text-sm text-gray-500">{card.title}</p>
                <p className="text-2xl font-bold">{card.value}</p>
              </div>
            </motion.div>
          ))}
        </div>

        {/* Gráfico Principal */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }} className="bg-white p-4 sm:p-6 rounded-xl shadow-md">
          <h2 className="text-xl font-bold mb-4">Ventas por Día</h2>
          <div className="w-full overflow-x-auto">
            <div style={{ width: '100%', minWidth: 500, height: 300 }}>
              <ResponsiveContainer>
                <BarChart data={chartData} margin={{ top: 5, right: 20, left: -10, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="date" tick={{ fontSize: 12 }} />
                  <YAxis tickFormatter={(value) => `$${value}`} tick={{ fontSize: 12 }} />
                  <Tooltip
                    cursor={{ fill: 'rgba(0, 97, 95, 0.1)' }}
                    contentStyle={{ backgroundColor: 'white', borderRadius: '0.5rem', border: '1px solid #eee' }}
                    labelStyle={{ fontWeight: 'bold' }}
                    formatter={(value, name) => [name === 'Ingresos' ? `$${value}` : value, name]}
                  />
                  <Legend iconType="circle" iconSize={10} />
                  <Bar dataKey="ventas" fill="#00615F" name="Ingresos" barSize={20} radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </motion.div>

        {/* Listas Inferiores */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          
          {/* Combos más vendidos */}
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }} className="bg-white p-6 rounded-xl shadow-md">
            <h2 className="text-xl font-bold mb-4">Combos Más Vendidos</h2>
            {bestSelling.length > 0 ? (
                <ul className="space-y-3">
                {bestSelling.map((combo, index) => (
                    <li key={index} className="flex justify-between items-center text-sm sm:text-base">
                    <span className="flex-1 pr-2 truncate">{index + 1}. {combo.name}</span>
                    <span className="font-bold bg-gray-100 px-2 py-1 rounded text-xs sm:text-sm whitespace-nowrap">{combo.sold} vendidos</span>
                    </li>
                ))}
                </ul>
            ) : (
                <p className="text-gray-500 text-sm">No hay datos de ventas en este periodo.</p>
            )}
          </motion.div>

          {/* Días de Actividad */}
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 }} className="bg-white p-6 rounded-xl shadow-md">
            <h2 className="text-xl font-bold mb-4">Días de Mayor Actividad</h2>
            {busiestDays.length > 0 && busiestDays[0].count > 0 ? (
                <ul className="space-y-3">
                {busiestDays.map((day, index) => (
                    <li key={day.day} className="flex justify-between items-center text-sm sm:text-base">
                    <span className="w-24">{index + 1}. {day.day}</span>
                    <div className="flex-1 bg-gray-200 rounded-full h-2.5 mx-2">
                        <div className="bg-secondary h-2.5 rounded-full" style={{ width: `${day.activity}%` }}></div>
                    </div>
                    </li>
                ))}
                </ul>
            ) : (
                <p className="text-gray-500 text-sm">No hay suficiente actividad registrada.</p>
            )}
          </motion.div>
        </div>
      </div>
    </>
  );
};

export default BusinessStats;