import React, { useState, useEffect, useMemo } from 'react';
import { supabase } from '../../services/supabaseAuthClient';
import { toast } from '@/components/ui/use-toast';
import { Button } from '@/components/ui/button';
import { Loader2, MapPin, Clock, ArrowRight } from 'lucide-react';

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
        
        // Centrar mapa si ya hay coordenadas (aunque en este caso casi siempre será default)
        useEffect(() => {
            if (initialPosition) {
                map.setView(initialPosition, 15);
            }
        }, [initialPosition, map]);

        return position ? <Marker position={position}></Marker> : null;
    };

    return (
        <div style={{ height: '350px', width: '100%', borderRadius: '8px', overflow: 'hidden', border: '2px solid #e5e7eb' }}>
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

// --- HELPER PARA GENERAR HORAS ---
const generateTimeOptions = () => {
    const options = [];
    const periods = ['AM', 'PM'];
    // Generar horas desde 6 AM hasta 11 PM (ajustable)
    for (let i = 0; i < 24; i++) {
        const hour = i % 12 === 0 ? 12 : i % 12;
        const period = i < 12 ? 'AM' : 'PM';
        
        // Solo mostrar horas "razonables" (ej: de 6am a 11pm) para no llenar la lista
        if (i >= 6 && i <= 23) { 
            options.push(`${hour}:00 ${period}`);
            options.push(`${hour}:30 ${period}`);
        }
    }
    return options;
};

const timeOptions = generateTimeOptions();

// --- COMPONENTE PRINCIPAL ---
const LocalDetailsForm = ({ userId, onComplete }) => {
    // Campos del formulario
    const [nombre_local, setNombreLocal] = useState('');
    const [descripcion, setDescripcion] = useState('');
    const [telefono, setTelefono] = useState('');
    
    // Estados para el horario (separados)
    const [horaInicio, setHoraInicio] = useState('4:00 PM');
    const [horaFin, setHoraFin] = useState('8:00 PM');

    // Estados ubicación
    const [latitud, setLatitud] = useState('');
    const [longitud, setLongitud] = useState('');
    
    // Estados UI
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
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
                // Solo traemos el nombre, asumimos que el resto está vacío porque es el primer login
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
                // No bloqueamos la UI si falla el nombre, el usuario puede escribirlo
            } finally {
                setLoading(false);
            }
        };

        fetchLocalName();
    }, [userId]);

    const handleSubmit = async (event) => {
        event.preventDefault();
        setSubmitting(true);
        setError(null);

        // Validaciones básicas
        if (!nombre_local?.trim() || !descripcion?.trim() || !telefono?.trim() || !latitud || !longitud) {
            setError('Por favor complete todos los campos y seleccione su ubicación en el mapa.');
            toast({ title: "Faltan datos", variant: "destructive" });
            setSubmitting(false);
            return;
        }

        // --- LIMPIEZA DEL TELÉFONO ---
        // Esto transforma "099 123 4567" -> "0991234567"
        // Elimina espacios, guiones, paréntesis, etc. Solo deja números.
        const telefonoLimpio = telefono.replace(/[^0-9]/g, '');

        // Validación extra: En Ecuador los celulares suelen tener 10 dígitos
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
                telefono: telefonoLimpio, // ¡Enviamos el limpio!
                ubicacion: ubicacionString,
                horario: horarioString 
            };

            const { error: upsertError } = await supabase
                .from('local')
                .upsert(updates, { onConflict: 'id_local' });

            if (upsertError) throw upsertError;

            toast({
                title: "¡Perfil completado!",
                description: "Tus datos han sido guardados exitosamente.",
                className: "bg-green-50 border-green-200"
            });
            onComplete();

        } catch (err) {
            console.error('Error saving:', err);
            // Manejo específico si la BD sigue rechazando el formato
            if (err.code === '23514') {
                setError(`Por favor usa el formato correcto para el teléfono "${telefonoLimpio}". Ej.: 0991234567`);
            } else {
                setError('Error al guardar: ' + err.message);
            }
        } finally {
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
            <div className="bg-white p-8 rounded-lg shadow-xl w-full max-w-3xl">
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
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {/* COLUMNA IZQUIERDA */}
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
                                    maxLength={10} // Ayuda visual para no escribir de más
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
                                <p className="text-xs text-gray-500 mt-1">
                                    Intervalo en el que los clientes pueden pasar a recoger.
                                </p>
                            </div>
                        </div>

                        {/* COLUMNA DERECHA */}
                        <div className="flex flex-col h-full">
                            <label className="block text-sm font-bold text-gray-700 mb-1">Descripción</label>
                            <textarea
                                value={descripcion}
                                onChange={(e) => setDescripcion(e.target.value)}
                                className="flex-1 w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary outline-none resize-none"
                                placeholder="Describe qué tipo de comida vendes, especialidades..."
                                required
                            />
                        </div>
                    </div>

                    {/* MAPA */}
                    <div className="border-t pt-6">
                        <label className="block text-sm font-bold text-gray-700 flex items-center mb-2">
                            <MapPin className="w-4 h-4 mr-1 text-primary" /> Ubicación Exacta
                        </label>
                        
                        <div className="bg-blue-50 text-blue-800 px-3 py-2 rounded-md mb-3 text-xs flex items-center">
                           <MapPin className="w-3 h-3 mr-1"/> Busca tu local en el mapa y haz <strong>click</strong> para marcarlo.
                        </div>

                        <LocationPickerMap
                            onLocationSelect={handleLocationSelect}
                            initialPosition={localCoords}
                        />
                    </div>

                    <Button
                        type="submit"
                        className="w-full py-4 text-lg font-bold btn-gradient shadow-lg"
                        disabled={submitting}
                    >
                        {submitting ? (
                            <div className="flex items-center">
                                <Loader2 className="mr-2 h-5 w-5 animate-spin" /> Guardando...
                            </div>
                        ) : 'Guardar y Finalizar'}
                    </Button>
                </form>
            </div>
        </div>
    );
};

export default LocalDetailsForm;