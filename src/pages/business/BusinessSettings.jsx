import React, { useState, useEffect, useMemo } from 'react';
import { Helmet } from 'react-helmet';
import { supabase } from '../../services/supabaseAuthClient';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from '@/components/ui/use-toast';
import { Button } from '@/components/ui/button';
import { Loader2, Save, Store, MapPin, Clock, Phone, Image as ImageIcon, UploadCloud } from 'lucide-react';

// --- MAPA (Leaflet) ---
import { MapContainer, TileLayer, Marker, useMapEvents } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';

// Fix iconos Leaflet
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
    iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
    iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
    shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

const LocationPickerMap = ({ onLocationSelect, initialPosition }) => {
    const guayaquilCoords = [-2.1894, -79.8891]; 
    const [position, setPosition] = useState(initialPosition || guayaquilCoords);
    const defaultCenter = useMemo(() => initialPosition || guayaquilCoords, [initialPosition]);

    const MapEventHandler = () => {
        const map = useMapEvents({
            click(e) {
                const newPosition = [e.latlng.lat, e.latlng.lng];
                setPosition(newPosition);
                onLocationSelect(newPosition);
            },
        });
        
        useEffect(() => {
            if (initialPosition) {
                map.setView(initialPosition, 15);
                setPosition(initialPosition);
            }
        }, [initialPosition, map]);

        return position ? <Marker position={position}></Marker> : null;
    };

    return (
        <div className="h-[300px] w-full rounded-lg overflow-hidden border-2 border-gray-200 shadow-inner">
            <MapContainer center={defaultCenter} zoom={13} scrollWheelZoom={false} style={{ height: '100%', width: '100%' }}>
                <TileLayer attribution='&copy; OpenStreetMap' url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
                <MapEventHandler />
            </MapContainer>
        </div>
    );
};

// --- HELPER HORARIOS ---
const generateTimeOptions = () => {
    const options = [];
    for (let i = 6; i <= 23; i++) {
        const hour = i % 12 === 0 ? 12 : i % 12;
        const period = i < 12 ? 'AM' : 'PM';
        options.push(`${hour}:00 ${period}`);
        options.push(`${hour}:30 ${period}`);
    }
    return options;
};
const timeOptions = generateTimeOptions();


// --- COMPONENTE PRINCIPAL ---
const BusinessSettings = () => {
    const { user } = useAuth();
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    
    // Estado específico para la subida de imagen
    const [uploadingImage, setUploadingImage] = useState(false);
    
    const [localId, setLocalId] = useState(null);

    // Estado del Formulario
    const [formData, setFormData] = useState({
        nombre_local: '',
        descripcion: '',
        telefono: '',
        url_imagen: '', // Aquí guardaremos la URL de Supabase
        latitud: '',
        longitud: '',
        horaInicio: '4:00 PM',
        horaFin: '8:00 PM'
    });

    // 1. CARGAR DATOS
    useEffect(() => {
        const fetchSettings = async () => {
            if (!user) return;
            try {
                setLoading(true);
                
                const { data: userData } = await supabase
                    .from('usuario')
                    .select('id_usuario')
                    .eq('id_auth_supabase', user.id)
                    .single();
                
                if (!userData) throw new Error("Usuario no encontrado");
                const id = userData.id_usuario;
                setLocalId(id);

                const { data: local, error } = await supabase
                    .from('local')
                    .select('*')
                    .eq('id_local', id)
                    .single();

                if (error) throw error;

                if (local) {
                    let lat = '', lng = '';
                    if (local.ubicacion && local.ubicacion.includes(',')) {
                        [lat, lng] = local.ubicacion.split(',');
                    }

                    let start = '4:00 PM', end = '8:00 PM';
                    if (local.horario && local.horario.includes(' - ')) {
                        [start, end] = local.horario.split(' - ');
                    }

                    setFormData({
                        nombre_local: local.nombre_local || '',
                        descripcion: local.descripcion || '',
                        telefono: local.telefono || '',
                        url_imagen: local.url_imagen || '',
                        latitud: lat,
                        longitud: lng,
                        horaInicio: start,
                        horaFin: end
                    });
                }
            } catch (error) {
                console.error("Error cargando configuración:", error);
            } finally {
                setLoading(false);
            }
        };

        fetchSettings();
    }, [user]);

    // --- HANDLERS ---
    const handleChange = (e) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const handleLocationSelect = (coords) => {
        setFormData(prev => ({
            ...prev,
            latitud: coords[0].toString(),
            longitud: coords[1].toString()
        }));
    };

    // --- LÓGICA DE SUBIDA DE IMAGEN ---
    const handleImageUpload = async (event) => {
        try {
            setUploadingImage(true);
            const file = event.target.files[0];
            
            if (!file) return;

            // Validación básica de tamaño (ej: max 2MB)
            if (file.size > 2 * 1024 * 1024) {
                throw new Error("La imagen es muy pesada. Máximo 2MB.");
            }

            // Crear nombre único para el archivo: id_local/timestamp-nombre.ext
            const fileExt = file.name.split('.').pop();
            const fileName = `${localId}/${Date.now()}.${fileExt}`;
            const filePath = `${fileName}`;

            // 1. Subir a Supabase Storage (Bucket: 'logos-locales')
            const { error: uploadError } = await supabase.storage
                .from('logos-locales') // Asegúrate que este nombre coincida con tu bucket
                .upload(filePath, file);

            if (uploadError) throw uploadError;

            // 2. Obtener la URL Pública
            const { data: { publicUrl } } = supabase.storage
                .from('logos-locales')
                .getPublicUrl(filePath);

            // 3. Actualizar el estado del formulario con la nueva URL
            setFormData(prev => ({ ...prev, url_imagen: publicUrl }));
            
            toast({ title: "Imagen subida", description: "No olvides guardar los cambios." });

        } catch (error) {
            console.error("Error subiendo imagen:", error);
            toast({ 
                title: "Error al subir", 
                description: error.message, 
                variant: "destructive" 
            });
        } finally {
            setUploadingImage(false);
        }
    };

    const handleSave = async (e) => {
        e.preventDefault();
        setSaving(true);

        try {
            const telefonoLimpio = formData.telefono.replace(/[^0-9]/g, '');
            if (telefonoLimpio.length < 9) throw new Error("El teléfono es inválido.");
            if (!formData.latitud || !formData.longitud) throw new Error("Debes marcar la ubicación en el mapa.");

            const updates = {
                nombre_local: formData.nombre_local,
                descripcion: formData.descripcion,
                telefono: telefonoLimpio,
                url_imagen: formData.url_imagen, // Se guarda la URL del bucket
                ubicacion: `${formData.latitud},${formData.longitud}`,
                horario: `${formData.horaInicio} - ${formData.horaFin}`
            };

            const { error } = await supabase
                .from('local')
                .update(updates)
                .eq('id_local', localId);

            if (error) throw error;

            toast({ 
                title: "Cambios guardados", 
                description: "La información de tu local ha sido actualizada.",
                className: "bg-green-50 border-green-200" 
            });

        } catch (error) {
            console.error(error);
            toast({ title: "Error al guardar", description: error.message, variant: "destructive" });
        } finally {
            setSaving(false);
        }
    };

    if (loading) return <div className="flex h-screen items-center justify-center"><Loader2 className="animate-spin h-10 w-10 text-primary"/></div>;

    const mapPosition = (formData.latitud && formData.longitud) 
        ? [parseFloat(formData.latitud), parseFloat(formData.longitud)] 
        : null;

    return (
        <>
            <Helmet>
                <title>Configuración - KIOSKU BITES</title>
            </Helmet>
            
            <div className="max-w-4xl mx-auto space-y-8 pb-12">
                
                {/* Header */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-gray-200 pb-6">
                    <div>
                        <h1 className="text-3xl font-bold text-gray-900">Configuración del Local</h1>
                        <p className="text-gray-500 mt-1">Administra la información pública de tu negocio.</p>
                    </div>
                    <Button onClick={handleSave} disabled={saving} className="btn-gradient shadow-lg min-w-[140px]">
                        {saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin"/> : <Save className="w-4 h-4 mr-2"/>}
                        Guardar Cambios
                    </Button>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    
                    {/* COLUMNA IZQUIERDA (2/3) */}
                    <div className="lg:col-span-2 space-y-6">
                        
                        {/* Tarjeta: Información Básica */}
                        <section className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
                            <h2 className="text-lg font-semibold flex items-center mb-4 text-gray-800">
                                <Store className="w-5 h-5 mr-2 text-primary" /> Información General
                            </h2>
                            <div className="space-y-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Nombre del Restaurante</label>
                                    <input
                                        name="nombre_local"
                                        value={formData.nombre_local}
                                        onChange={handleChange}
                                        className="w-full p-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary outline-none"
                                        placeholder="Ej. Pizzería Don Luigi"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Descripción</label>
                                    <textarea
                                        name="descripcion"
                                        rows="4"
                                        value={formData.descripcion}
                                        onChange={handleChange}
                                        className="w-full p-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary outline-none resize-none"
                                        placeholder="Cuéntanos sobre tu comida..."
                                    />
                                </div>
                            </div>
                        </section>

                         {/* Tarjeta: Ubicación */}
                         <section className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
                            <h2 className="text-lg font-semibold flex items-center mb-4 text-gray-800">
                                <MapPin className="w-5 h-5 mr-2 text-primary" /> Ubicación
                            </h2>
                            <div className="bg-blue-50 text-blue-800 px-4 py-3 rounded-lg text-sm mb-4">
                                Arrastra el mapa o haz clic para actualizar la posición exacta de tu local.
                            </div>
                            <LocationPickerMap initialPosition={mapPosition} onLocationSelect={handleLocationSelect} />
                        </section>

                    </div>

                    {/* COLUMNA DERECHA (1/3) */}
                    <div className="space-y-6">
                        
                        {/* Tarjeta: Imagen (NUEVA LÓGICA) */}
                        <section className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
                            <h2 className="text-lg font-semibold flex items-center mb-4 text-gray-800">
                                <ImageIcon className="w-5 h-5 mr-2 text-primary" /> Logo / Foto Local
                            </h2>
                            
                            <div className="flex flex-col items-center">
                                {/* Preview de la imagen */}
                                <div className="relative w-full h-40 bg-gray-100 rounded-lg overflow-hidden border border-gray-200 mb-4 group">
                                    {formData.url_imagen ? (
                                        <img 
                                            src={formData.url_imagen} 
                                            alt="Local Preview" 
                                            className="w-full h-full object-cover transition-transform group-hover:scale-105" 
                                        />
                                    ) : (
                                        <div className="flex items-center justify-center h-full text-gray-400 flex-col">
                                            <ImageIcon className="w-8 h-8 mb-2" />
                                            <span className="text-xs">Sin imagen</span>
                                        </div>
                                    )}
                                    
                                    {/* Overlay de Carga */}
                                    {uploadingImage && (
                                        <div className="absolute inset-0 bg-black/50 flex items-center justify-center text-white">
                                            <Loader2 className="animate-spin w-8 h-8" />
                                        </div>
                                    )}
                                </div>

                                {/* Botón File Chooser */}
                                <label className="w-full cursor-pointer">
                                    <div className="flex items-center justify-center w-full px-4 py-2 bg-white border-2 border-dashed border-gray-300 rounded-lg hover:border-primary hover:bg-gray-50 transition-colors">
                                        <UploadCloud className="w-5 h-5 mr-2 text-primary" />
                                        <span className="text-sm font-medium text-gray-600">
                                            {uploadingImage ? 'Subiendo...' : 'Cambiar Imagen'}
                                        </span>
                                    </div>
                                    <input 
                                        type="file" 
                                        accept="image/*" 
                                        className="hidden" 
                                        onChange={handleImageUpload}
                                        disabled={uploadingImage}
                                    />
                                </label>
                                <p className="text-xs text-gray-400 mt-2 text-center">
                                    Formatos: JPG, PNG. Máx 2MB.
                                </p>
                            </div>
                        </section>

                        {/* Tarjeta: Contacto */}
                        <section className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
                            <h2 className="text-lg font-semibold flex items-center mb-4 text-gray-800">
                                <Phone className="w-5 h-5 mr-2 text-primary" /> Contacto
                            </h2>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Teléfono</label>
                                <input
                                    type="tel"
                                    name="telefono"
                                    value={formData.telefono}
                                    onChange={handleChange}
                                    className="w-full p-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary outline-none"
                                    placeholder="099..."
                                />
                            </div>
                        </section>

                        {/* Tarjeta: Horario */}
                        <section className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
                            <h2 className="text-lg font-semibold flex items-center mb-4 text-gray-800">
                                <Clock className="w-5 h-5 mr-2 text-primary" /> Horario de Retiro
                            </h2>
                            <div className="space-y-3">
                                <div>
                                    <label className="text-xs font-bold text-gray-500 uppercase">Desde</label>
                                    <select 
                                        name="horaInicio"
                                        value={formData.horaInicio}
                                        onChange={handleChange}
                                        className="w-full mt-1 p-2 border border-gray-200 rounded-lg"
                                    >
                                        {timeOptions.map(t => <option key={`start-${t}`} value={t}>{t}</option>)}
                                    </select>
                                </div>
                                <div>
                                    <label className="text-xs font-bold text-gray-500 uppercase">Hasta</label>
                                    <select 
                                        name="horaFin"
                                        value={formData.horaFin}
                                        onChange={handleChange}
                                        className="w-full mt-1 p-2 border border-gray-200 rounded-lg"
                                    >
                                        {timeOptions.map(t => <option key={`end-${t}`} value={t}>{t}</option>)}
                                    </select>
                                </div>
                            </div>
                        </section>

                    </div>
                </div>
            </div>
        </>
    );
};

export default BusinessSettings;