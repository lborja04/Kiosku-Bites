import React, { useState, useEffect } from 'react';
import { Helmet } from 'react-helmet';
import { motion, AnimatePresence } from 'framer-motion';
// Agregado AlertTriangle a los imports
import { Plus, Edit, Trash2, Image as ImageIcon, Loader2, Save, X, UploadCloud, Tag, Percent, List, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from '@/components/ui/use-toast';
import { supabase } from '@/services/supabaseAuthClient'; 
import { useAuth } from '@/contexts/AuthContext';

// --- LISTA DE CATEGORÍAS PREDEFINIDAS ---
const CATEGORIAS_OPTIONS = [
    "Desayuno", "Almuerzo", "Merienda", "Cena", 
    "Panadería", "Postres", "Vegetariano", "Vegano", 
    "Pizza", "Hamburguesas", "Asiática", "Mariscos", 
    "Bebidas", "Saludable", "Otro"
];

// --- COMPONENTE DE FORMULARIO ---
const ComboForm = ({ combo, onSave, onCancel, isSaving, localId }) => {
    
    // Función auxiliar para convertir "Item1,Item2" -> "Item1\nItem2"
    const formatIncluyeToText = (str) => {
        if (!str) return '';
        return str.split(',').map(s => s.trim()).join('\n');
    };

    // Estado inicial
    const [formData, setFormData] = useState({
        nombre_bundle: combo?.nombre_bundle || '',
        descripcion: combo?.descripcion || '',
        incluye: formatIncluyeToText(combo?.incluye), 
        precio_original: combo?.precio || '', 
        descuento_porcentaje: 50, 
        url_imagen: combo?.url_imagen || '',
        estadisponible: combo?.estadisponible !== undefined ? combo.estadisponible : true, 
        categorias: combo?.categoria ? combo.categoria.split(',') : [] 
    });

    const [uploadingImage, setUploadingImage] = useState(false);
    const [precioFinal, setPrecioFinal] = useState(0);

    // Calcular precio final dinámico
    useEffect(() => {
        const original = parseFloat(formData.precio_original) || 0;
        const descuento = parseInt(formData.descuento_porcentaje) || 0;
        
        if (combo && formData.precio_original == combo.precio && formData.descuento_porcentaje === 50) {
             if (combo.precio > 0 && combo.precio_descuento) {
                 const calcDesc = Math.round((1 - (combo.precio_descuento / combo.precio)) * 100);
                 setFormData(prev => ({ ...prev, descuento_porcentaje: calcDesc }));
             }
        }

        const final = original - (original * (descuento / 100));
        setPrecioFinal(final > 0 ? final : 0);
    }, [formData.precio_original, formData.descuento_porcentaje, combo]);


    const handleChange = (e) => {
        const { name, value, type, checked } = e.target;
        setFormData(prev => ({ 
            ...prev, 
            [name]: type === 'checkbox' ? checked : value 
        }));
    };

    const toggleCategoria = (cat) => {
        setFormData(prev => {
            const exists = prev.categorias.includes(cat);
            if (exists) {
                return { ...prev, categorias: prev.categorias.filter(c => c !== cat) };
            } else {
                return { ...prev, categorias: [...prev.categorias, cat] };
            }
        });
    };

    const handleImageUpload = async (event) => {
        try {
            setUploadingImage(true);
            const file = event.target.files[0];
            if (!file) return;

            const fileExt = file.name.split('.').pop();
            const fileName = `${localId}/${Date.now()}.${fileExt}`;
            const filePath = `${fileName}`;

            const { error: uploadError } = await supabase.storage
                .from('combos-imagenes') 
                .upload(filePath, file);

            if (uploadError) throw uploadError;

            const { data: { publicUrl } } = supabase.storage
                .from('combos-imagenes')
                .getPublicUrl(filePath);

            setFormData(prev => ({ ...prev, url_imagen: publicUrl }));
            
        } catch (error) {
            console.error("Error subida:", error);
            toast({ title: "Error", description: "No se pudo subir la imagen.", variant: "destructive" });
        } finally {
            setUploadingImage(false);
        }
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        
        if (formData.categorias.length === 0) {
            toast({ title: "Falta categoría", description: "Selecciona al menos una categoría.", variant: "destructive" });
            return;
        }

        if (!formData.url_imagen) {
            toast({ title: "Falta imagen", description: "Debes subir una foto del combo.", variant: "destructive" });
            return;
        }

        const incluyeProcesado = formData.incluye
            .split('\n')
            .map(line => line.trim())
            .filter(line => line !== '')
            .join(',');

        onSave({ 
            ...formData,
            precio: parseFloat(formData.precio_original), 
            precio_descuento: parseFloat(precioFinal.toFixed(2)),
            categoria: formData.categorias.join(','),
            incluye: incluyeProcesado 
        });
    };
  
    return (
        <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="bg-white p-6 rounded-xl shadow-lg border border-gray-100 mb-8">
            <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-bold text-gray-800">{combo ? 'Editar Combo' : 'Crear Combo Sorpresa'}</h2>
                <Button variant="ghost" size="icon" onClick={onCancel}><X className="w-5 h-5"/></Button>
            </div>

            <form onSubmit={handleSubmit} className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                
                {/* COLUMNA IZQUIERDA */}
                <div className="space-y-5">
                    <div>
                        <label className="block text-sm font-bold text-gray-700 mb-1">Nombre del Combo</label>
                        <input name="nombre_bundle" value={formData.nombre_bundle} onChange={handleChange} className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-primary outline-none" placeholder="Ej. Caja Sorpresa Panadería" required />
                    </div>

                    <div>
                        <label className="block text-sm font-bold text-gray-700 mb-1">Descripción</label>
                        <textarea name="descripcion" value={formData.descripcion} onChange={handleChange} rows="3" className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-primary outline-none resize-none" placeholder="Describe qué podría encontrar el cliente..." required />
                    </div>

                    <div>
                        <label className="block text-sm font-bold text-gray-700 mb-1 flex items-center">
                            <List className="w-4 h-4 mr-1"/> ¿Qué incluye?
                        </label>
                        <div className="relative">
                            <textarea 
                                name="incluye" 
                                value={formData.incluye} 
                                onChange={handleChange} 
                                rows="4" 
                                className="w-full p-3 border rounded-lg focus:ring-2 focus:ring-primary outline-none resize-none bg-gray-50" 
                                placeholder={"Ejemplo:\n1 Bebida Grande\n1 Hamburguesa con Queso\n1 Porción de Papas"} 
                            />
                            <p className="text-xs text-gray-500 mt-1 text-right">Escribe un producto por línea (usa Enter).</p>
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm font-bold text-gray-700 mb-2">Categorías (Selecciona varias)</label>
                        <div className="flex flex-wrap gap-2">
                            {CATEGORIAS_OPTIONS.map(cat => (
                                <button
                                    key={cat}
                                    type="button"
                                    onClick={() => toggleCategoria(cat)}
                                    className={`px-3 py-1 rounded-full text-xs font-medium transition-colors border ${
                                        formData.categorias.includes(cat) 
                                        ? 'bg-primary text-white border-primary' 
                                        : 'bg-white text-gray-600 border-gray-200 hover:border-primary'
                                    }`}
                                >
                                    {cat}
                                </button>
                            ))}
                        </div>
                    </div>
                </div>

                {/* COLUMNA DERECHA */}
                <div className="space-y-6">
                    
                    {/* Sección de Precios */}
                    <div className="bg-gray-50 p-4 rounded-xl border border-gray-200">
                        <div className="flex items-center mb-4">
                            <Percent className="w-5 h-5 mr-2 text-primary"/>
                            <h3 className="font-bold text-gray-800">Precios y Descuentos</h3>
                        </div>

                        <div className="grid grid-cols-2 gap-4 mb-4">
                            <div>
                                <label className="block text-xs font-bold text-gray-500 mb-1">Precio Original ($)</label>
                                <input type="number" name="precio_original" value={formData.precio_original} onChange={handleChange} className="w-full p-2 border rounded-md text-gray-500 line-through" step="0.01" min="0" required placeholder="0.00" />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-green-600 mb-1">Precio Final ($)</label>
                                <div className="w-full p-2 bg-white border border-green-200 rounded-md font-bold text-green-700 text-lg">
                                    ${precioFinal.toFixed(2)}
                                </div>
                            </div>
                        </div>

                        <div>
                            <div className="flex justify-between text-sm mb-1">
                                <span>Descuento:</span>
                                <span className="font-bold text-primary">{formData.descuento_porcentaje}%</span>
                            </div>
                            <input 
                                type="range" 
                                name="descuento_porcentaje" 
                                min="10" max="90" step="5"
                                value={formData.descuento_porcentaje} 
                                onChange={handleChange}
                                className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-primary"
                            />
                        </div>
                    </div>

                    {/* Subida de Imagen */}
                    <div>
                        <label className="block text-sm font-bold text-gray-700 mb-2">Foto del Combo</label>
                        <div className="flex items-center gap-4">
                            <div className="w-24 h-24 bg-gray-100 rounded-lg border border-gray-300 overflow-hidden flex items-center justify-center relative">
                                {formData.url_imagen ? (
                                    <img src={formData.url_imagen} alt="Preview" className="w-full h-full object-cover" />
                                ) : (
                                    <ImageIcon className="text-gray-400" />
                                )}
                                {uploadingImage && <div className="absolute inset-0 bg-black/50 flex items-center justify-center"><Loader2 className="animate-spin text-white w-6 h-6"/></div>}
                            </div>
                            <div className="flex-1">
                                <label className="cursor-pointer">
                                    <div className="flex items-center justify-center w-full px-4 py-2 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors shadow-sm text-sm font-medium">
                                        <UploadCloud className="w-4 h-4 mr-2" /> Subir Imagen
                                    </div>
                                    <input type="file" accept="image/*" className="hidden" onChange={handleImageUpload} disabled={uploadingImage} />
                                </label>
                                <p className="text-xs text-gray-500 mt-2">Se recomienda una foto real de la comida.</p>
                            </div>
                        </div>
                    </div>

                    {/* Disponibilidad */}
                    <div className="flex items-center justify-between bg-blue-50 p-3 rounded-lg border border-blue-100">
                        <span className="text-sm font-medium text-blue-900">¿Está disponible para la venta?</span>
                        <label className="relative inline-flex items-center cursor-pointer">
                            <input type="checkbox" name="estadisponible" checked={formData.estadisponible} onChange={handleChange} className="sr-only peer" />
                            <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
                        </label>
                    </div>
                </div>

                <div className="lg:col-span-2 flex justify-end gap-3 pt-4 border-t border-gray-100">
                    <Button type="button" variant="outline" onClick={onCancel} disabled={isSaving}>Cancelar</Button>
                    <Button type="submit" className="btn-gradient w-40" disabled={isSaving}>
                        {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                        {combo ? 'Actualizar' : 'Publicar'}
                    </Button>
                </div>
            </form>
        </motion.div>
    );
};

// --- COMPONENTE PRINCIPAL ---
const ManageCombos = () => {
    const [combos, setCombos] = useState([]);
    const [isFormVisible, setIsFormVisible] = useState(false);
    const [editingCombo, setEditingCombo] = useState(null);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [localId, setLocalId] = useState(null);
    
    // NUEVOS ESTADOS PARA MODAL DE BORRADO
    const [deleteModalOpen, setDeleteModalOpen] = useState(false);
    const [comboToDelete, setComboToDelete] = useState(null);
    const [isDeleting, setIsDeleting] = useState(false);

    const { user } = useAuth(); 

    const fetchCombos = async () => {
        try {
            if (!user || !user.id) return;
            
            const { data: userData } = await supabase
                .from('usuario')
                .select('id_usuario')
                .eq('id_auth_supabase', user.id)
                .maybeSingle(); 

            if (!userData) return;
            setLocalId(userData.id_usuario);

            const { data, error } = await supabase
                .from('combo')
                .select('*')
                .eq('id_local', userData.id_usuario)
                .order('fecha_creacion', { ascending: false });

            if (error) throw error;
            setCombos(data || []);
        } catch (error) {
            console.error("Error al cargar combos:", error);
            toast({ title: "Error", description: "No se pudieron cargar los combos.", variant: "destructive" });
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchCombos();
    }, [user]);

    const handleSave = async (comboData) => {
        setSaving(true);
        try {
            if (!localId) throw new Error("No se identificó el local.");

            if (editingCombo) {
                // UPDATE
                const { error } = await supabase
                    .from('combo')
                    .update({
                        nombre_bundle: comboData.nombre_bundle,
                        descripcion: comboData.descripcion,
                        precio: comboData.precio,
                        precio_descuento: comboData.precio_descuento,
                        url_imagen: comboData.url_imagen,
                        incluye: comboData.incluye,
                        categoria: comboData.categoria,
                        estadisponible: comboData.estadisponible
                    })
                    .eq('id_combo', editingCombo.id_combo);

                if (error) throw error;
                toast({ title: "¡Actualizado!", description: "Combo modificado exitosamente.", className: "bg-green-50 border-green-200" });

            } else {
                // INSERT
                const { error } = await supabase
                    .from('combo')
                    .insert([{
                        id_local: localId,
                        nombre_bundle: comboData.nombre_bundle,
                        descripcion: comboData.descripcion,
                        precio: comboData.precio,
                        precio_descuento: comboData.precio_descuento,
                        url_imagen: comboData.url_imagen,
                        incluye: comboData.incluye,
                        categoria: comboData.categoria,
                        estadisponible: comboData.estadisponible || false, 
                        fecha_creacion: new Date().toISOString()
                    }]);

                if (error) throw error;
                toast({ title: "¡Creado!", description: "Nuevo combo listo para vender.", className: "bg-green-50 border-green-200" });
            }

            await fetchCombos();
            setIsFormVisible(false);
            setEditingCombo(null);
        } catch (error) {
            console.error("Error guardando:", error);
            toast({ title: "Error", description: error.message, variant: "destructive" });
        } finally {
            setSaving(false);
        }
    };

    // 1. Abrir Modal de borrado
    const openDeleteModal = (id) => {
        setComboToDelete(id);
        setDeleteModalOpen(true);
    };

    // 2. Ejecutar borrado real
    const confirmDelete = async () => {
        if (!comboToDelete) return;
        setIsDeleting(true);

        try {
            const { error } = await supabase.from('combo').delete().eq('id_combo', comboToDelete);
            if (error) throw error;
            
            toast({ title: "Eliminado", description: "El combo ha sido borrado.", className: "bg-green-50" });
            setCombos(prev => prev.filter(c => c.id_combo !== comboToDelete));
            
            // Cerrar modal
            setDeleteModalOpen(false);
            setComboToDelete(null);

        } catch (error) {
            toast({ title: "Error", description: "No se pudo eliminar.", variant: "destructive" });
        } finally {
            setIsDeleting(false);
        }
    };

    if (loading) return <div className="flex h-64 items-center justify-center"><Loader2 className="animate-spin text-primary w-8 h-8"/></div>;

    return (
        <>
            <Helmet><title>Mis Combos - KIOSKU BITES</title></Helmet>
            
            <div className="space-y-6">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                    <div>
                        <h1 className="text-3xl font-bold text-gray-900">Mis Combos</h1>
                        <p className="text-gray-500">Administra lo que venderás hoy.</p>
                    </div>
                    {!isFormVisible && (
                        <Button onClick={() => { setEditingCombo(null); setIsFormVisible(true); }} className="btn-gradient shadow-lg">
                            <Plus className="mr-2 h-4 w-4" /> Crear Nuevo Combo
                        </Button>
                    )}
                </div>

                <AnimatePresence>
                    {isFormVisible && (
                        <ComboForm 
                            combo={editingCombo} 
                            onSave={handleSave} 
                            onCancel={() => { setIsFormVisible(false); setEditingCombo(null); }} 
                            isSaving={saving}
                            localId={localId}
                        />
                    )}
                </AnimatePresence>
                
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                    {combos.length === 0 && !isFormVisible && (
                        <div className="col-span-full text-center py-12 bg-white rounded-xl border border-dashed border-gray-300">
                            <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4 text-gray-400">
                                <Plus className="w-8 h-8" />
                            </div>
                            <h3 className="text-lg font-medium text-gray-900">No tienes combos activos</h3>
                            <p className="text-gray-500 mb-4">Empieza creando tu primer paquete sorpresa.</p>
                            <Button variant="outline" onClick={() => setIsFormVisible(true)}>Crear Combo</Button>
                        </div>
                    )}

                    {combos.map(combo => (
                        <motion.div layout key={combo.id_combo} className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden hover:shadow-md transition-shadow flex flex-col">
                            <div className="h-40 bg-gray-100 relative">
                                {combo.url_imagen ? (
                                    <img src={combo.url_imagen} alt={combo.nombre_bundle} className="w-full h-full object-cover" />
                                ) : (
                                    <div className="w-full h-full flex items-center justify-center text-gray-400"><ImageIcon /></div>
                                )}
                                <div className="absolute top-3 right-3">
                                    <span className={`px-3 py-1 text-xs font-bold rounded-full shadow-sm ${combo.estadisponible ? 'bg-green-500 text-white' : 'bg-gray-500 text-white'}`}>
                                        {combo.estadisponible ? 'DISPONIBLE' : 'AGOTADO'}
                                    </span>
                                </div>
                            </div>

                            <div className="p-4 flex-1 flex flex-col">
                                <div className="flex justify-between items-start mb-2">
                                    <h3 className="font-bold text-lg text-gray-800 line-clamp-1" title={combo.nombre_bundle}>{combo.nombre_bundle}</h3>
                                </div>
                                
                                <p className="text-sm text-gray-500 line-clamp-2 mb-3 flex-1">{combo.descripcion}</p>

                                <div className="flex flex-wrap gap-1 mb-4">
                                    {combo.categoria && combo.categoria.split(',').slice(0, 3).map(cat => (
                                        <span key={cat} className="text-[10px] bg-gray-100 text-gray-600 px-2 py-1 rounded-md border border-gray-200">
                                            {cat}
                                        </span>
                                    ))}
                                    {combo.categoria && combo.categoria.split(',').length > 3 && <span className="text-[10px] text-gray-400 px-1">...</span>}
                                </div>

                                <div className="flex items-end justify-between border-t border-gray-50 pt-3">
                                    <div>
                                        <span className="text-xs text-gray-400 line-through block">${Number(combo.precio).toFixed(2)}</span>
                                        <span className="text-xl font-black text-primary">${Number(combo.precio_descuento).toFixed(2)}</span>
                                    </div>
                                    <div className="flex gap-2">
                                        <Button variant="ghost" size="icon" onClick={() => { setEditingCombo(combo); setIsFormVisible(true); }} className="h-8 w-8 text-gray-500 hover:text-blue-600">
                                            <Edit className="h-4 w-4" />
                                        </Button>
                                        <Button variant="ghost" size="icon" onClick={() => openDeleteModal(combo.id_combo)} className="h-8 w-8 text-gray-500 hover:text-red-600">
                                            <Trash2 className="h-4 w-4" />
                                        </Button>
                                    </div>
                                </div>
                            </div>
                        </motion.div>
                    ))}
                </div>
            </div>

            {/* --- MODAL DE CONFIRMACIÓN DE BORRADO --- */}
            <AnimatePresence>
                {deleteModalOpen && (
                    <motion.div 
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4"
                    >
                        <motion.div 
                            initial={{ scale: 0.95, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.95, opacity: 0 }}
                            className="bg-white rounded-xl shadow-xl max-w-sm w-full p-6 border border-gray-100"
                        >
                            <div className="flex items-center justify-center w-12 h-12 bg-red-100 rounded-full mx-auto mb-4 text-red-600">
                                <AlertTriangle className="w-6 h-6" />
                            </div>
                            
                            <h3 className="text-xl font-bold text-gray-900 text-center mb-2">
                                ¿Eliminar Combo?
                            </h3>
                            
                            <p className="text-gray-500 text-center text-sm mb-6">
                                Estás a punto de borrar este producto. Los clientes ya no podrán verlo. Esta acción no se puede deshacer.
                            </p>
                            
                            <div className="grid grid-cols-2 gap-3">
                                <Button 
                                    variant="outline" 
                                    onClick={() => setDeleteModalOpen(false)}
                                    disabled={isDeleting}
                                    className="w-full"
                                >
                                    Cancelar
                                </Button>
                                <Button 
                                    variant="destructive" 
                                    onClick={confirmDelete}
                                    disabled={isDeleting}
                                    className="w-full bg-red-600 hover:bg-red-700"
                                >
                                    {isDeleting ? <Loader2 className="w-4 h-4 animate-spin mr-2"/> : null}
                                    Eliminar
                                </Button>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </>
    );
};

export default ManageCombos;