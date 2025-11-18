import React, { useState, useEffect, useRef } from 'react';
import { 
  Book, 
  Plus, 
  Calendar, 
  MapPin, 
  Image as ImageIcon, 
  ChevronLeft, 
  Sparkles, 
  Trash2, 
  Edit3,
  Navigation,
  Map as MapIcon,
  X,
  Clock
} from 'lucide-react';
import { v4 as uuidv4 } from 'uuid';
import { Trip, JournalEntry, ViewState } from './types';
import * as storage from './services/storageService';
import * as gemini from './services/geminiService';
import MapComponent from './components/MapComponent';

// --- Components ---

// 1. Create/Edit Trip Modal
const TripModal: React.FC<{
    isOpen: boolean;
    onClose: () => void;
    onSave: (trip: Trip) => void;
    existingTrip?: Trip;
}> = ({ isOpen, onClose, onSave, existingTrip }) => {
    const [title, setTitle] = useState('');
    const [description, setDescription] = useState('');
    const [startDate, setStartDate] = useState(new Date().toISOString().split('T')[0]);
    const [isGeneratingTitle, setIsGeneratingTitle] = useState(false);

    useEffect(() => {
        if (isOpen) {
            if (existingTrip) {
                setTitle(existingTrip.title);
                setDescription(existingTrip.description);
                setStartDate(existingTrip.startDate);
            } else {
                setTitle('');
                setDescription('');
                setStartDate(new Date().toISOString().split('T')[0]);
            }
        }
    }, [isOpen, existingTrip]);

    const handleSuggestTitle = async () => {
        if (!description) return;
        setIsGeneratingTitle(true);
        const suggested = await gemini.suggestTripTitle(description);
        setTitle(suggested);
        setIsGeneratingTitle(false);
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg shadow-xl w-full max-w-md p-6">
                <h2 className="text-xl font-bold mb-4">{existingTrip ? 'Rediger tur' : 'Ny tur'}</h2>
                
                <div className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Startdato</label>
                        <input 
                            type="date" 
                            className="w-full p-2 border rounded-md"
                            value={startDate}
                            onChange={(e) => setStartDate(e.target.value)}
                        />
                    </div>
                    
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Beskrivelse av turen</label>
                        <textarea 
                            className="w-full p-2 border rounded-md h-24"
                            placeholder="F.eks. Sommerferie til Vestlandet..."
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                        />
                    </div>

                    <div className="flex gap-2 items-end">
                        <div className="flex-1">
                            <label className="block text-sm font-medium text-gray-700 mb-1">Turtittel</label>
                            <input 
                                type="text" 
                                className="w-full p-2 border rounded-md"
                                placeholder="Sommeren 2024"
                                value={title}
                                onChange={(e) => setTitle(e.target.value)}
                            />
                        </div>
                        <button 
                            type="button"
                            onClick={handleSuggestTitle}
                            disabled={!description || isGeneratingTitle}
                            className="p-2 bg-purple-100 text-purple-700 rounded-md hover:bg-purple-200 disabled:opacity-50"
                            title="Foreslå tittel med AI"
                        >
                            {isGeneratingTitle ? '...' : <Sparkles size={20} />}
                        </button>
                    </div>
                </div>

                <div className="mt-6 flex justify-end space-x-3">
                    <button onClick={onClose} className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-md">Avbryt</button>
                    <button 
                        onClick={() => {
                            onSave({
                                id: existingTrip?.id || uuidv4(),
                                title: title || 'Uten navn',
                                description,
                                startDate,
                                endDate: existingTrip?.endDate
                            });
                            onClose();
                        }}
                        className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                    >
                        Lagre
                    </button>
                </div>
            </div>
        </div>
    );
};

// 2. Entry Form Modal
const EntryModal: React.FC<{
    isOpen: boolean;
    onClose: () => void;
    onSave: (entry: JournalEntry) => void;
    tripId: string;
    existingEntry?: JournalEntry;
}> = ({ isOpen, onClose, onSave, tripId, existingEntry }) => {
    const [content, setContent] = useState('');
    const [author, setAuthor] = useState('');
    const [locationName, setLocationName] = useState('');
    const [lat, setLat] = useState<number | null>(null);
    const [lng, setLng] = useState<number | null>(null);
    const [entryDate, setEntryDate] = useState('');
    
    const [isImproving, setIsImproving] = useState(false);
    const [isLocating, setIsLocating] = useState(false);
    const [imageBase64, setImageBase64] = useState<string[]>([]);

    // Initialize form
    useEffect(() => {
        if (isOpen) {
            if (existingEntry) {
                setContent(existingEntry.content);
                setAuthor(existingEntry.author);
                setLocationName(existingEntry.location?.name || '');
                setLat(existingEntry.location?.lat || null);
                setLng(existingEntry.location?.lng || null);
                setImageBase64(existingEntry.images || []);
                
                // Format existing date for datetime-local input
                const d = new Date(existingEntry.date);
                // Adjust for timezone to show correct local time in input
                const localIso = new Date(d.getTime() - (d.getTimezoneOffset() * 60000)).toISOString().slice(0, 16);
                setEntryDate(localIso);
            } else {
                setContent('');
                setAuthor('');
                setLocationName('');
                setLat(null);
                setLng(null);
                setImageBase64([]);
                
                // Default to current local time
                const now = new Date();
                const localIso = new Date(now.getTime() - (now.getTimezoneOffset() * 60000)).toISOString().slice(0, 16);
                setEntryDate(localIso);
            }
        }
    }, [isOpen, existingEntry]);

    const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            const reader = new FileReader();
            reader.onloadend = () => {
                setImageBase64(prev => [...prev, reader.result as string]);
            };
            reader.readAsDataURL(file);
        }
    };

    const removeImage = (indexToRemove: number) => {
        setImageBase64(prev => prev.filter((_, idx) => idx !== indexToRemove));
    };

    const handleAIImprove = async () => {
        if (!content) return;
        setIsImproving(true);
        const improved = await gemini.improveJournalEntry(content);
        setContent(improved);
        setIsImproving(false);
    };

    const handleFindLocation = async () => {
        if (!locationName) return;
        setIsLocating(true);
        
        const coords = await gemini.parseCoordinatesFromAI(locationName);
        
        if (coords) {
            setLat(coords.lat);
            setLng(coords.lng);
        } else {
            alert("Kunne ikke finne koordinater for dette stedet.");
        }
        setIsLocating(false);
    };
    
    const handleUseCurrentLocation = () => {
        if (navigator.geolocation) {
            setIsLocating(true);
            navigator.geolocation.getCurrentPosition((pos) => {
                setLat(pos.coords.latitude);
                setLng(pos.coords.longitude);
                setLocationName("Min posisjon");
                setIsLocating(false);
            }, (err) => {
                console.error(err);
                alert("Kunne ikke hente posisjon.");
                setIsLocating(false);
            });
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 overflow-y-auto">
            <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl p-6 my-8 relative">
                <h2 className="text-xl font-bold mb-4">
                    {existingEntry ? 'Rediger oppslag' : 'Nytt oppslag i hytteboka'}
                </h2>

                <div className="space-y-4">
                    {/* Date/Time */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1 flex items-center gap-2">
                            <Clock size={16} /> Tidspunkt
                        </label>
                        <input 
                            type="datetime-local"
                            value={entryDate}
                            onChange={(e) => setEntryDate(e.target.value)}
                            className="p-2 border rounded-md w-full sm:w-auto"
                        />
                    </div>

                    {/* Location Section */}
                    <div className="bg-slate-50 p-4 rounded-md border border-slate-200">
                        <label className="block text-sm font-medium text-slate-700 mb-2 flex items-center gap-2">
                            <MapPin size={16} /> Sted / Lokasjon
                        </label>
                        <div className="flex gap-2 flex-wrap">
                            <input 
                                type="text" 
                                placeholder="Stedsnavn (f.eks. 'Geiranger')" 
                                className="flex-1 p-2 border rounded-md"
                                value={locationName}
                                onChange={(e) => setLocationName(e.target.value)}
                            />
                            <button 
                                onClick={handleFindLocation}
                                disabled={isLocating}
                                className="px-3 py-2 bg-white border border-slate-300 rounded-md hover:bg-slate-50 text-sm font-medium"
                            >
                                {isLocating ? 'Søker...' : 'Søk i kart'}
                            </button>
                            <button 
                                onClick={handleUseCurrentLocation}
                                className="px-3 py-2 bg-blue-50 border border-blue-200 text-blue-700 rounded-md hover:bg-blue-100 text-sm flex items-center gap-1"
                            >
                                <Navigation size={14} /> Her er jeg
                            </button>
                        </div>
                        {lat && lng && (
                            <div className="mt-2 text-xs text-green-600 flex items-center gap-1">
                                <span className="w-2 h-2 bg-green-500 rounded-full"></span>
                                Koordinater funnet: {lat.toFixed(4)}, {lng.toFixed(4)}
                            </div>
                        )}
                    </div>

                    {/* Content Section */}
                    <div>
                        <div className="flex justify-between items-center mb-1">
                            <label className="block text-sm font-medium text-gray-700">Journalnotat</label>
                            <button 
                                onClick={handleAIImprove}
                                disabled={!content || isImproving}
                                className="text-xs flex items-center gap-1 text-purple-600 hover:text-purple-800 bg-purple-50 px-2 py-1 rounded-full"
                            >
                                <Sparkles size={12} /> {isImproving ? 'Forbedrer...' : 'Forbedre språk'}
                            </button>
                        </div>
                        <textarea 
                            className="w-full p-4 border rounded-md h-40 font-serif text-lg leading-relaxed bg-amber-50/30"
                            placeholder="Kjære hyttebok... I dag har vi..."
                            value={content}
                            onChange={(e) => setContent(e.target.value)}
                        />
                    </div>

                    {/* Author */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Skrevet av</label>
                        <input 
                            type="text" 
                            className="w-full p-2 border rounded-md"
                            placeholder="Navn på forfatter"
                            value={author}
                            onChange={(e) => setAuthor(e.target.value)}
                        />
                    </div>

                    {/* Images */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1 flex items-center gap-2">
                            <ImageIcon size={16} /> Bilder
                        </label>
                        <input 
                            type="file" 
                            accept="image/*"
                            onChange={handleImageUpload}
                            className="block w-full text-sm text-slate-500
                                file:mr-4 file:py-2 file:px-4
                                file:rounded-full file:border-0
                                file:text-sm file:font-semibold
                                file:bg-blue-50 file:text-blue-700
                                hover:file:bg-blue-100
                            "
                        />
                        {imageBase64.length > 0 && (
                            <div className="mt-3 flex gap-2 overflow-x-auto py-2">
                                {imageBase64.map((img, idx) => (
                                    <div key={idx} className="relative shrink-0">
                                        <img src={img} alt="Preview" className="h-20 w-20 object-cover rounded-md border" />
                                        <button 
                                            onClick={() => removeImage(idx)}
                                            className="absolute -top-1 -right-1 bg-red-500 text-white rounded-full p-0.5 shadow-md hover:bg-red-600"
                                        >
                                            <X size={12} />
                                        </button>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>

                <div className="mt-6 flex justify-end space-x-3">
                    <button onClick={onClose} className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-md">Avbryt</button>
                    <button 
                        onClick={() => {
                            // Handle save
                            const isoDate = new Date(entryDate).toISOString();
                            
                            onSave({
                                id: existingEntry?.id || uuidv4(),
                                tripId,
                                date: isoDate,
                                content,
                                author,
                                images: imageBase64,
                                location: (lat && lng) ? { lat, lng, name: locationName } : undefined
                            });
                            onClose();
                        }}
                        className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                    >
                        {existingEntry ? 'Lagre endringer' : 'Skriv i boka'}
                    </button>
                </div>
            </div>
        </div>
    );
};

// --- Main App Component ---

const App: React.FC = () => {
    const [view, setView] = useState<ViewState>(ViewState.DASHBOARD);
    const [trips, setTrips] = useState<Trip[]>([]);
    const [activeTrip, setActiveTrip] = useState<Trip | null>(null);
    const [tripEntries, setTripEntries] = useState<JournalEntry[]>([]);
    const [entryToEdit, setEntryToEdit] = useState<JournalEntry | undefined>(undefined);
    
    const [isTripModalOpen, setIsTripModalOpen] = useState(false);
    const [isEntryModalOpen, setIsEntryModalOpen] = useState(false);

    useEffect(() => {
        setTrips(storage.getTrips());
    }, []);

    useEffect(() => {
        if (activeTrip) {
            setTripEntries(storage.getEntriesForTrip(activeTrip.id));
        }
    }, [activeTrip]);

    const handleSaveTrip = (trip: Trip) => {
        storage.saveTrip(trip);
        setTrips(storage.getTrips());
        setActiveTrip(trip); // Switch to new trip immediately
        setView(ViewState.TRIP_DETAIL);
    };

    const handleDeleteTrip = (e: React.MouseEvent, id: string) => {
        e.stopPropagation();
        if (confirm("Er du sikker på at du vil slette denne turen og alle oppføringer?")) {
            storage.deleteTrip(id);
            setTrips(storage.getTrips());
            if (activeTrip?.id === id) {
                setView(ViewState.DASHBOARD);
                setActiveTrip(null);
            }
        }
    };

    const handleSaveEntry = (entry: JournalEntry) => {
        storage.saveEntry(entry);
        if (activeTrip) {
            setTripEntries(storage.getEntriesForTrip(activeTrip.id));
        }
        setEntryToEdit(undefined);
    };

    const handleEditEntry = (entry: JournalEntry) => {
        setEntryToEdit(entry);
        setIsEntryModalOpen(true);
    };

    const handleDeleteEntry = (id: string) => {
        if (confirm("Slette oppslag?")) {
            storage.deleteEntry(id);
            if (activeTrip) {
                setTripEntries(storage.getEntriesForTrip(activeTrip.id));
            }
        }
    }

    const closeEntryModal = () => {
        setIsEntryModalOpen(false);
        setEntryToEdit(undefined);
    }

    // --- Views ---

    const renderDashboard = () => (
        <div className="container mx-auto px-4 py-8 max-w-5xl">
            <header className="mb-10 flex justify-between items-end">
                <div>
                    <h1 className="text-4xl font-bold text-slate-800 mb-2 flex items-center gap-3">
                        <Book className="text-blue-600" size={40} /> CaravanLoggen
                    </h1>
                    <p className="text-slate-500">Din digitale hyttebok på hjul</p>
                </div>
                <button 
                    onClick={() => setIsTripModalOpen(true)}
                    className="bg-blue-600 text-white px-5 py-3 rounded-lg shadow-md hover:bg-blue-700 flex items-center gap-2 font-medium transition-colors"
                >
                    <Plus size={20} /> Ny tur
                </button>
            </header>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {trips.length === 0 && (
                    <div className="col-span-full text-center py-20 bg-slate-100 rounded-xl border-2 border-dashed border-slate-300">
                        <div className="inline-block p-4 bg-white rounded-full mb-4 shadow-sm">
                            <MapIcon className="text-slate-400" size={48} />
                        </div>
                        <h3 className="text-xl font-semibold text-slate-700 mb-2">Ingen turer enda</h3>
                        <p className="text-slate-500 mb-6">Start din første reise for å fylle opp hytteboka.</p>
                        <button onClick={() => setIsTripModalOpen(true)} className="text-blue-600 font-medium hover:underline">Opprett ny tur</button>
                    </div>
                )}
                
                {trips.map(trip => (
                    <div 
                        key={trip.id} 
                        onClick={() => { setActiveTrip(trip); setView(ViewState.TRIP_DETAIL); }}
                        className="group bg-white rounded-xl shadow-sm hover:shadow-md transition-all border border-slate-100 cursor-pointer overflow-hidden flex flex-col"
                    >
                        <div className="h-32 bg-gradient-to-r from-blue-500 to-teal-400 p-6 relative">
                            <div className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity">
                                <button 
                                    onClick={(e) => handleDeleteTrip(e, trip.id)}
                                    className="p-2 bg-white/20 text-white hover:bg-white/40 rounded-full"
                                >
                                    <Trash2 size={16} />
                                </button>
                            </div>
                            <h3 className="text-2xl font-bold text-white truncate shadow-black drop-shadow-md">{trip.title}</h3>
                        </div>
                        <div className="p-6 flex-1 flex flex-col">
                            <div className="flex items-center text-slate-500 text-sm mb-3 gap-2">
                                <Calendar size={14} />
                                <span>Startet {new Date(trip.startDate).toLocaleDateString('no-NO')}</span>
                            </div>
                            <p className="text-slate-600 line-clamp-3 flex-1">{trip.description}</p>
                            <div className="mt-4 pt-4 border-t border-slate-100 flex justify-between items-center">
                                <span className="text-xs font-semibold text-blue-600 uppercase tracking-wider">Åpne boka</span>
                                <ChevronLeft className="rotate-180 text-slate-400 group-hover:translate-x-1 transition-transform" size={16} />
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );

    const renderTripDetail = () => {
        if (!activeTrip) return null;

        // Map markers - Prepare rich data for the map
        const mapEntries = tripEntries
            .filter(e => e.location)
            .map(e => ({
                lat: e.location!.lat,
                lng: e.location!.lng,
                title: e.location!.name,
                date: e.date,
                thumbnail: e.images && e.images.length > 0 ? e.images[0] : undefined,
                snippet: e.content.length > 100 ? e.content.substring(0, 97) + '...' : e.content
            }));
            
        // Beregn rute kronologisk (Eldst -> Nyest) for å tegne linjen i riktig rekkefølge.
        // tripEntries kommer fra storage sortert Nyest -> Eldst (for journalvisning).
        const routePath = [...tripEntries]
            .filter(e => e.location)
            .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
            .map(e => ({ lat: e.location!.lat, lng: e.location!.lng }));

        return (
            <div className="h-screen flex flex-col bg-slate-50">
                {/* Header */}
                <div className="bg-white border-b border-slate-200 px-6 py-4 flex justify-between items-center shadow-sm z-10">
                    <div className="flex items-center gap-4">
                        <button 
                            onClick={() => setView(ViewState.DASHBOARD)}
                            className="p-2 hover:bg-slate-100 rounded-full text-slate-600"
                        >
                            <ChevronLeft size={24} />
                        </button>
                        <div>
                            <h1 className="text-xl font-bold text-slate-800">{activeTrip.title}</h1>
                            <p className="text-xs text-slate-500">{new Date(activeTrip.startDate).toLocaleDateString('no-NO')} - {tripEntries.length} oppslag</p>
                        </div>
                    </div>
                    <button 
                        onClick={() => setIsEntryModalOpen(true)}
                        className="bg-blue-600 text-white px-4 py-2 rounded-md shadow-sm hover:bg-blue-700 flex items-center gap-2"
                    >
                        <Edit3 size={16} /> Skriv i boka
                    </button>
                </div>

                {/* Content */}
                <div className="flex-1 flex overflow-hidden">
                    {/* Left: Map (Hidden on mobile, typically) */}
                    <div className="hidden md:block w-1/3 lg:w-2/5 h-full bg-slate-200 relative border-r border-slate-300">
                       <MapComponent entries={mapEntries} route={routePath} />
                       {mapEntries.length === 0 && (
                           <div className="absolute inset-0 flex items-center justify-center bg-slate-100/80 z-[1000] pointer-events-none">
                               <p className="text-slate-500 bg-white px-4 py-2 rounded shadow">Ingen kartdata enda</p>
                           </div>
                       )}
                    </div>

                    {/* Right: Journal */}
                    <div className="flex-1 overflow-y-auto p-4 md:p-8 bg-[url('https://www.transparenttextures.com/patterns/paper.png')] bg-amber-50">
                        <div className="max-w-3xl mx-auto space-y-8">
                            {tripEntries.length === 0 && (
                                <div className="text-center py-20 opacity-60">
                                    <Book size={64} className="mx-auto mb-4 text-amber-800" />
                                    <h2 className="text-2xl font-serif text-amber-900 mb-2">Hytteboka er tom</h2>
                                    <p className="text-amber-800">Trykk på "Skriv i boka" for å legge til første minne.</p>
                                </div>
                            )}

                            {tripEntries.map((entry) => (
                                <div key={entry.id} className="bg-white shadow-sm border border-amber-100 rounded-lg overflow-hidden relative group">
                                    {/* Action Buttons */}
                                    <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity bg-white/80 rounded-md p-1 shadow-sm z-10">
                                        <button 
                                            onClick={() => handleEditEntry(entry)}
                                            className="p-1.5 text-slate-500 hover:text-blue-600 hover:bg-blue-50 rounded"
                                            title="Rediger"
                                        >
                                            <Edit3 size={16} />
                                        </button>
                                        <button 
                                            onClick={() => handleDeleteEntry(entry.id)}
                                            className="p-1.5 text-slate-500 hover:text-red-600 hover:bg-red-50 rounded"
                                            title="Slett"
                                        >
                                            <Trash2 size={16} />
                                        </button>
                                    </div>

                                    {/* Header */}
                                    <div className="bg-amber-100/50 px-6 py-3 border-b border-amber-100 flex justify-between items-center">
                                        <div className="flex items-center gap-3 text-amber-900 font-semibold">
                                            <div className="flex items-center gap-1">
                                                <Calendar size={16} />
                                                <span>{new Date(entry.date).toLocaleDateString('no-NO', { weekday: 'long', day: 'numeric', month: 'long' })}</span>
                                            </div>
                                            <div className="flex items-center gap-1 text-sm font-normal opacity-80">
                                                <Clock size={14} />
                                                <span>kl. {new Date(entry.date).toLocaleTimeString('no-NO', { hour: '2-digit', minute: '2-digit' })}</span>
                                            </div>
                                        </div>
                                        {entry.location && (
                                            <div className="flex items-center gap-1 text-sm text-amber-800 bg-white/50 px-2 py-1 rounded-full">
                                                <MapPin size={12} />
                                                {entry.location.name}
                                            </div>
                                        )}
                                    </div>

                                    {/* Body */}
                                    <div className="p-6 md:p-8">
                                        <div className="prose font-serif text-slate-800 whitespace-pre-wrap text-lg leading-relaxed">
                                            {entry.content}
                                        </div>

                                        {entry.images.length > 0 && (
                                            <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 gap-4">
                                                {entry.images.map((img, i) => (
                                                    <img key={i} src={img} alt="Journal entry" className="rounded-lg border border-slate-200 shadow-sm object-cover w-full h-64" />
                                                ))}
                                            </div>
                                        )}

                                        <div className="mt-8 flex justify-end">
                                            <span className="font-handwriting text-slate-500 italic pr-4 font-serif">
                                                – {entry.author || 'Anonym'}
                                            </span>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>
        );
    };

    return (
        <>
            {view === ViewState.DASHBOARD && renderDashboard()}
            {view === ViewState.TRIP_DETAIL && renderTripDetail()}
            
            <TripModal 
                isOpen={isTripModalOpen} 
                onClose={() => setIsTripModalOpen(false)} 
                onSave={handleSaveTrip}
                existingTrip={undefined} 
            />

            {activeTrip && (
                <EntryModal 
                    isOpen={isEntryModalOpen}
                    onClose={closeEntryModal}
                    onSave={handleSaveEntry}
                    tripId={activeTrip.id}
                    existingEntry={entryToEdit}
                />
            )}
        </>
    );
};

export default App;