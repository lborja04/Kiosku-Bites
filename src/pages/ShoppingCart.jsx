import React, { useState, useEffect } from 'react';
import { Helmet } from 'react-helmet';
import { motion, AnimatePresence } from 'framer-motion';
import { Link, useNavigate } from 'react-router-dom';
import { Trash2, Plus, Minus, ShoppingCart as ShoppingCartIcon, CreditCard, Banknote, CheckCircle, Loader2, AlertTriangle, XCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from '@/components/ui/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/services/supabaseAuthClient';

// --- MODAL DE ALERTA DE DISPONIBILIDAD ---
const AvailabilityAlertModal = ({ isOpen, onClose }) => {
    if (!isOpen) return null;

    return (
        <AnimatePresence>
            <motion.div 
                initial={{ opacity: 0 }} 
                animate={{ opacity: 1 }} 
                exit={{ opacity: 0 }}
                className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
            >
                <motion.div 
                    initial={{ scale: 0.95, opacity: 0 }} 
                    animate={{ scale: 1, opacity: 1 }}
                    exit={{ scale: 0.95, opacity: 0 }}
                    className="bg-white rounded-2xl shadow-2xl max-w-sm w-full overflow-hidden p-6 text-center"
                >
                    <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                        <XCircle className="w-8 h-8 text-red-600" />
                    </div>
                    
                    <h3 className="text-xl font-bold text-gray-900 mb-2">
                        Carrito Actualizado
                    </h3>
                    
                    <p className="text-gray-600 mb-6 text-sm leading-relaxed">
                        Lo sentimos, algunos productos de tu carrito <strong>ya no están disponibles</strong> (se agotaron o el local cerró) y han sido removidos automáticamente.
                    </p>
                    
                    <p className="text-xs text-gray-400 mb-6">
                        Por favor revisa tu nuevo total antes de confirmar.
                    </p>

                    <Button onClick={onClose} className="w-full btn-gradient py-6 text-lg">
                        Entendido, revisar carrito
                    </Button>
                </motion.div>
            </motion.div>
        </AnimatePresence>
    );
};

const ShoppingCart = () => {
  const [cartItems, setCartItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [paymentMethod, setPaymentMethod] = useState('card'); 
  const [isProcessing, setIsProcessing] = useState(false);
  const [clientId, setClientId] = useState(null);
  
  // ESTADO PARA EL POPUP DE ALERTA
  const [isAvailabilityModalOpen, setIsAvailabilityModalOpen] = useState(false);
  
  const navigate = useNavigate();
  const { user } = useAuth();

  // --- HELPER DE VALIDACIÓN DE HORARIO ---
  const checkTimeWindow = (scheduleString) => {
    if (!scheduleString) return true; 
    try {
        const cleanSchedule = scheduleString.toLowerCase().replace(/\s+/g, ''); 
        const parts = cleanSchedule.split(/[-–a]+/); 
        if (parts.length < 2) return true;

        const getMinutes = (timeStr) => {
            let [time, modifier] = timeStr.split(/(am|pm)/);
            let [h, m] = time.split(':').map(Number);
            if (!m) m = 0; 
            if (modifier === 'pm' && h < 12) h += 12;
            if (modifier === 'am' && h === 12) h = 0;
            return h * 60 + m;
        };

        const startMinutes = getMinutes(parts[0]);
        const endMinutes = getMinutes(parts[1]);
        const now = new Date();
        const currentMinutes = now.getHours() * 60 + now.getMinutes();

        if (endMinutes < startMinutes) {
            return (currentMinutes >= startMinutes || currentMinutes <= endMinutes);
        } else {
            return (currentMinutes >= startMinutes && currentMinutes <= endMinutes);
        }
    } catch (e) { return true; }
  };

  // 1. OBTENER ID CLIENTE
  useEffect(() => {
    const fetchClientId = async () => {
        if(user) {
            const { data, error } = await supabase
                .from('usuario')
                .select('id_usuario')
                .eq('id_auth_supabase', user.id)
                .single();
            
            if(data && !error) {
                 setClientId(data.id_usuario);
            }
        }
    };
    fetchClientId();
  }, [user]);

  // 2. CARGAR CARRITO
  const fetchCart = async () => {
    if (!clientId) return;
    try {
        setLoading(true);
        const { data, error } = await supabase
            .from('carrito_item')
            .select(`
                id_carrito_item,
                cantidad,
                combo:id_combo (
                    id_combo,
                    nombre_bundle,
                    precio_descuento,
                    url_imagen,
                    local:local!fk_combo_local (nombre_local)
                )
            `)
            .eq('id_cliente', clientId)
            .order('id_carrito_item', { ascending: true });

        if (error) throw error;

        const formattedItems = data.map(item => ({
            cartItemId: item.id_carrito_item,
            id: item.combo.id_combo,
            name: item.combo.nombre_bundle,
            price: item.combo.precio_descuento,
            image: item.combo.url_imagen || "https://placehold.co/100",
            restaurant: item.combo.local?.nombre_local || "Restaurante",
            quantity: item.cantidad
        }));

        setCartItems(formattedItems);
        window.dispatchEvent(new Event('cart-updated'));

    } catch (err) {
        console.error("Error cargando carrito:", err);
    } finally {
        setLoading(false);
    }
  };

  useEffect(() => {
      if(clientId) fetchCart();
  }, [clientId]);


  // 3. ACTUALIZAR CANTIDAD
  const handleQuantityChange = async (cartItemId, currentQty, amount) => {
    const newQty = currentQty + amount;
    if (newQty < 1) return;

    setCartItems(prev => prev.map(item => 
        item.cartItemId === cartItemId ? { ...item, quantity: newQty } : item
    ));

    try {
        const { error } = await supabase
            .from('carrito_item')
            .update({ cantidad: newQty })
            .eq('id_carrito_item', cartItemId);

        if (error) throw error;
    } catch (error) {
        console.error("Error actualizando cantidad:", error);
        fetchCart(); 
    }
  };

  // 4. ELIMINAR ITEM
  const handleRemoveItem = async (cartItemId) => {
    try {
        const { error } = await supabase
            .from('carrito_item')
            .delete()
            .eq('id_carrito_item', cartItemId);

        if (error) throw error;

        setCartItems(prev => prev.filter(item => item.cartItemId !== cartItemId));
        window.dispatchEvent(new Event('cart-updated'));
        
        toast({ title: "Eliminado", description: "Producto removido del carrito." });
    } catch (error) {
        console.error("Error eliminando item:", error);
        toast({ title: "Error", description: "No se pudo eliminar.", variant: "destructive" });
    }
  };

  // --- LÓGICA DE COMPRA MEJORADA CON POPUP ---
  const handleCheckout = async () => {
    if (!user || !clientId) {
        toast({ title: "Error", description: "Debes iniciar sesión para comprar.", variant: "destructive" });
        navigate('/login');
        return;
    }

    if (cartItems.length === 0) return;

    setIsProcessing(true);

    try {
        // --- PASO 0: VERIFICACIÓN Y LIMPIEZA AUTOMÁTICA ---
        const { data: validationData, error: valError } = await supabase
            .from('carrito_item')
            .select(`
                id_carrito_item,
                combo:id_combo (
                    nombre_bundle,
                    estadisponible,
                    local:local!fk_combo_local (
                        nombre_local,
                        horario
                    )
                )
            `)
            .eq('id_cliente', clientId);

        if (valError) throw valError;

        const itemsToRemove = [];

        // Detectar items inválidos
        for (const item of validationData) {
            const isAvailable = item.combo.estadisponible;
            const isTimeOk = checkTimeWindow(item.combo.local?.horario);

            if (!isAvailable || !isTimeOk) {
                itemsToRemove.push(item.id_carrito_item);
            }
        }

        // SI HAY ITEMS INVÁLIDOS:
        if (itemsToRemove.length > 0) {
            // 1. Borrar de la DB
            const { error: removeError } = await supabase
                .from('carrito_item')
                .delete()
                .in('id_carrito_item', itemsToRemove);

            if (removeError) throw removeError;

            // 2. Actualizar UI
            await fetchCart(); 

            // 3. ABRIR EL POPUP DE ALERTA Y DETENER
            setIsAvailabilityModalOpen(true);
            setIsProcessing(false);
            return; // DETENEMOS AQUÍ
        }

        // --- PASO 1: INSERTAR COMPRA (Si todo está bien) ---
        const comprasToInsert = [];
        cartItems.forEach(item => {
            for(let i=0; i < item.quantity; i++) {
                comprasToInsert.push({
                    id_cliente: clientId,
                    id_combo: item.id,
                    fecha_compra: new Date().toISOString(),
                    estado: 'Pedido Realizado',
                    precio_unitario_pagado: item.price,
                    entregado: false
                });
            }
        });

        const { error: insertError } = await supabase
            .from('compra')
            .insert(comprasToInsert);

        if (insertError) throw insertError;

        // --- PASO 2: LIMPIAR CARRITO ---
        const { error: deleteError } = await supabase
            .from('carrito_item')
            .delete()
            .eq('id_cliente', clientId);

        if (deleteError) console.error("Error cleaning cart:", deleteError);

        // --- PASO 3: FINALIZAR ---
        setCartItems([]);
        window.dispatchEvent(new Event('cart-updated'));

        toast({
            title: "¡Pedido Confirmado! 🎉",
            description: "Tu reserva ha sido guardada exitosamente.",
            className: "bg-green-50 border-green-200"
        });

        setTimeout(() => {
            navigate('/dashboard/cliente/pedidos');
        }, 1500);

    } catch (error) {
        console.error("Error en checkout:", error);
        toast({
            title: "No se pudo completar",
            description: "Ocurrió un error inesperado.",
            variant: "destructive"
        });
    } finally {
        setIsProcessing(false);
    }
  };

  const subtotal = cartItems.reduce((acc, item) => acc + (item.price * item.quantity), 0);
  const total = subtotal + 0.50; 

  if (loading && cartItems.length === 0) {
      return <div className="min-h-screen flex justify-center items-center"><Loader2 className="animate-spin text-primary w-10 h-10"/></div>;
  }

  return (
    <>
      <Helmet>
        <title>Carrito de Compras - KIOSKU BITES</title>
      </Helmet>
      
      {/* MODAL DE ALERTA */}
      <AvailabilityAlertModal 
        isOpen={isAvailabilityModalOpen} 
        onClose={() => setIsAvailabilityModalOpen(false)} 
      />

      <div className="min-h-screen bg-gray-50 pt-24 pb-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
            <h1 className="text-3xl font-bold text-gray-900 mb-8 flex items-center">
                <ShoppingCartIcon className="w-8 h-8 mr-3 text-primary" />
                Tu Carrito
            </h1>
            
            {cartItems.length === 0 ? (
              <div className="text-center bg-white p-16 rounded-2xl shadow-sm border border-dashed border-gray-300">
                <ShoppingCartIcon className="w-20 h-20 mx-auto text-gray-200 mb-4" />
                <h2 className="text-xl font-bold text-gray-700">Tu carrito está vacío</h2>
                <p className="text-gray-500 mt-2 mb-8">¿Hambre? ¡Hay muchas sorpresas esperándote!</p>
                <Link to="/buscar-combos">
                  <Button size="lg" className="btn-gradient shadow-lg">Buscar Comida</Button>
                </Link>
              </div>
            ) : (
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                
                {/* --- LISTA DE ITEMS --- */}
                <div className="lg:col-span-2 space-y-4">
                  <AnimatePresence>
                    {cartItems.map(item => (
                        <motion.div 
                            key={item.cartItemId} 
                            exit={{ opacity: 0, height: 0, marginBottom: 0 }}
                            className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 flex flex-col sm:flex-row items-center gap-4"
                        >
                        {/* Imagen */}
                        <img 
                            src={item.image} 
                            alt={item.name} 
                            className="w-full sm:w-24 h-24 rounded-lg object-cover" 
                        />
                        
                        {/* Detalles */}
                        <div className="flex-1 text-center sm:text-left">
                            <h3 className="font-bold text-gray-800 text-lg line-clamp-1">{item.name}</h3>
                            <p className="text-sm text-gray-500 mb-1">{item.restaurant}</p>
                            <div className="text-primary font-bold">
                                ${item.price.toFixed(2)}
                            </div>
                        </div>

                        {/* Controles Cantidad */}
                        <div className="flex items-center gap-3 bg-gray-50 p-1 rounded-lg">
                            <Button variant="ghost" size="icon" className="h-8 w-8 hover:bg-white hover:shadow-sm" 
                                onClick={() => handleQuantityChange(item.cartItemId, item.quantity, -1)}
                            >
                                <Minus className="h-3 w-3" />
                            </Button>
                            <span className="w-4 text-center font-bold text-gray-700">{item.quantity}</span>
                            <Button variant="ghost" size="icon" className="h-8 w-8 hover:bg-white hover:shadow-sm" 
                                onClick={() => handleQuantityChange(item.cartItemId, item.quantity, 1)}
                            >
                                <Plus className="h-3 w-3" />
                            </Button>
                        </div>

                        {/* Subtotal Item */}
                        <div className="font-bold text-gray-800 w-20 text-right hidden sm:block">
                            ${(item.price * item.quantity).toFixed(2)}
                        </div>

                        {/* Eliminar */}
                        <Button variant="ghost" size="icon" onClick={() => handleRemoveItem(item.cartItemId)} className="text-gray-400 hover:text-red-500 hover:bg-red-50">
                            <Trash2 className="h-5 w-5" />
                        </Button>
                        </motion.div>
                    ))}
                  </AnimatePresence>
                </div>

                {/* --- RESUMEN Y PAGO --- */}
                <div className="lg:col-span-1">
                  <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 sticky top-24">
                    <h2 className="text-xl font-bold text-gray-900 mb-6">Resumen del Pedido</h2>
                    
                    {/* Lista de precios */}
                    <div className="space-y-3 mb-6 text-sm">
                      <div className="flex justify-between text-gray-600">
                        <span>Subtotal ({cartItems.reduce((acc, i) => acc + i.quantity, 0)} items)</span>
                        <span>${subtotal.toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between text-gray-600">
                        <span>Gastos de gestión</span>
                        <span>$0.50</span>
                      </div>
                      <div className="border-t border-gray-100 pt-3 flex justify-between items-center">
                        <span className="font-bold text-lg text-gray-900">Total a Pagar</span>
                        <span className="font-black text-2xl text-primary">${total.toFixed(2)}</span>
                      </div>
                    </div>

                    {/* Selector Método de Pago */}
                    <div className="mb-6">
                        <h3 className="text-sm font-bold text-gray-700 mb-3">Método de Pago</h3>
                        <div className="grid grid-cols-2 gap-3">
                            <div 
                                onClick={() => setPaymentMethod('card')}
                                className={`cursor-pointer p-3 rounded-xl border flex flex-col items-center justify-center transition-all ${paymentMethod === 'card' ? 'border-primary bg-primary/5 text-primary' : 'border-gray-200 hover:border-gray-300'}`}
                            >
                                <CreditCard className="w-6 h-6 mb-1" />
                                <span className="text-xs font-bold">Tarjeta</span>
                            </div>
                            <div 
                                onClick={() => setPaymentMethod('cash')}
                                className={`cursor-pointer p-3 rounded-xl border flex flex-col items-center justify-center transition-all ${paymentMethod === 'cash' ? 'border-primary bg-primary/5 text-primary' : 'border-gray-200 hover:border-gray-300'}`}
                            >
                                <Banknote className="w-6 h-6 mb-1" />
                                <span className="text-xs font-bold">Efectivo</span>
                            </div>
                        </div>
                    </div>

                    {/* Tarjeta Simulada */}
                    {paymentMethod === 'card' && (
                        <div className="bg-gray-100 p-4 rounded-xl mb-6 flex items-center gap-3 border border-gray-200 opacity-80">
                            <div className="w-10 h-6 bg-gray-800 rounded flex items-center justify-center text-white text-[8px]">VISA</div>
                            <div className="flex-1">
                                <p className="text-xs font-bold text-gray-700">Tarjeta terminada en 4242</p>
                                <p className="text-[10px] text-gray-500">Expira 12/28</p>
                            </div>
                            <CheckCircle className="w-5 h-5 text-green-500" />
                        </div>
                    )}

                    {/* Botón Pagar */}
                    <Button 
                        className="w-full btn-gradient text-lg py-6 shadow-lg hover:shadow-xl transition-all" 
                        onClick={handleCheckout}
                        disabled={isProcessing}
                    >
                      {isProcessing ? (
                          <>
                            <Loader2 className="mr-2 h-5 w-5 animate-spin" /> Procesando...
                          </>
                      ) : (
                          <>
                            Confirmar Pedido
                          </>
                      )}
                    </Button>
                    <p className="text-xs text-center text-gray-400 mt-4">
                        Al confirmar, aceptas nuestros términos y condiciones.
                    </p>
                  </div>
                </div>

              </div>
            )}
          </motion.div>
        </div>
      </div>
    </>
  );
};

export default ShoppingCart;