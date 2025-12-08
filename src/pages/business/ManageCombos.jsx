import { useState, useEffect } from 'react';
import { Helmet } from 'react-helmet';
import { motion } from 'framer-motion';
import { Plus, Edit, Trash2, Image as ImageIcon, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from '@/components/ui/use-toast';
import { supabase } from '@/services/supabase';
import { useAuth } from '@/contexts/AuthContext';

const ComboForm = ({ combo, onSave, onCancel, isSaving }) => {
  const [formData, setFormData] = useState({
    nombre_bundle: combo?.nombre_bundle || '',
    descripcion: combo?.descripcion || '',
    precio: combo?.precio || '',
    url_imagen: combo?.url_imagen || ''
  });

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    onSave({ 
        ...formData, 
        precio: parseFloat(formData.precio),
    });
  };
  
  return (
    <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} className="bg-white p-6 rounded-lg shadow-md mb-8">
      <h2 className="text-xl font-bold mb-4">{combo ? 'Editar Combo' : 'Agregar Nuevo Combo'}</h2>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label htmlFor="nombre_bundle" className="block text-sm font-medium text-gray-700">Nombre del Combo</label>
            <input type="text" id="nombre_bundle" name="nombre_bundle" value={formData.nombre_bundle} onChange={handleChange} className="mt-1 block w-full border-gray-300 rounded-md shadow-sm p-2 border" required />
          </div>
          <div>
             <label htmlFor="url_imagen" className="block text-sm font-medium text-gray-700">URL de la Imagen</label>
             <input type="text" id="url_imagen" name="url_imagen" value={formData.url_imagen} onChange={handleChange} className="mt-1 block w-full border-gray-300 rounded-md shadow-sm p-2 border" placeholder="https://..." />
          </div>
        </div>
        
        <div>
            <label htmlFor="precio" className="block text-sm font-medium text-gray-700">Precio ($)</label>
            <input type="number" id="precio" name="precio" value={formData.precio} onChange={handleChange} className="mt-1 block w-full border-gray-300 rounded-md shadow-sm p-2 border" required step="0.01" />
        </div>

        <div>
          <label htmlFor="descripcion" className="block text-sm font-medium text-gray-700">Descripción</label>
          <textarea id="descripcion" name="descripcion" value={formData.descripcion} onChange={handleChange} rows="3" className="mt-1 block w-full border-gray-300 rounded-md shadow-sm p-2 border"></textarea>
        </div>

        <div className="flex justify-end gap-4">
          <Button type="button" variant="ghost" onClick={onCancel} disabled={isSaving}>Cancelar</Button>
          <Button type="submit" className="btn-gradient" disabled={isSaving}>
            {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
            {combo ? 'Actualizar' : 'Guardar'}
          </Button>
        </div>
      </form>
    </motion.div>
  );
};

const ManageCombos = () => {
  const [combos, setCombos] = useState([]);
  const [isFormVisible, setIsFormVisible] = useState(false);
  const [editingCombo, setEditingCombo] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  
  const { user } = useAuth(); 

  // --- Cargar Combos ---
  const fetchCombos = async () => {
    try {
      // Si no hay usuario cargado, esperamos
      if (!user || !user.id) return;
      
      const { data: userData, error: userError } = await supabase
        .from('usuario')
        .select('id_usuario')
        .eq('id_auth_supabase', user.id)
        .maybeSingle(); 

      if (userError) throw userError;
      
      // Si el usuario no existe en la tabla SQL (pero sí en auth), paramos silenciosamente
      if (!userData) {
          console.warn("Usuario autenticado pero no encontrado en tabla 'usuario'.");
          return;
      }

      const { data, error } = await supabase
        .from('combo')
        .select('*')
        .eq('id_restaurante', userData.id_usuario)
        .order('fecha_creacion', { ascending: false });

      if (error) throw error;
      setCombos(data || []);
    } catch (error) {
      console.error("Error al cargar combos:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCombos();
  }, [user]);

  // --- Guardar (Crear o Editar) ---
  const handleSave = async (comboData) => {
    setSaving(true);
    
    // --- DEBUGGING ---
    console.log("Intentando guardar. Usuario actual:", user);
    
    if (!user || !user.id) {
        toast({ 
            title: "Sesión no válida", 
            description: "No se detectó un usuario activo. Por favor recarga la página o inicia sesión nuevamente.",
            variant: "destructive"
        });
        setSaving(false);
        return;
    }

    try {
      // 1. Obtener el ID numérico
      const { data: userData, error: userError } = await supabase
        .from('usuario')
        .select('id_usuario')
        .eq('id_auth_supabase', user.id)
        .single();

      if (userError || !userData) {
        console.error("Error buscando usuario SQL:", userError);
        throw new Error("Tu usuario no está registrado correctamente en la base de datos.");
      }

      const idNumerico = userData.id_usuario;
      console.log("ID Numérico encontrado:", idNumerico);

      if (editingCombo) {
        // Actualizar
        const { error } = await supabase
          .from('combo')
          .update({
            nombre_bundle: comboData.nombre_bundle,
            descripcion: comboData.descripcion,
            precio: comboData.precio,
            url_imagen: comboData.url_imagen
          })
          .eq('id_combo', editingCombo.id_combo);

        if (error) throw error;
        toast({ title: "¡Actualizado!", description: "El combo se actualizó correctamente." });
      } else {
        // Crear Nuevo
        const { error } = await supabase
          .from('combo')
          .insert([{
            id_restaurante: idNumerico,
            nombre_bundle: comboData.nombre_bundle,
            descripcion: comboData.descripcion,
            precio: comboData.precio,
            url_imagen: comboData.url_imagen,
            estadisponible: true, 
            fecha_creacion: new Date().toISOString()
          }]);

        if (error) throw error;
        toast({ title: "¡Creado!", description: "Combo publicado exitosamente." });
      }

      await fetchCombos();
      setIsFormVisible(false);
      setEditingCombo(null);
    } catch (error) {
      console.error("Error completo al guardar:", error);
      toast({ title: "Error", description: error.message || "Error desconocido", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  // --- Eliminar ---
  const handleDelete = async (id) => {
    if (!window.confirm("¿Estás seguro de eliminar este combo?")) return;

    try {
      const { error } = await supabase
        .from('combo')
        .delete()
        .eq('id_combo', id);

      if (error) throw error;
      
      toast({ title: "Eliminado", variant: "destructive" });
      setCombos(combos.filter(c => c.id_combo !== id));
    } catch (error) {
      console.error("Error eliminando:", error);
      toast({ title: "Error", description: "No se pudo eliminar.", variant: "destructive" });
    }
  };

  const handleEdit = (combo) => {
    setEditingCombo(combo);
    setIsFormVisible(true);
  };

  const handleAddNew = () => {
    setEditingCombo(null);
    setIsFormVisible(true);
  };

  if (loading) return <div className="p-8 text-center">Cargando tus combos...</div>;

  return (
    <>
      <Helmet><title>Gestionar Combos - KIOSKU BITES</title></Helmet>
      <div className="space-y-8">
        <div className="flex justify-between items-center">
          <h1 className="text-3xl font-bold">Gestionar Combos</h1>
          {!isFormVisible && (
            <Button onClick={handleAddNew} className="btn-gradient">
              <Plus className="mr-2 h-4 w-4" /> Agregar Nuevo
            </Button>
          )}
        </div>

        {isFormVisible && (
            <ComboForm 
                combo={editingCombo} 
                onSave={handleSave} 
                onCancel={() => { setIsFormVisible(false); setEditingCombo(null); }} 
                isSaving={saving}
            />
        )}
        
        <div className="bg-white p-6 rounded-lg shadow-md">
          <h2 className="text-xl font-bold mb-4">Mis Combos Publicados</h2>
          <div className="space-y-4">
            {combos.length === 0 ? (
                <p className="text-gray-500 text-center py-4">No has publicado combos todavía.</p>
            ) : (
                combos.map(combo => (
                <motion.div key={combo.id_combo} layout className="flex items-center gap-4 p-4 border border-gray-200 rounded-lg">
                    {combo.url_imagen ? (
                        <img src={combo.url_imagen} alt={combo.nombre_bundle} className="w-20 h-20 rounded-md object-cover" />
                    ) : (
                        <div className="w-20 h-20 rounded-md bg-gray-100 flex items-center justify-center text-gray-400">
                            <ImageIcon />
                        </div>
                    )}
                    <div className="flex-1">
                    <h3 className="font-bold text-lg">{combo.nombre_bundle}</h3>
                    <p className="text-sm text-gray-500 line-clamp-1">{combo.descripcion}</p>
                    <p className="font-semibold text-primary">${Number(combo.precio).toFixed(2)}</p>
                    </div>
                    <div>
                    <span className={`px-2 py-1 text-xs font-semibold rounded-full ${combo.estadisponible ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                        {combo.estadisponible ? 'Activo' : 'Agotado'}
                    </span>
                    </div>
                    <div className="flex gap-2">
                    <Button variant="outline" size="icon" onClick={() => handleEdit(combo)}><Edit className="h-4 w-4" /></Button>
                    <Button variant="destructive" size="icon" onClick={() => handleDelete(combo.id_combo)}><Trash2 className="h-4 w-4" /></Button>
                    </div>
                </motion.div>
                ))
            )}
          </div>
        </div>
      </div>
    </>
  );
};

export default ManageCombos;