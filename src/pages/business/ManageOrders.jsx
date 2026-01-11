import React, { useState, useEffect, useMemo } from 'react';
import { Helmet } from 'react-helmet';
import { motion, AnimatePresence } from 'framer-motion';
import { 
    ShoppingBag, 
    Clock, 
    CheckCircle, 
    DollarSign, 
    CreditCard, 
    User, 
    Filter, 
    Loader2, 
    Calendar,
    Package,
    AlertTriangle,
    X
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from '@/components/ui/use-toast';
import { supabase, fetchOrdersForLocal } from '@/services/supabaseAuthClient';
import { useAuth } from '@/contexts/AuthContext';

// Helper: truncate text safely
const truncate = (str, n = 120) => {
    if (!str) return '';
    return str.length > n ? str.slice(0, n).trim() + '...' : str;
};

// --- COMPONENTE MODAL DE CONFIRMACIÓN ---
const ConfirmModal = ({ isOpen, onClose, onConfirm, orderId }) => {
    if (!isOpen) return null;

    return (
        <AnimatePresence>
            <motion.div 
                initial={{ opacity: 0 }} 
                animate={{ opacity: 1 }} 
                exit={{ opacity: 0 }}
                className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
                onClick={onClose}
            >
                <motion.div 
                    initial={{ scale: 0.9, opacity: 0 }} 
                    animate={{ scale: 1, opacity: 1 }}
                    exit={{ scale: 0.9, opacity: 0 }}
                    className="bg-white rounded-2xl shadow-2xl max-w-sm w-full overflow-hidden"
                    onClick={(e) => e.stopPropagation()}
                >
                    <div className="p-6 text-center">
                        <div className="w-16 h-16 bg-yellow-100 rounded-full flex items-center justify-center mx-auto mb-4">
                            <AlertTriangle className="w-8 h-8 text-yellow-600" />
                        </div>
                        <h3 className="text-xl font-bold text-gray-900 mb-2">¿Confirmar entrega?</h3>
                        <p className="text-gray-600 mb-6 text-sm">
                            Estás a punto de marcar el pedido <strong>#{orderId}</strong> como entregado. Esto no se puede deshacer.
                        </p>
                        
                        <div className="flex gap-3">
                            <Button variant="outline" onClick={onClose} className="flex-1">
                                Cancelar
                            </Button>
                            <Button onClick={() => onConfirm(orderId)} className="flex-1 btn-gradient">
                                Confirmar
                            </Button>
                        </div>
                    </div>
                </motion.div>
            </motion.div>
        </AnimatePresence>
    );
};

const ManageOrders = () => {
  const { user } = useAuth();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // Filtros
  const [statusFilter, setStatusFilter] = useState('active'); 
  const [sortOrder, setSortOrder] = useState('newest');

  // Estado del Modal
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState(null);

  // --- 1. CARGAR PEDIDOS ---
  const fetchOrders = async () => {
    if (!user) return;
    try {
      setLoading(true);

      const { data: userData } = await supabase
        .from('usuario')
        .select('id_usuario')
        .eq('id_auth_supabase', user.id)
        .single();

      if (!userData) return;
      const localId = userData.id_usuario;

      // Use centralized helper that includes cliente.usuario.telefono and top-level id_cliente
      const data = await fetchOrdersForLocal(localId);
      setOrders(data || []);

    } catch (err) {
      console.error("Error fetching orders:", err);
      toast({ title: "Error", description: "No se pudieron cargar los pedidos.", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOrders();
  }, [user]);

  // --- 2. PREPARAR CONFIRMACIÓN ---
  const openConfirmModal = (orderId) => {
      setSelectedOrder(orderId);
      setIsModalOpen(true);
  };

  // --- 3. ACCIÓN: MARCAR COMO ENTREGADO (Ejecutada por el modal) ---
  const handleMarkCompleted = async (orderId) => {
    try {
        const { error } = await supabase
            .from('compra')
            .update({ 
                estado: 'Pedido Terminado', 
                entregado: true 
            })
            .eq('id_compra', orderId);

        if (error) throw error;

        toast({ 
            title: "¡Pedido Completado!", 
            description: "Inventario actualizado correctamente.",
            className: "bg-green-50 border-green-200"
        });

        setOrders(prev => prev.map(o => 
            o.id_compra === orderId 
                ? { ...o, estado: 'Pedido Terminado', entregado: true } 
                : o
        ));
        
        // Cerrar modal
        setIsModalOpen(false);
        setSelectedOrder(null);

    } catch (err) {
        console.error("Error updating order:", err);
        toast({ title: "Error", description: "No se pudo actualizar el pedido.", variant: "destructive" });
    }
  };

  // --- FILTROS ---
  const filteredOrders = useMemo(() => {
      let filtered = [...orders];

      if (statusFilter === 'active') {
          filtered = filtered.filter(o => !o.entregado);
      } else if (statusFilter === 'completed') {
          filtered = filtered.filter(o => o.entregado);
      }

      filtered.sort((a, b) => {
          const dateA = new Date(a.fecha_compra);
          const dateB = new Date(b.fecha_compra);
          return sortOrder === 'newest' ? dateB - dateA : dateA - dateB;
      });

      return filtered;
  }, [orders, statusFilter, sortOrder]);

  const getStatusBadge = (status) => {
      switch(status) {
          case 'Pedido Realizado': 
            return <span className="bg-orange-100 text-orange-700 px-3 py-1 rounded-full text-xs font-bold border border-orange-200 flex items-center w-fit"><Clock className="w-3 h-3 mr-1"/> Pendiente</span>;
          case 'Pedido Pagado': 
            return <span className="bg-blue-100 text-blue-700 px-3 py-1 rounded-full text-xs font-bold border border-blue-200 flex items-center w-fit"><CreditCard className="w-3 h-3 mr-1"/> Pagado Online</span>;
          case 'Pedido Terminado': 
            return <span className="bg-gray-100 text-gray-600 px-3 py-1 rounded-full text-xs font-bold border border-gray-200 flex items-center w-fit"><CheckCircle className="w-3 h-3 mr-1"/> Entregado</span>;
          default: 
            return <span className="bg-gray-100 text-gray-600 px-2 py-1 rounded text-xs">{status}</span>;
      }
  };

  if (loading) return <div className="flex h-screen items-center justify-center"><Loader2 className="animate-spin w-10 h-10 text-primary"/></div>;

  return (
    <>
      <Helmet><title>Gestionar Pedidos - KIOSKU BITES</title></Helmet>
      
      {/* Renderizamos el modal aquí */}
      <ConfirmModal 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)} 
        onConfirm={handleMarkCompleted} 
        orderId={selectedOrder} 
      />

      <div className="space-y-6 pb-12">
        
        {/* Header y Filtros */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white p-6 rounded-xl shadow-sm border border-gray-100">
            <div>
                <h1 className="text-2xl font-bold text-gray-900">Pedidos y Entregas</h1>
                <p className="text-gray-500 text-sm">Administra las órdenes entrantes.</p>
            </div>
            
            <div className="flex flex-wrap gap-3">
                <div className="flex items-center bg-gray-50 px-3 py-2 rounded-lg border border-gray-200">
                    <Filter className="w-4 h-4 text-gray-400 mr-2"/>
                    <select 
                        value={statusFilter} 
                        onChange={(e) => setStatusFilter(e.target.value)}
                        className="bg-transparent text-sm font-medium outline-none text-gray-700"
                    >
                        <option value="active">Pendientes de Entrega</option>
                        <option value="completed">Historial Completados</option>
                        <option value="all">Todos los Pedidos</option>
                    </select>
                </div>
                <div className="flex items-center bg-gray-50 px-3 py-2 rounded-lg border border-gray-200">
                    <Calendar className="w-4 h-4 text-gray-400 mr-2"/>
                    <select 
                        value={sortOrder} 
                        onChange={(e) => setSortOrder(e.target.value)}
                        className="bg-transparent text-sm font-medium outline-none text-gray-700"
                    >
                        <option value="newest">Más Recientes</option>
                        <option value="oldest">Más Antiguos</option>
                    </select>
                </div>
            </div>
        </div>

        {/* Lista de Pedidos */}
        <div className="grid grid-cols-1 gap-4">
            <AnimatePresence>
                {filteredOrders.length === 0 ? (
                    <div className="text-center py-20 text-gray-400 bg-white rounded-xl border border-dashed">
                        <ShoppingBag className="w-16 h-16 mx-auto mb-4 opacity-50" />
                        <p>No hay pedidos en esta categoría.</p>
                    </div>
                ) : (
                    filteredOrders.map(order => (
                        <motion.div 
                            key={order.id_compra}
                            layout
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            className={`bg-white border rounded-xl overflow-hidden shadow-sm transition-shadow hover:shadow-md ${order.entregado ? 'border-gray-100 opacity-80' : 'border-blue-100 ring-1 ring-blue-50'}`}
                        >
                            <div className="p-6 flex flex-col lg:flex-row gap-6 items-start lg:items-center">
                                
                                {/* Info Combo e Imagen */}
                                <div className="flex items-start gap-4 flex-1">
                                    <div className="w-16 h-16 bg-gray-100 rounded-lg overflow-hidden shrink-0">
                                        {order.combo.url_imagen && <img src={order.combo.url_imagen} className="w-full h-full object-cover" alt="Combo" />}
                                    </div>
                                    <div>
                                        <div className="flex items-center gap-2 mb-1">
                                            <h3 className="font-bold text-lg text-gray-800">{order.combo.nombre_bundle}</h3>
                                            {getStatusBadge(order.estado)}
                                        </div>
                                        {/* Descripción corta del combo (para historial) */}
                                        {order.combo.descripcion && (
                                            <p className="text-sm text-gray-600 mt-1 max-w-xl">{truncate(order.combo.descripcion, 140)}</p>
                                        )}
                                        <div className="flex items-center text-sm text-gray-500 gap-4 flex-wrap">
                                            <span className="flex items-center"><User className="w-3 h-3 mr-1"/> {order.cliente?.usuario?.nombre || 'Cliente'}</span>
                                            {order.cliente?.usuario?.email && (
                                                <span className="text-sm text-gray-400">• <a href={`mailto:${order.cliente.usuario.email}`} className="underline">{order.cliente.usuario.email}</a></span>
                                            )}
                                            {order.cliente?.usuario?.telefono && (
                                                <span className="text-sm text-gray-400">• <a href={`tel:${order.cliente.usuario.telefono}`} className="underline">{order.cliente.usuario.telefono}</a></span>
                                            )}
                                            {/* AQUÍ SE MUESTRA LA HORA Y FECHA CORRECTA */}
                                            <span className="flex items-center">
                                                <Clock className="w-3 h-3 mr-1"/> 
                                                {new Date(order.fecha_compra).toLocaleString('es-ES', { 
                                                    day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' 
                                                })}
                                            </span>
                                        </div>
                                    </div>
                                </div>

                                {/* Instrucciones de Pago */}
                                {!order.entregado && (
                                    <div className={`flex-1 p-3 rounded-lg border flex items-center gap-3 ${
                                        order.estado === 'Pedido Realizado' 
                                        ? 'bg-orange-50 border-orange-100 text-orange-800' 
                                        : 'bg-green-50 border-green-100 text-green-800'
                                    }`}>
                                        <div className={`p-2 rounded-full ${order.estado === 'Pedido Realizado' ? 'bg-orange-200' : 'bg-green-200'}`}>
                                            {order.estado === 'Pedido Realizado' ? <DollarSign className="w-5 h-5"/> : <CheckCircle className="w-5 h-5"/>}
                                        </div>
                                        <div>
                                            <p className="font-bold text-sm">
                                                {order.estado === 'Pedido Realizado' ? 'Cobrar en Efectivo' : 'Pagado con Tarjeta'}
                                            </p>
                                            <p className="text-xs opacity-90">
                                                {order.estado === 'Pedido Realizado' 
                                                    ? `Cobrar $${order.precio_unitario_pagado} al retirar.` 
                                                    : 'Pago verificado. Entregar.'}
                                            </p>
                                        </div>
                                    </div>
                                )}

                                {/* Acciones y Precio */}
                                <div className="flex flex-col items-end gap-3 min-w-[150px]">
                                    <div className="text-right">
                                        <span className="text-xs text-gray-400 uppercase font-bold">Total</span>
                                        <p className="text-2xl font-black text-gray-900">${order.precio_unitario_pagado}</p>
                                    </div>
                                    
                                    {!order.entregado ? (
                                        <Button 
                                            // AQUI LLAMAMOS AL MODAL EN LUGAR DE CONFIRM DIRECTO
                                            onClick={() => openConfirmModal(order.id_compra)}
                                            className="w-full btn-gradient shadow-md"
                                        >
                                            <Package className="w-4 h-4 mr-2"/>
                                            {order.estado === 'Pedido Realizado' ? 'Cobrado y Entregado' : 'Marcar Entregado'}
                                        </Button>
                                    ) : (
                                        <div className="flex items-center text-green-600 font-bold text-sm bg-green-50 px-3 py-2 rounded-lg">
                                            <CheckCircle className="w-4 h-4 mr-2"/> Finalizado
                                        </div>
                                    )}
                                </div>

                            </div>
                        </motion.div>
                    ))
                )}
            </AnimatePresence>
        </div>

      </div>
    </>
  );
};

export default ManageOrders;