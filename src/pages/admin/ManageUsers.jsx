import React, { useState, useEffect } from 'react';
import { Helmet } from 'react-helmet';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, User, Ban, CheckCircle, Mail, Loader2, AlertTriangle, X } from 'lucide-react';
import { supabase } from '@/services/supabaseAuthClient';
import { Button } from '@/components/ui/button';
import { toast } from '@/components/ui/use-toast';

// --- MODAL DE CONFIRMACIÓN PERSONALIZADO ---
const ConfirmationModal = ({ isOpen, onClose, onConfirm, actionType, userName }) => {
    if (!isOpen) return null;

    const isBlocking = actionType === 'bloquear';

    return (
        <AnimatePresence>
            <motion.div 
                initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
                onClick={onClose}
            >
                <motion.div 
                    initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }}
                    className="bg-white rounded-2xl shadow-xl max-w-sm w-full overflow-hidden p-6"
                    onClick={e => e.stopPropagation()}
                >
                    <div className={`w-12 h-12 rounded-full flex items-center justify-center mb-4 mx-auto ${isBlocking ? 'bg-red-100 text-red-600' : 'bg-green-100 text-green-600'}`}>
                        {isBlocking ? <Ban className="w-6 h-6" /> : <CheckCircle className="w-6 h-6" />}
                    </div>
                    
                    <h3 className="text-lg font-bold text-center text-gray-900 mb-2">
                        {isBlocking ? '¿Bloquear Usuario?' : '¿Reactivar Usuario?'}
                    </h3>
                    
                    <p className="text-center text-gray-500 text-sm mb-6">
                        Estás a punto de <strong>{isBlocking ? 'restringir' : 'permitir'}</strong> el acceso a <span className="font-medium text-gray-900">{userName}</span>.
                    </p>

                    <div className="flex gap-3">
                        <Button variant="outline" onClick={onClose} className="flex-1">
                            Cancelar
                        </Button>
                        <Button 
                            className={`flex-1 ${isBlocking ? 'bg-red-600 hover:bg-red-700' : 'bg-green-600 hover:bg-green-700'} text-white`}
                            onClick={onConfirm}
                        >
                            {isBlocking ? 'Sí, Bloquear' : 'Sí, Activar'}
                        </Button>
                    </div>
                </motion.div>
            </motion.div>
        </AnimatePresence>
    );
};

const ManageUsers = () => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  
  const [modalState, setModalState] = useState({
      isOpen: false,
      userId: null,
      userName: '',
      currentStatusString: 'Activo' // Por defecto asumimos 'Activo'
  });

  // --- 1. CARGAR USUARIOS ---
  const fetchUsers = async () => {
    try {
      setLoading(true);
      
      const { data, error } = await supabase
        .from('usuario')
        .select('*')
        .eq('tipo_usuario', 'cliente')
        .order('id_usuario', { ascending: false });

      if (error) throw error;
      setUsers(data || []);

    } catch (err) {
      console.error("Error cargando usuarios:", err);
      toast({ title: "Error", description: "No se pudo cargar la lista de usuarios.", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  // --- 2. PREPARAR MODAL ---
  const promptToggleStatus = (user) => {
      // CORRECCIÓN: Usamos 'Activo' con mayúscula
      const currentStatusString = user.estado || 'Activo'; 

      setModalState({
          isOpen: true,
          userId: user.id_usuario,
          userName: user.nombre || user.email,
          currentStatusString: currentStatusString
      });
  };

  // --- 3. EJECUTAR CAMBIO EN DB ---
  const executeToggleStatus = async () => {
      const { userId, currentStatusString } = modalState;
      
      // CORRECCIÓN: Comparación estricta con 'Activo'
      const isCurrentlyActive = currentStatusString === 'Activo';
      
      // CORRECCIÓN: Enviamos 'Bloqueado' o 'Activo' con mayúscula inicial
      const newStatusString = isCurrentlyActive ? 'Bloqueado' : 'Activo';
      
      setModalState(prev => ({ ...prev, isOpen: false }));

      try {
          const { data, error } = await supabase
            .from('usuario')
            .update({ estado: newStatusString }) 
            .eq('id_usuario', userId)
            .select(); 

          if (error) throw error;

          if (data.length === 0) {
            throw new Error("No se pudo actualizar (Verifica permisos RLS).");
          }

          // Actualizar UI
          setUsers(prev => prev.map(u => u.id_usuario === userId ? { ...u, estado: newStatusString } : u));
          
          toast({ 
              title: isCurrentlyActive ? "Usuario Bloqueado" : "Usuario Activado", 
              className: isCurrentlyActive ? "bg-red-50 border-red-200" : "bg-green-50 border-green-200"
          });

      } catch (err) {
          console.error(err);
          if (err.message?.includes("check constraint")) {
              toast({ title: "Error de Datos", description: "La base de datos rechazó el valor. Asegúrate que acepta 'Activo' y 'Bloqueado'.", variant: "destructive" });
          } else {
              toast({ title: "Error", description: err.message, variant: "destructive" });
          }
      }
  };

  // --- 4. FILTRADO ---
  const filteredUsers = users.filter(user => 
      user.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.nombre?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <Helmet><title>Gestión de Usuarios - Admin</title></Helmet>

      <ConfirmationModal 
          isOpen={modalState.isOpen}
          onClose={() => setModalState(prev => ({ ...prev, isOpen: false }))}
          onConfirm={executeToggleStatus}
          // Si es 'Activo', la acción será bloquear
          actionType={modalState.currentStatusString === 'Activo' ? 'bloquear' : 'activar'}
          userName={modalState.userName}
      />

      {/* Header y Buscador */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
            <h1 className="text-2xl font-bold text-gray-800">Usuarios Registrados</h1>
            <p className="text-gray-500 text-sm">Gestiona el acceso de los clientes.</p>
        </div>
        
        <div className="relative w-full md:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
            <input 
                type="text" 
                placeholder="Buscar cliente..." 
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-9 pr-4 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
            />
        </div>
      </div>

      {/* Tabla */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          {loading ? (
              <div className="p-12 flex justify-center"><Loader2 className="animate-spin text-indigo-500 w-8 h-8"/></div>
          ) : (
              <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                      <thead>
                          <tr className="bg-gray-50 border-b border-gray-100 text-xs uppercase text-gray-500 font-semibold tracking-wider">
                              <th className="p-4">Usuario</th>
                              <th className="p-4">Contacto</th>
                              <th className="p-4">Estado</th>
                              <th className="p-4 text-right">Acciones</th>
                          </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100">
                          {filteredUsers.length === 0 ? (
                              <tr>
                                  <td colSpan="4" className="p-8 text-center text-gray-500">No se encontraron usuarios.</td>
                              </tr>
                          ) : (
                              filteredUsers.map(user => {
                                  // CORRECCIÓN: Validación visual exacta con 'Activo'
                                  const isActive = user.estado === 'Activo'; 
                                  
                                  return (
                                    <tr key={user.id_usuario} className="hover:bg-gray-50/50 transition-colors">
                                        <td className="p-4">
                                            <div className="flex items-center gap-3">
                                                <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold ${isActive ? 'bg-indigo-100 text-indigo-600' : 'bg-gray-200 text-gray-500'}`}>
                                                    {user.nombre ? user.nombre[0].toUpperCase() : <User className="w-5 h-5"/>}
                                                </div>
                                                <div>
                                                    <p className={`font-bold text-sm ${isActive ? 'text-gray-900' : 'text-gray-500 line-through'}`}>
                                                        {user.nombre || "Sin Nombre"}
                                                    </p>
                                                    <p className="text-xs text-gray-400">ID: {user.id_usuario}</p>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="p-4">
                                            <div className="flex items-center text-sm text-gray-600">
                                                <Mail className="w-4 h-4 mr-2 text-gray-400"/>
                                                {user.email}
                                            </div>
                                        </td>
                                        <td className="p-4">
                                            {isActive ? (
                                                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800 border border-green-200">
                                                    <CheckCircle className="w-3 h-3 mr-1"/> Activo
                                                </span>
                                            ) : (
                                                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800 border border-red-200">
                                                    <Ban className="w-3 h-3 mr-1"/> Bloqueado
                                                </span>
                                            )}
                                        </td>
                                        <td className="p-4 text-right">
                                            <Button 
                                                size="sm" 
                                                variant={isActive ? "destructive" : "default"}
                                                className={isActive ? "bg-white text-red-600 border border-red-200 hover:bg-red-50" : "bg-green-600 hover:bg-green-700 text-white"}
                                                onClick={() => promptToggleStatus(user)}
                                            >
                                                {isActive ? "Bloquear" : "Activar"}
                                            </Button>
                                        </td>
                                    </tr>
                                  );
                              })
                          )}
                      </tbody>
                  </table>
              </div>
          )}
      </div>
    </div>
  );
};

export default ManageUsers;