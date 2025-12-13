import React, { useState, useEffect } from 'react';
import { Helmet } from 'react-helmet';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Calendar, Repeat, Filter, ShoppingBag, MapPin, ExternalLink, Clock, CheckCircle, AlertCircle, Loader2 } from 'lucide-react';
import { toast } from '@/components/ui/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/services/supabaseAuthClient';

const OrderHistory = () => {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const { user } = useAuth();

  // --- 1. CARGAR PEDIDOS DESDE SUPABASE ---
  useEffect(() => {
    const fetchOrders = async () => {
      if (!user) return;

      try {
        setLoading(true);

        // A. Obtener ID del cliente
        const { data: userData } = await supabase
            .from('usuario')
            .select('id_usuario')
            .eq('id_auth_supabase', user.id)
            .single();

        if (!userData) return;

        // B. Obtener Compras con Relaciones (Combo -> Local)
        const { data, error } = await supabase
            .from('compra')
            .select(`
                id_compra,
                fecha_compra,
                estado,
                precio_unitario_pagado,
                entregado,
                combo:id_combo (
                    id_combo,
                    nombre_bundle,
                    url_imagen,
                    descripcion,
                    local:local!fk_combo_local (
                        nombre_local,
                        ubicacion,
                        horario,
                        telefono
                    )
                )
            `)
            .eq('id_cliente', userData.id_usuario)
            .order('fecha_compra', { ascending: false });

        if (error) throw error;

        setOrders(data || []);

      } catch (err) {
        console.error("Error cargando historial:", err);
        toast({ title: "Error", description: "No se pudo cargar el historial.", variant: "destructive" });
      } finally {
        setLoading(false);
      }
    };

    fetchOrders();
  }, [user]);

  // --- HELPERS ---

  // Generar link de Google Maps
  const getMapLink = (coords) => {
      if (!coords) return '#';
      const [lat, lng] = coords.split(',');
      return `https://www.google.com/maps/search/?api=1&query=${lat},${lng}`;
  };

  // Determinar instrucciones según el estado
  const getInstructions = (status, isDelivered) => {
      if (isDelivered || status === 'Pedido Terminado') {
          return { text: "Pedido entregado y disfrutado.", color: "text-gray-500", icon: <CheckCircle className="w-4 h-4 mr-1"/> };
      }
      
      // Lógica de Negocio:
      // "Pedido Pagado" -> Asumimos Tarjeta/Online
      // "Pedido Realizado" -> Asumimos Efectivo (Pendiente de pago en local)
      if (status === 'Pedido Pagado') {
          return { 
              text: "✅ ¡Pagado! Acércate directamente al mostrador a retirar.", 
              color: "text-green-600",
              bg: "bg-green-50"
          };
      }
      
      if (status === 'Pedido Realizado') {
          return { 
              text: "💵 Pago en efectivo: Por favor ten listo el importe exacto al retirar.", 
              color: "text-orange-700",
              bg: "bg-orange-50"
          };
      }

      return { text: "Consulta el estado con el local.", color: "text-blue-600", bg: "bg-blue-50" };
  };

  const getStatusColor = (status) => {
      switch(status) {
          case 'Pedido Pagado': return 'bg-green-100 text-green-800 border-green-200';
          case 'Pedido Realizado': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
          case 'Pedido Terminado': return 'bg-gray-100 text-gray-800 border-gray-200';
          case 'Cancelado': return 'bg-red-100 text-red-800 border-red-200';
          default: return 'bg-gray-100 text-gray-800';
      }
  };

  // --- REPETIR PEDIDO (Añadir al carrito local) ---
  const handleRepeatOrder = (order) => {
    const cartItem = {
        id: order.combo.id_combo,
        name: order.combo.nombre_bundle,
        price: order.precio_unitario_pagado, // Usamos el precio que pagó (o podrías buscar el actual)
        image: order.combo.url_imagen,
        restaurant: order.combo.local?.nombre_local,
        quantity: 1
    };

    const currentCart = JSON.parse(localStorage.getItem('cart')) || [];
    // Verificar si ya está
    const existing = currentCart.find(i => i.id === cartItem.id);
    
    let newCart;
    if (existing) {
        newCart = currentCart.map(i => i.id === cartItem.id ? {...i, quantity: i.quantity + 1} : i);
    } else {
        newCart = [...currentCart, cartItem];
    }

    localStorage.setItem('cart', JSON.stringify(newCart));
    toast({
      title: "¡Al carrito!",
      description: "Hemos añadido este combo para que lo pidas de nuevo.",
      className: "bg-green-50 border-green-200"
    });
  };

  // --- FILTRADO ---
  const filteredOrders = orders.filter(order => {
    if (filter === 'all') return true;
    const orderDate = new Date(order.fecha_compra);
    const filterDate = new Date();
    
    if (filter === 'last_week') {
      filterDate.setDate(filterDate.getDate() - 7);
      return orderDate >= filterDate;
    }
    if (filter === 'last_month') {
      filterDate.setMonth(filterDate.getMonth() - 1);
      return orderDate >= filterDate;
    }
    return true;
  });

  if (loading) return <div className="flex h-96 items-center justify-center"><Loader2 className="animate-spin text-primary w-10 h-10"/></div>;

  return (
    <>
      <Helmet><title>Historial de Pedidos - KIOSKU BITES</title></Helmet>
      
      <div className="space-y-8 pb-12">
        <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4">
          <h1 className="text-3xl font-bold text-gray-900">Historial de Pedidos</h1>
          
          <div className="flex items-center gap-3 bg-white p-2 rounded-lg border border-gray-200 shadow-sm">
            <Filter className="text-gray-400 w-4 h-4 ml-2" />
            <select
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              className="border-none bg-transparent text-sm font-medium text-gray-700 focus:ring-0 cursor-pointer outline-none pr-2"
            >
              <option value="all">Todos los pedidos</option>
              <option value="last_week">Última semana</option>
              <option value="last_month">Último mes</option>
            </select>
          </div>
        </div>

        {filteredOrders.length === 0 ? (
          <div className="text-center bg-white p-16 rounded-2xl shadow-sm border border-dashed border-gray-300">
            <ShoppingBag className="w-20 h-20 mx-auto text-gray-200 mb-6" />
            <h2 className="text-2xl font-bold text-gray-800">Aún no has salvado comida</h2>
            <p className="text-gray-500 mt-2 mb-8 max-w-md mx-auto">Tus pedidos aparecerán aquí. ¡Ayuda al planeta y a tu bolsillo hoy mismo!</p>
            <Link to="/buscar-combos">
                <Button className="btn-gradient shadow-lg">Explorar Ofertas</Button>
            </Link>
          </div>
        ) : (
          <div className="space-y-6">
            {filteredOrders.map((order, index) => {
                const instructions = getInstructions(order.estado, order.entregado);
                const mapsUrl = getMapLink(order.combo.local?.ubicacion);

                return (
                  <motion.div
                    key={order.id_compra}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.05 }}
                    className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden hover:shadow-md transition-shadow"
                  >
                    {/* Header del Pedido */}
                    <div className="p-6 border-b border-gray-50 flex flex-col md:flex-row justify-between md:items-center gap-4">
                      <div className="flex items-start gap-4">
                          {/* Miniatura Imagen */}
                          <div className="w-16 h-16 rounded-lg bg-gray-100 overflow-hidden flex-shrink-0 border border-gray-200">
                              {order.combo.url_imagen && <img src={order.combo.url_imagen} className="w-full h-full object-cover" alt="Combo" />}
                          </div>
                          
                          <div>
                            <h2 className="font-bold text-lg text-gray-900 line-clamp-1">
                                {order.combo.nombre_bundle}
                            </h2>
                            <p className="text-sm text-gray-500 flex items-center gap-2 mb-1">
                                <span className="font-medium text-primary">{order.combo.local?.nombre_local}</span>
                                <span>•</span>
                                <Calendar className="w-3 h-3" />
                                {new Date(order.fecha_compra).toLocaleDateString('es-ES', { day: 'numeric', month: 'long' })}
                            </p>
                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${getStatusColor(order.estado)}`}>
                                {order.estado}
                            </span>
                          </div>
                      </div>

                      <div className="text-right">
                        <p className="text-2xl font-black text-gray-900">${Number(order.precio_unitario_pagado).toFixed(2)}</p>
                        <p className="text-xs text-gray-400">Total pagado</p>
                      </div>
                    </div>

                    {/* Instrucciones y Ubicación */}
                    <div className="p-6 bg-gray-50/50 grid grid-cols-1 md:grid-cols-2 gap-6">
                        
                        {/* Columna Izquierda: Instrucciones */}
                        <div>
                            <h3 className="text-xs font-bold text-gray-400 uppercase mb-3">Instrucciones de Retiro</h3>
                            
                            {/* Caja de Estado/Instrucción */}
                            <div className={`p-4 rounded-xl border mb-4 flex items-start gap-3 ${instructions.bg || 'bg-white'} border-gray-200`}>
                                {instructions.icon || <AlertCircle className={`w-5 h-5 mt-0.5 ${instructions.color}`} />}
                                <div>
                                    <p className={`text-sm font-bold ${instructions.color}`}>
                                        {instructions.text}
                                    </p>
                                    {!order.entregado && (
                                        <p className="text-xs text-gray-500 mt-1">
                                            Muestra este pedido en el local para recibir tu comida.
                                        </p>
                                    )}
                                </div>
                            </div>

                            <div className="text-sm text-gray-600 flex items-center">
                                <Clock className="w-4 h-4 mr-2 text-primary" />
                                Horario: <span className="font-medium ml-1">{order.combo.local?.horario || 'Consultar'}</span>
                            </div>
                        </div>

                        {/* Columna Derecha: Mapa */}
                        <div>
                            <h3 className="text-xs font-bold text-gray-400 uppercase mb-3">Ubicación del Local</h3>
                            <div className="bg-white p-4 rounded-xl border border-gray-200">
                                <p className="font-medium text-gray-800 mb-2 flex items-center">
                                    <MapPin className="w-4 h-4 mr-2 text-red-500" />
                                    {order.combo.local?.nombre_local}
                                </p>
                                <a 
                                    href={mapsUrl} 
                                    target="_blank" 
                                    rel="noopener noreferrer"
                                    className="inline-flex items-center w-full justify-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 transition-colors"
                                >
                                    <ExternalLink className="w-4 h-4 mr-2" />
                                    Ver en Google Maps
                                </a>
                            </div>
                        </div>
                    </div>

                    {/* Footer Acciones */}
                    <div className="px-6 py-4 border-t border-gray-100 flex justify-between items-center bg-white">
                        <div className="text-xs text-gray-400">ID Pedido: #{order.id_compra}</div>
                        <Button variant="outline" size="sm" onClick={() => handleRepeatOrder(order)} className="text-primary border-primary/20 hover:bg-primary/5">
                            <Repeat className="mr-2 h-3 w-3" /> Pedir de nuevo
                        </Button>
                    </div>
                  </motion.div>
                );
            })}
          </div>
        )}
      </div>
    </>
  );
};

export default OrderHistory;