import React, { useState, useEffect } from 'react';
import { Helmet } from 'react-helmet';
import { motion, AnimatePresence } from 'framer-motion';
import { Link, useNavigate } from 'react-router-dom';
import { Trash2, Plus, Minus, ShoppingCart as ShoppingCartIcon, CreditCard, Banknote, CheckCircle, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from '@/components/ui/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/services/supabaseAuthClient';

const ShoppingCart = () => {
  const [cartItems, setCartItems] = useState([]);
  const [paymentMethod, setPaymentMethod] = useState('card'); // 'card' | 'cash'
  const [isProcessing, setIsProcessing] = useState(false);
  const navigate = useNavigate();
  const { user } = useAuth();

  // Cargar carrito al iniciar
  useEffect(() => {
    const storedCart = JSON.parse(localStorage.getItem('cart')) || [];
    setCartItems(storedCart);
  }, []);

  const updateCart = (updatedCart) => {
    setCartItems(updatedCart);
    localStorage.setItem('cart', JSON.stringify(updatedCart));
  };

  const handleQuantityChange = (id, amount) => {
    const updatedCart = cartItems.map(item =>
      item.id === id ? { ...item, quantity: Math.max(1, item.quantity + amount) } : item
    );
    updateCart(updatedCart);
  };

  const handleRemoveItem = (id) => {
    const updatedCart = cartItems.filter(item => item.id !== id);
    updateCart(updatedCart);
    toast({
      title: "Eliminado",
      description: "Producto removido del carrito.",
    });
  };

  // --- LÓGICA DE COMPRA REAL ---
  const handleCheckout = async () => {
    if (!user) {
        toast({ title: "Error", description: "Debes iniciar sesión para comprar.", variant: "destructive" });
        navigate('/login');
        return;
    }

    // Validación básica
    if (cartItems.length === 0) return;

    setIsProcessing(true);

    try {
        // Obtenemos el ID numérico del cliente desde la tabla 'usuario'
        // (Asumiendo que id_usuario es FK de id_cliente como vimos antes)
        const { data: userData, error: userError } = await supabase
            .from('usuario')
            .select('id_usuario')
            .eq('id_auth_supabase', user.id)
            .single();

        if (userError || !userData) throw new Error("No se pudo identificar al cliente.");
        
        const clienteId = userData.id_usuario;

        // Preparamos las inserciones para la tabla 'compra'
        // Como no hay tabla intermedia 'detalle_compra', creamos una compra por cada item distinto
        // (O si compras 2 del mismo, creamos 1 registro pero no hay campo cantidad en 'compra', 
        //  así que asumiremos que creamos N registros según la cantidad).
        
        const comprasToInsert = [];
        
        cartItems.forEach(item => {
            for(let i=0; i < item.quantity; i++) {
                comprasToInsert.push({
                    id_cliente: clienteId,
                    id_combo: item.id,
                    fecha_compra: new Date().toISOString(), // Fecha actual
                    estado: 'Pedido Realizado', // Estado inicial
                    precio_unitario_pagado: item.discountPrice || item.price, // Precio al momento de comprar
                    entregado: false // Default false
                });
            }
        });

        // Insertar en Supabase
        const { error: insertError } = await supabase
            .from('compra')
            .insert(comprasToInsert);

        if (insertError) throw insertError;

        // Éxito
        toast({
            title: "¡Pedido Confirmado! 🎉",
            description: "Tu reserva ha sido guardada exitosamente.",
            className: "bg-green-50 border-green-200"
        });

        // Limpiar carrito y redirigir
        localStorage.removeItem('cart');
        setCartItems([]);
        
        // Pequeño delay para que vea el toast
        setTimeout(() => {
            navigate('/dashboard/cliente/pedidos');
        }, 1500);

    } catch (error) {
        console.error("Error en checkout:", error);
        toast({
            title: "Error al procesar",
            description: error.message || "Hubo un problema al guardar tu pedido.",
            variant: "destructive"
        });
    } finally {
        setIsProcessing(false);
    }
  };

  const subtotal = cartItems.reduce((acc, item) => acc + (item.discountPrice || item.price) * item.quantity, 0);
  const total = subtotal + 0.50; // Gastos gestión

  return (
    <>
      <Helmet>
        <title>Carrito de Compras - KIOSKU BITES</title>
      </Helmet>
      
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
                            key={item.id} 
                            exit={{ opacity: 0, height: 0, marginBottom: 0 }}
                            className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 flex flex-col sm:flex-row items-center gap-4"
                        >
                        {/* Imagen */}
                        <img 
                            src={item.image || "https://placehold.co/100"} 
                            alt={item.name} 
                            className="w-full sm:w-24 h-24 rounded-lg object-cover" 
                        />
                        
                        {/* Detalles */}
                        <div className="flex-1 text-center sm:text-left">
                            <h3 className="font-bold text-gray-800 text-lg line-clamp-1">{item.name}</h3>
                            <p className="text-sm text-gray-500 mb-1">{item.restaurant}</p>
                            <div className="text-primary font-bold">
                                ${(item.discountPrice || item.price).toFixed(2)}
                            </div>
                        </div>

                        {/* Controles Cantidad */}
                        <div className="flex items-center gap-3 bg-gray-50 p-1 rounded-lg">
                            <Button variant="ghost" size="icon" className="h-8 w-8 hover:bg-white hover:shadow-sm" onClick={() => handleQuantityChange(item.id, -1)}>
                                <Minus className="h-3 w-3" />
                            </Button>
                            <span className="w-4 text-center font-bold text-gray-700">{item.quantity}</span>
                            <Button variant="ghost" size="icon" className="h-8 w-8 hover:bg-white hover:shadow-sm" onClick={() => handleQuantityChange(item.id, 1)}>
                                <Plus className="h-3 w-3" />
                            </Button>
                        </div>

                        {/* Subtotal Item */}
                        <div className="font-bold text-gray-800 w-20 text-right hidden sm:block">
                            ${((item.discountPrice || item.price) * item.quantity).toFixed(2)}
                        </div>

                        {/* Eliminar */}
                        <Button variant="ghost" size="icon" onClick={() => handleRemoveItem(item.id)} className="text-gray-400 hover:text-red-500 hover:bg-red-50">
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
                        <span>Subtotal ({cartItems.length} items)</span>
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

                    {/* Tarjeta Simulada (Solo visual si selecciona Tarjeta) */}
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