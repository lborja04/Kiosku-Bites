import React, { useState, useEffect } from 'react';
import { Helmet } from 'react-helmet';
import { motion, AnimatePresence } from 'framer-motion';
import { User, Mail, Edit, Shield, Key, PiggyBank, Leaf, Heart, Save, X, Loader2, CheckCircle } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { toast } from '@/components/ui/use-toast';
import { supabase } from '@/services/supabaseAuthClient';

const Profile = () => {
  const { user, login } = useAuth(); // 'login' sirve para actualizar el contexto localmente

  // --- ESTADOS ---
  const [isEditingName, setIsEditingName] = useState(false);
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  
  const [loading, setLoading] = useState(false);
  
  // Datos Formularios
  const [newName, setNewName] = useState('');
  const [passwords, setPasswords] = useState({ new: '', confirm: '' });

  // --- NUEVO: Estado para Estadísticas ---
  const [stats, setStats] = useState({
    combosSalvados: 0,
    dineroAhorrado: 0,
    localesFavoritos: 0
  });

  // Sincronizar nombre inicial
  useEffect(() => {
    if (user) {
      setNewName(user.nombre || user.name || '');
      fetchStats(); // Cargar estadísticas al montar
    }
  }, [user]);

  // --- NUEVO: Función para buscar estadísticas ---
  const fetchStats = async () => {
    if (!user) return;
    try {
        // Obtenemos el ID numérico (de base de datos) del usuario
        let userId = user.db_id;
        
        // Fallback por si el contexto no tiene el db_id, lo buscamos
        if (!userId) {
             const { data: dbUser } = await supabase
                .from('usuario')
                .select('id_usuario')
                .eq('id_auth_supabase', user.id)
                .single();
             userId = dbUser?.id_usuario;
        }

        if (!userId) return;

        // 1. Obtener Compras (Combos salvados y Dinero ahorrado)
        const { data: compras } = await supabase
            .from('compra')
            .select(`
                precio_unitario_pagado,
                estado,
                combo ( precio )
            `)
            .eq('id_cliente', userId)
            .neq('estado', 'Cancelado');

        // 2. Obtener Favoritos
        const { count: favCount } = await supabase
            .from('favoritos')
            .select('*', { count: 'exact', head: true })
            .eq('id_cliente', userId);

        // Cálculos
        const totalCombos = compras?.length || 0;
        const totalAhorrado = compras?.reduce((acc, item) => {
            const precioOriginal = Number(item.combo?.precio) || 0;
            const precioPagado = Number(item.precio_unitario_pagado) || 0;
            return acc + Math.max(0, precioOriginal - precioPagado);
        }, 0) || 0;

        setStats({
            combosSalvados: totalCombos,
            dineroAhorrado: totalAhorrado,
            localesFavoritos: favCount || 0
        });

    } catch (error) {
        console.error("Error al cargar estadísticas", error);
    }
  };

  // --- HELPERS VISUALES ---
  const displayName = user?.nombre || user?.name || user?.email || 'Usuario';
  const displayEmail = user?.email || 'No disponible';
  const initial = displayName.charAt(0).toUpperCase(); 
  const role = user?.type === 'local' ? 'Local Asociado' : 'Cliente Foodie';

  // --- FUNCIÓN 1: ACTUALIZAR NOMBRE ---
  const handleUpdateName = async () => {
    if (!newName.trim()) {
      toast({ title: "Error", description: "El nombre no puede estar vacío.", variant: "destructive" });
      return;
    }

    setLoading(true);
    try {
      // 1. Actualizar SQL (Tabla 'usuario')
      const { error: dbError } = await supabase
        .from('usuario')
        .update({ nombre: newName })
        .eq('id_auth_supabase', user.id);

      if (dbError) throw dbError;

      // 2. Actualizar Metadata de Auth (para sincronía)
      const { error: authError } = await supabase.auth.updateUser({
        data: { nombre: newName }
      });
      if (authError) throw authError;

      // 3. Actualizar Contexto React (Feedback inmediato)
      login({ ...user, nombre: newName, name: newName });

      toast({ 
        title: "¡Nombre actualizado!", 
        description: "Tu perfil se ve genial.", 
        className: "bg-green-50 border-green-200" 
      });
      setIsEditingName(false);

    } catch (error) {
      console.error("Error updating profile:", error);
      toast({ title: "Error", description: "No se pudo actualizar el nombre. Revisa tu conexión.", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  // --- FUNCIÓN 2: CAMBIAR CONTRASEÑA ---
  const handleChangePassword = async () => {
    if (passwords.new.length < 6) {
        toast({ title: "Contraseña insegura", description: "Debe tener al menos 6 caracteres.", variant: "destructive" });
        return;
    }
    if (passwords.new !== passwords.confirm) {
        toast({ title: "No coinciden", description: "Las contraseñas no son iguales.", variant: "destructive" });
        return;
    }

    setLoading(true);
    try {
        const { error } = await supabase.auth.updateUser({ 
            password: passwords.new 
        });

        if (error) throw error;

        toast({ 
            title: "Contraseña Actualizada", 
            description: "Usa tu nueva contraseña la próxima vez.", 
            className: "bg-green-50 border-green-200"
        });
        setIsChangingPassword(false);
        setPasswords({ new: '', confirm: '' });

    } catch (error) {
        console.error("Error password:", error);
        toast({ title: "Error", description: error.message, variant: "destructive" });
    } finally {
        setLoading(false);
    }
  };

  return (
    <>
      <Helmet><title>Mi Perfil - KIOSKU BITES</title></Helmet>
      
      <div className="space-y-6 pb-12">
        <div className="flex flex-col md:flex-row justify-between md:items-center gap-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Mi Perfil</h1>
            <p className="text-gray-500">Gestiona tu información personal y seguridad.</p>
          </div>
        </div>

        {/* --- TARJETA PRINCIPAL (NOMBRE) --- */}
        <div className="bg-white p-8 rounded-2xl shadow-sm border border-gray-100 flex flex-col md:flex-row items-center gap-8">
          {/* Avatar */}
          <div className="w-28 h-28 bg-gradient-to-br from-primary to-orange-400 rounded-full flex items-center justify-center text-white text-5xl font-bold shadow-lg shrink-0">
            {initial}
          </div>
          
          <div className="flex-1 text-center md:text-left space-y-3 w-full">
            <div>
                {/* EDICIÓN DE NOMBRE */}
                {isEditingName ? (
                    <div className="flex items-center gap-2 max-w-md mx-auto md:mx-0">
                        <input 
                            type="text" 
                            value={newName}
                            onChange={(e) => setNewName(e.target.value)}
                            className="text-2xl font-bold text-gray-900 w-full border-b-2 border-primary focus:outline-none bg-transparent px-1"
                            autoFocus
                        />
                        <button onClick={handleUpdateName} disabled={loading} className="text-green-600 hover:bg-green-50 p-2 rounded-full">
                            {loading ? <Loader2 className="w-5 h-5 animate-spin"/> : <CheckCircle className="w-6 h-6"/>}
                        </button>
                        <button onClick={() => setIsEditingName(false)} className="text-red-500 hover:bg-red-50 p-2 rounded-full">
                            <X className="w-6 h-6"/>
                        </button>
                    </div>
                ) : (
                    <div className="flex items-center justify-center md:justify-start gap-3">
                        <h2 className="text-2xl font-bold text-gray-900">{displayName}</h2>
                        <button onClick={() => setIsEditingName(true)} className="text-gray-400 hover:text-primary transition-colors">
                            <Edit className="w-4 h-4" />
                        </button>
                    </div>
                )}

                <div className="flex items-center justify-center md:justify-start gap-2 mt-2">
                    <span className="bg-blue-50 text-blue-700 px-3 py-0.5 rounded-full text-xs font-bold uppercase tracking-wide border border-blue-100">
                        {role}
                    </span>
                    <span className="bg-green-50 text-green-700 px-3 py-0.5 rounded-full text-xs font-bold uppercase tracking-wide border border-green-100">
                        Cuenta Activa
                    </span>
                </div>
            </div>

            <div className="flex flex-col md:flex-row gap-4 text-gray-600 text-sm pt-4 border-t border-gray-100 mt-4">
                <div className="flex items-center justify-center md:justify-start">
                    <Mail className="w-4 h-4 mr-2 text-primary" />
                    {displayEmail}
                </div>
                <div className="flex items-center justify-center md:justify-start">
                    <User className="w-4 h-4 mr-2 text-primary" />
                    ID: <span className="font-mono ml-1 text-xs bg-gray-100 px-1 rounded">{user?.id?.slice(0, 8) || '...'}...</span>
                </div>
            </div>
          </div>
        </div>

        {/* --- ESTADÍSTICAS --- */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
           <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 flex flex-col items-center text-center">
              <div className="w-12 h-12 bg-orange-50 text-orange-600 rounded-full flex items-center justify-center mb-3">
                  <Leaf className="w-6 h-6" />
              </div>
              <p className="text-3xl font-bold text-gray-900">{stats.combosSalvados}</p>
              <p className="text-sm text-gray-500 font-medium">Combos Salvados</p>
           </div>
           <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 flex flex-col items-center text-center">
              <div className="w-12 h-12 bg-green-50 text-green-600 rounded-full flex items-center justify-center mb-3">
                  <PiggyBank className="w-6 h-6" />
              </div>
              <p className="text-3xl font-bold text-gray-900">
                ${stats.dineroAhorrado.toLocaleString('en-US', { minimumFractionDigits: 2 })}
              </p>
              <p className="text-sm text-gray-500 font-medium">Dinero Ahorrado</p>
           </div>
           <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 flex flex-col items-center text-center">
              <div className="w-12 h-12 bg-red-50 text-red-600 rounded-full flex items-center justify-center mb-3">
                  <Heart className="w-6 h-6" />
              </div>
              <p className="text-3xl font-bold text-gray-900">{stats.localesFavoritos}</p>
              <p className="text-sm text-gray-500 font-medium">Locales Favoritos</p>
           </div>
        </div>

        {/* --- SEGURIDAD Y CONTRASEÑA --- */}
        <motion.div
            layout
            className="bg-white p-8 rounded-2xl shadow-sm border border-gray-100"
        >
            <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center">
                <Shield className="w-5 h-5 mr-2 text-primary" /> Seguridad de la Cuenta
            </h3>
            <div className="space-y-4 max-w-2xl">
                
                {/* Sección Cambio de Contraseña */}
                <div className="bg-gray-50 rounded-lg border border-gray-100 overflow-hidden">
                    <div className="flex items-center justify-between p-4">
                        <div className="flex items-center">
                            <Key className="w-5 h-5 text-gray-400 mr-3" />
                            <div>
                                <p className="text-sm font-medium text-gray-700">Contraseña</p>
                                <p className="text-xs text-gray-500">*************</p>
                            </div>
                        </div>
                        {!isChangingPassword && (
                            <Button 
                                variant="ghost" 
                                size="sm" 
                                onClick={() => setIsChangingPassword(true)}
                                className="text-primary hover:text-primary/80 hover:bg-primary/10"
                            >
                                Cambiar
                            </Button>
                        )}
                    </div>

                    {/* Formulario Desplegable */}
                    <AnimatePresence>
                        {isChangingPassword && (
                            <motion.div 
                                initial={{ height: 0, opacity: 0 }} 
                                animate={{ height: 'auto', opacity: 1 }}
                                exit={{ height: 0, opacity: 0 }}
                                className="px-4 pb-4 bg-white border-t border-gray-100"
                            >
                                <div className="space-y-3 mt-4">
                                    <div>
                                        <label className="text-xs font-bold text-gray-500 uppercase">Nueva Contraseña</label>
                                        <input 
                                            type="password" 
                                            placeholder="Mínimo 6 caracteres"
                                            className="w-full p-2 border rounded-md mt-1 focus:ring-2 focus:ring-primary outline-none"
                                            value={passwords.new}
                                            onChange={(e) => setPasswords({...passwords, new: e.target.value})}
                                        />
                                    </div>
                                    <div>
                                        <label className="text-xs font-bold text-gray-500 uppercase">Confirmar Contraseña</label>
                                        <input 
                                            type="password" 
                                            placeholder="Repite la contraseña"
                                            className="w-full p-2 border rounded-md mt-1 focus:ring-2 focus:ring-primary outline-none"
                                            value={passwords.confirm}
                                            onChange={(e) => setPasswords({...passwords, confirm: e.target.value})}
                                        />
                                    </div>
                                    <div className="flex justify-end gap-2 mt-2">
                                        <Button variant="ghost" size="sm" onClick={() => setIsChangingPassword(false)}>Cancelar</Button>
                                        <Button size="sm" className="btn-gradient" onClick={handleChangePassword} disabled={loading}>
                                            {loading ? <Loader2 className="w-4 h-4 animate-spin"/> : 'Actualizar Contraseña'}
                                        </Button>
                                    </div>
                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>
            </div>
        </motion.div>

      </div>
    </>
  );
};

export default Profile;