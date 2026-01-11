import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom'; 
import { supabase } from '../../services/supabaseAuthClient';
import { toast } from '@/components/ui/use-toast';
import { Button } from '@/components/ui/button';
import { Loader2, MapPin, Clock, ArrowRight, Image as ImageIcon, UploadCloud } from 'lucide-react';

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

// --- COMPONENTE DEL MAPA ---
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
            }
        }, [initialPosition, map]);

        return position ? <Marker position={position}></Marker> : null;
    };

    return (
        <div style={{ height: '300px', width: '100%', borderRadius: '8px', overflow: 'hidden', border: '2px solid #e5e7eb' }}>
            <MapContainer
                center={defaultCenter}
                zoom={13}
                scrollWheelZoom={true}
                style={{ height: '100%', width: '100%' }}
            >
                <TileLayer
                    attribution='&copy; OpenStreetMap contributors'
                    url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                />
                <MapEventHandler />
            </MapContainer>
        </div>
    );
};

// --- HELPER PARA GENERAR HORAS (24 HORAS) ---
const generateTimeOptions = () => {
    const options = [];
    // Cambiamos el bucle para ir de 0 a 23 (Todas las horas del día)
    for (let i = 0; i < 24; i++) {
        const hour = i % 12 === 0 ? 12 : i % 12; // Convierte 0 a 12, 13 a 1, etc.
        const period = i < 12 ? 'AM' : 'PM';
        
        options.push(`${hour}:00 ${period}`);
        options.push(`${hour}:30 ${period}`);
    }
    return options;
};

const timeOptions = generateTimeOptions();

// --- COMPONENTE PRINCIPAL ---
const LocalDetailsForm = ({ userId, onComplete }) => {
    const navigate = useNavigate();

    // Campos del formulario
    const [nombre_local, setNombreLocal] = useState('');
    const [descripcion, setDescripcion] = useState('');
    const [telefono, setTelefono] = useState('');
    const [url_imagen, setUrlImagen] = useState(''); 
    
    // Estados para el horario (Por defecto ponemos algo razonable, pero el usuario puede cambiarlo a cualquiera de las 24h)
    const [horaInicio, setHoraInicio] = useState('8:00 AM');
    const [horaFin, setHoraFin] = useState('10:00 PM');

    // Estados ubicación
    const [latitud, setLatitud] = useState('');
    const [longitud, setLongitud] = useState('');
    
    // Estados UI
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [uploadingImage, setUploadingImage] = useState(false);
    const [error, setError] = useState(null);

    const localCoords = useMemo(() => {
        const lat = parseFloat(latitud);
        const lng = parseFloat(longitud);
        return (!isNaN(lat) && !isNaN(lng)) ? [lat, lng] : null;
    }, [latitud, longitud]);

    const handleLocationSelect = (coords) => {
        setLatitud(coords[0].toString());
        setLongitud(coords[1].toString());
    };

    // 1. FETCH SOLO DEL NOMBRE
    useEffect(() => {
        const fetchLocalName = async () => {
            if (!userId) return;

            try {
                setLoading(true);
                const { data, error } = await supabase
                    .from('local')
                    .select('nombre_local')
                    .eq('id_local', userId)
                    .single();

                if (error && error.code !== 'PGRST116') throw error;

                if (data) {
                    setNombreLocal(data.nombre_local || '');
                }
            } catch (err) {
                console.error('Error fetching name:', err);
            } finally {
                setLoading(false);
            }
        };

        fetchLocalName();
    }, [userId]);

    // --- SUBIDA DE IMAGEN ---
    const handleImageUpload = async (event) => {
        try {
            setUploadingImage(true);
            const file = event.target.files[0];
            
            if (!file) return;

            if (file.size > 2 * 1024 * 1024) {
                throw new Error("La imagen es muy pesada. Máximo 2MB.");
            }

            const fileExt = file.name.split('.').pop();
            const fileName = `${userId}/${Date.now()}.${fileExt}`;
            const filePath = `${fileName}`;

            const { error: uploadError } = await supabase.storage
                .from('logos-locales')
                .upload(filePath, file);

            if (uploadError) throw uploadError;

            const { data: { publicUrl } } = supabase.storage
                .from('logos-locales')
                .getPublicUrl(filePath);

            setUrlImagen(publicUrl);
            toast({ title: "Imagen subida", description: "Se guardará al finalizar el registro." });

        } catch (error) {
            console.error("Error subiendo imagen:", error);
            toast({ title: "Error al subir", description: error.message, variant: "destructive" });
        } finally {
            setUploadingImage(false);
        }
    };

    const handleSubmit = async (event) => {
        event.preventDefault();
        setSubmitting(true);
        setError(null);

        if (!nombre_local?.trim() || !descripcion?.trim() || !telefono?.trim() || !latitud || !longitud) {
            setError('Por favor complete todos los campos obligatorios y marque su ubicación.');
            toast({ title: "Faltan datos", variant: "destructive" });
            setSubmitting(false);
            return;
        }

        const telefonoLimpio = telefono.replace(/[^0-9]/g, '');

        if (telefonoLimpio.length < 9) { 
             setError('El número de teléfono parece incorrecto (muy corto).');
             setSubmitting(false);
             return;
        }

        try {
            const ubicacionString = `${latitud},${longitud}`;
            const horarioString = `${horaInicio} - ${horaFin}`;

            const updates = {
                id_local: userId,
                nombre_local: nombre_local.trim(),
                descripcion: descripcion.trim(),
                telefono: telefonoLimpio,
                ubicacion: ubicacionString,
                horario: horarioString,
                url_imagen: url_imagen,
                aprobado: false 
            };

            const { error: upsertError } = await supabase
                .from('local')
                .upsert(updates, { onConflict: 'id_local' });

            if (upsertError) throw upsertError;

            toast({
                title: "Solicitud Enviada",
                description: "Tus datos han sido guardados. Debes esperar la aprobación del administrador.",
                className: "bg-blue-50 border-blue-200"
            });

            setTimeout(async () => {
                await supabase.auth.signOut();
                if (onComplete) onComplete(); 
                navigate('/login', { replace: true });
            }, 2000);

        } catch (err) {
            console.error('Error saving:', err);
            if (err.code === '23514') {
                setError(`Por favor usa el formato correcto para el teléfono. Ej.: 0991234567`);
            } else {
                setError('Error al guardar: ' + err.message);
            }
            setSubmitting(false);
        }
    };

    if (loading) {
        return (
            <div className="flex justify-center items-center h-screen bg-gray-50">
                <Loader2 className="h-10 w-10 animate-spin text-primary" />
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-4">
            <div className="bg-white p-8 rounded-lg shadow-xl w-full max-w-4xl my-8">
                <h2 className="text-3xl font-bold text-center text-gray-800 mb-2">Completa tu Perfil</h2>
                <p className="text-center text-gray-500 mb-8">
                    Necesitamos estos datos para que los clientes puedan encontrarte.
                </p>

                {error && (
                    <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-6 text-sm">
                        {error}
                    </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                        
                        {/* --- COLUMNA IZQUIERDA: DATOS --- */}
                        <div className="space-y-5">
                            <div>
                                <label className="block text-sm font-bold text-gray-700 mb-1">Nombre del Local</label>
                                <input
                                    type="text"
                                    value={nombre_local}
                                    onChange={(e) => setNombreLocal(e.target.value)}
                                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary outline-none"
                                    required
                                />
                            </div>
                            
                            <div>
                                <label className="block text-sm font-bold text-gray-700 mb-1">Teléfono de Contacto</label>
                                <input
                                    type="tel"
                                    value={telefono}
                                    onChange={(e) => setTelefono(e.target.value)}
                                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary outline-none"
                                    placeholder="0991234567"
                                    maxLength={10}
                                    required
                                />
                            </div>

                            {/* SELECTOR DE HORARIO */}
                            <div>
                                <label className="block text-sm font-bold text-gray-700 mb-2 flex items-center">
                                    <Clock className="w-4 h-4 mr-1 text-primary" /> Horario de Retiro (Pickup)
                                </label>
                                <div className="flex items-center space-x-2">
                                    <select 
                                        value={horaInicio}
                                        onChange={(e) => setHoraInicio(e.target.value)}
                                        className="w-full p-2 border border-gray-300 rounded-md focus:ring-primary focus:border-primary"
                                    >
                                        {timeOptions.map(t => <option key={`start-${t}`} value={t}>{t}</option>)}
                                    </select>
                                    
                                    <span className="text-gray-400"><ArrowRight className="w-4 h-4"/></span>
                                    
                                    <select 
                                        value={horaFin}
                                        onChange={(e) => setHoraFin(e.target.value)}
                                        className="w-full p-2 border border-gray-300 rounded-md focus:ring-primary focus:border-primary"
                                    >
                                        {timeOptions.map(t => <option key={`end-${t}`} value={t}>{t}</option>)}
                                    </select>
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-bold text-gray-700 mb-1">Descripción</label>
                                <textarea
                                    value={descripcion}
                                    onChange={(e) => setDescripcion(e.target.value)}
                                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary outline-none resize-none"
                                    placeholder="Describe qué tipo de comida vendes..."
                                    rows={4}
                                    required
                                />
                            </div>
                        </div>

                        {/* --- COLUMNA DERECHA: IMAGEN + MAPA --- */}
                        <div className="flex flex-col gap-6">
                            
                            {/* SUBIDA DE IMAGEN */}
                            <div>
                                <label className="block text-sm font-bold text-gray-700 mb-2 flex items-center">
                                    <ImageIcon className="w-4 h-4 mr-1 text-primary" /> Logo / Foto del Local
                                </label>
                                <div className="flex flex-col items-center p-4 border-2 border-dashed border-gray-300 rounded-lg bg-gray-50 hover:bg-white transition-colors">
                                    {/* Preview */}
                                    <div className="relative w-full h-32 bg-gray-200 rounded-md overflow-hidden mb-3 flex items-center justify-center">
                                        {url_imagen ? (
                                            <img src={url_imagen} alt="Preview" className="w-full h-full object-cover" />
                                        ) : (
                                            <ImageIcon className="w-8 h-8 text-gray-400" />
                                        )}
                                        
                                        {uploadingImage && (
                                            <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                                                <Loader2 className="animate-spin text-white w-6 h-6" />
                                            </div>
                                        )}
                                    </div>

                                    {/* Botón Upload */}
                                    <label className="cursor-pointer">
                                        <div className="flex items-center px-4 py-2 bg-white border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 hover:bg-gray-50">
                                            <UploadCloud className="w-4 h-4 mr-2" />
                                            {url_imagen ? 'Cambiar Imagen' : 'Subir Imagen'}
                                        </div>
                                        <input 
                                            type="file" 
                                            accept="image/*" 
                                            className="hidden" 
                                            onChange={handleImageUpload}
                                            disabled={uploadingImage}
                                        />
                                    </label>
                                    <p className="text-xs text-gray-400 mt-2">Máximo 2MB (JPG, PNG)</p>
                                </div>
                            </div>

                            {/* MAPA */}
                            <div className="flex-1 flex flex-col">
                                <label className="block text-sm font-bold text-gray-700 flex items-center mb-2">
                                    <MapPin className="w-4 h-4 mr-1 text-primary" /> Ubicación Exacta
                                </label>
                                <div className="bg-blue-50 text-blue-800 px-3 py-2 rounded-md mb-2 text-xs">
                                   Haz <strong>click en el mapa</strong> para marcar tu local.
                                </div>
                                <LocationPickerMap
                                    onLocationSelect={handleLocationSelect}
                                    initialPosition={localCoords}
                                />
                            </div>
                        </div>
                    </div>

                    <Button
                        type="submit"
                        className="w-full py-4 text-lg font-bold btn-gradient shadow-lg mt-6"
                        disabled={submitting || uploadingImage}
                    >
                        {submitting ? (
                            <div className="flex items-center">
                                <Loader2 className="mr-2 h-5 w-5 animate-spin" /> Guardando...
                            </div>
                        ) : 'Guardar y Finalizar Registro'}
                    </Button>
                </form>
            </div>
        </div>
    );
};

export default LocalDetailsForm;