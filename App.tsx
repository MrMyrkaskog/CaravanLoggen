import React, { useState, useEffect } from 'react';
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
  Clock,
  Share2,
  QrCode,
  LogOut,
  User as UserIcon,
  Loader2,
  Mail
} from 'lucide-react';
import { v4 as uuidv4 } from 'uuid';
import { Trip, JournalEntry, ViewState, User } from './types';
import * as storage from './services/storageService';
import * as gemini from './services/geminiService';
import { pb } from './services/pocketbaseClient';
import MapComponent from './components/MapComponent';

// --- Auth Component ---

const AuthScreen: React.FC<{ onLogin: () => void }> = ({ onLogin }) => {
    const [email, setEmail] = useState('');
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState('');

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setMessage('');
        
        try {
            await pb.collection('users').requestMagicLink(email);
            setMessage('Sjekk e-posten din for innloggingslink!');
        } catch (error: any) {
            setMessage(error.message || 'En feil oppstod');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-slate-100 flex items-center justify-center p-4">
            <div className="bg-white p-8 rounded-xl shadow-lg max-w-md w-full">
                <div className="text-center mb-8">
                    <div className="inline-flex p-4 bg-blue-50 rounded-full mb-4">
                        <Book className="text-blue-600" size={40} />
                    </div>
                    <h1 className="text-2xl font-bold text-slate-800">CaravanLoggen</h1>
                    <p className="text-slate-500">Din digitale hyttebok på veien</p>
                </div>

                {message ? (
                    <div className="bg-green-50 text-green-800 p-4 rounded-lg text-center border border-green-200">
                        <p className="font-medium">{message}</p>
                        <p className="text-sm mt-2 opacity-80">Du kan lukke dette vinduet.</p>
                    </div>
                ) : (
                    <form onSubmit={handleLogin} className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">E-postadresse</label>
                            <div className="relative">
                                <Mail className="absolute left-3 top-3 text-slate-400" size={20} />
                                <input 
                                    type="email" 
                                    required
                                    className="w-full pl-10 pr-4 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                                    placeholder="deg@eksempel.no"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                />
                            </div>
                        </div>
                        <button 
                            type="submit" 
                            disabled={loading}
                            className="w-full bg-blue-600 text-white py-2.5 rounded-lg font-semibold hover:bg-blue-700 transition-colors disabled:opacity-70 flex justify-center items-center gap-2"
                        >
                            {loading && <Loader2 className="animate-spin" size={20} />}
                            {loading ? 'Sender...' : 'Send meg innloggingslink'}
                        </button>
                        <p className="text-xs text-center text-slate-500 mt-4">
                            Vi sender deg en "Magisk Link". Du trenger ikke passord.
                        </p>
                    </form>
                )}
            </div>
        </div>
    );
};

// --- Components ---

// 1. Create/Edit Trip Modal
const TripModal: React.FC<{
    isOpen: boolean;
    onClose: () => void;
    onSave: (trip: Trip) => void;
    currentUser: User;
    existingTrip?: Trip;
    isSaving: boolean;
}> = ({ isOpen, onClose, onSave, currentUser, existingTrip, isSaving }) => {
    const [title, setTitle] = useState('');
    const [location, setLocation] = useState('');
    const [description, setDescription] = useState('');
    const [startDate, setStartDate] = useState(new Date().toISOString().split('T')[0]);
    const [isGeneratingTitle, setIsGeneratingTitle] = useState(false);

    useEffect(() => {
        if (isOpen) {
            if (existingTrip) {
                setTitle(existingTrip.title);
                setLocation(existingTrip.location || '');
                setDescription(existingTrip.description);
                setStartDate(existingTrip.startDate);
            } else {
                setTitle('');
                setLocation('');
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
                        <label className="block text-sm font-medium text-gray-700 mb-1">Reisemål / Sted</label>
                        <input 
                            type="text" 
                            className="w-full p-2 border rounded-md"
                            placeholder="F.eks. Vestlandet eller Danmark"
                            value={location}
                            onChange={(e) => setLocation(e.target.value)}
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
                    <button onClick={onClose} disabled={isSaving} className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-md">Avbryt</button>
                    <button 
                        onClick={() => {
                            onSave({
                                id: existingTrip?.id || uuidv4(),
                                ownerId: existingTrip?.ownerId || currentUser.id,
                                title: title || 'Uten navn',
                                location: location,
                                description,
                                startDate,
                                endDate: existingTrip?.endDate,
                                shareCode: existingTrip?.shareCode || uuidv4().substring(0, 8)
                            });
                        }}
                        disabled={isSaving}
                        className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-70 flex items-center gap-2"
                    >
                        {isSaving && <Loader2 size={16} className="animate-spin" />}
                        {isSaving ? 'Lagrer...' : 'Lagre'}
                    </button>
                </div>
            </div>
        </div>
    );
};

// 2. Share Modal
const ShareModal: React.FC<{
    isOpen: boolean;
    onClose: () => void;
    trip: Trip;
}> = ({ isOpen, onClose, trip }) => {
    if (!isOpen) return null;

    // Simple QR for demo
    const qrData = `https://caravanloggen.app/join/${trip.shareCode}`;
    const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(qrData)}`;

    return (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-sm p-6 text-center">
                <div className="flex justify-between items-center mb-4">
                    <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                        <QrCode size={20} /> Gjestetilgang
                    </h3>
                    <button onClick={onClose} className="text-slate-400 hover:text-slate-600">
                        <X size={24} />
                    </button>
                </div>
                
                <p className="text-slate-600 text-sm mb-6">
                    Vis denne QR-koden til gjester i vogna.
                </p>

                <div className="bg-white p-4 rounded-lg border border-slate-200 inline-block mb-6 shadow-inner">
                    <img src={qrUrl} alt="QR Code" className="w-48 h-48" />
                </div>

                <div className="bg-blue-50 text-blue-800 p-3 rounded-md text-xs font-mono break-all">
                    {qrData}
                </div>
            </div>
        </div>
    );
};

// 3. Entry Form Modal
const EntryModal: React.FC<{
    isOpen: boolean;
    onClose: () => void;
    onSave: (entry: JournalEntry) => void;
    tripId: string;
    currentUser: User;
    existingEntry?: JournalEntry;
    initialLocation?: { lat: number, lng: number };
    isSaving: boolean;
}> = ({ isOpen, onClose, onSave, tripId, currentUser, existingEntry, initialLocation, isSaving }) => {
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
                
                const d = new Date(existingEntry.date);
                const localIso = new Date(d.getTime() - (d.getTimezoneOffset() * 60000)).toISOString().slice(0, 16);
                setEntryDate(localIso);
            } else {
                setContent('');
                setAuthor(currentUser.name);
                
                setImageBase64([]);
                
                if (initialLocation) {
                    setLat(initialLocation.lat);
                    setLng(initialLocation.lng);
                    setLocationName("Valgt fra kart");
                } else {
                    setLat(null);
                    setLng(null);
                    setLocationName('');
                }
                
                const now = new Date();
                const localIso = new Date(now.getTime() - (now.getTimezoneOffset() * 60000)).toISOString().slice(0, 16);
                setEntryDate(localIso);
            }
        }
    }, [isOpen, existingEntry, initialLocation, currentUser]);

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
                    <button onClick={onClose} disabled={isSaving} className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-md">Avbryt</button>
                    <button 
                        onClick={() => {
                            const isoDate = new Date(entryDate).toISOString();
                            onSave({
                                id: existingEntry?.id || uuidv4(),
                                tripId,
                                date: isoDate,
                                content,
                                author,
                                authorId: currentUser.id,
                                images: imageBase64,
                                location: (lat && lng) ? { lat, lng, name: locationName } : undefined
                            });
                        }}
                        disabled={isSaving}
                        className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-70 flex items-center gap-2"
                    >
                        {isSaving && <Loader2 size={16} className="animate-spin" />}
                        {isSaving ? 'Lagrer...' : (existingEntry ? 'Lagre endringer' : 'Skriv i boka')}
                    </button>
                </div>
            </div>
        </div>
    );
};

// --- Main App Component ---

const App: React.FC = () => {
    const [view, setView] = useState<ViewState>(ViewState.DASHBOARD);
    
    // Data State
    const [trips, setTrips] = useState<Trip[]>([]);
    const [activeTrip, setActiveTrip] = useState<Trip | null>(null);
    const [tripEntries, setTripEntries] = useState<JournalEntry[]>([]);
    
    // UI State
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [entryToEdit, setEntryToEdit] = useState<JournalEntry | undefined>(undefined);
    const [clickedMapLocation, setClickedMapLocation] = useState<{lat: number, lng: number} | undefined>(undefined);
    
    // User State
    const [currentUser, setCurrentUser] = useState<User | null>(null);
    const [isAuthChecking, setIsAuthChecking] = useState(true);
    
    // Modals
    const [isTripModalOpen, setIsTripModalOpen] = useState(false);
    const [isEntryModalOpen, setIsEntryModalOpen] = useState(false);
    const [isShareModalOpen, setIsShareModalOpen] = useState(false);

    // Auth Check & Initial Load
    useEffect(() => {
        const checkAuth = async () => {
            setIsAuthChecking(true);
            const user = await storage.getCurrentUser();
            setCurrentUser(user);
            setIsAuthChecking(false);
        };
        
        checkAuth();

        // Listen for auth changes
        pb.authStore.onChange(async () => {
            const user = await storage.getCurrentUser();
            setCurrentUser(user);
        });

        return () => {
            // PocketBase onChange doesn't return an unsubscribe by default in some versions, 
            // but we can pass a function to remove it if needed. 
        };
    }, []);

    // Load Data when user is logged in
    useEffect(() => {
        if (currentUser) {
            const loadData = async () => {
                setIsLoading(true);
                try {
                    const loadedTrips = await storage.getTrips();
                    setTrips(loadedTrips);
                } finally {
                    setIsLoading(false);
                }
            };
            loadData();
        }
    }, [currentUser]);

    // Load Entries when Trip Changes
    useEffect(() => {
        if (activeTrip) {
            const loadEntries = async () => {
                setIsLoading(true);
                try {
                    const entries = await storage.getEntriesForTrip(activeTrip.id);
                    setTripEntries(entries);
                } finally {
                    setIsLoading(false);
                }
            };
            loadEntries();
        }
    }, [activeTrip]);

    const handleLogout = async () => {
        await storage.signOut();
        setCurrentUser(null);
        setView(ViewState.DASHBOARD);
    }

    const handleSaveTrip = async (trip: Trip) => {
        setIsSaving(true);
        try {
            await storage.saveTrip(trip);
            const updatedTrips = await storage.getTrips();
            setTrips(updatedTrips);
            setActiveTrip(trip); 
            setView(ViewState.TRIP_DETAIL);
            setIsTripModalOpen(false);
        } catch (e) {
            console.error(e);
            alert("Feil ved lagring av tur");
        } finally {
            setIsSaving(false);
        }
    };

    const handleDeleteTrip = async (e: React.MouseEvent, id: string) => {
        e.stopPropagation();
        if (confirm("Er du sikker på at du vil slette denne turen og alle oppføringer?")) {
            setIsLoading(true);
            await storage.deleteTrip(id);
            const updatedTrips = await storage.getTrips();
            setTrips(updatedTrips);
            if (activeTrip?.id === id) {
                setView(ViewState.DASHBOARD);
                setActiveTrip(null);
            }
            setIsLoading(false);
        }
    };

    const handleSaveEntry = async (entry: JournalEntry) => {
        setIsSaving(true);
        try {
            await storage.saveEntry(entry);
            if (activeTrip) {
                const entries = await storage.getEntriesForTrip(activeTrip.id);
                setTripEntries(entries);
            }
            setEntryToEdit(undefined);
            setClickedMapLocation(undefined);
            setIsEntryModalOpen(false);
        } catch (e) {
            console.error(e);
            alert("Kunne ikke lagre. Pass på at bildene ikke er for store.");
        } finally {
            setIsSaving(false);
        }
    };

    const handleEditEntry = (entry: JournalEntry) => {
        if (!currentUser) return;
        // Simple permission check - in real app, strict RLS applies
        const canEdit = entry.authorId === currentUser.id || currentUser.role === 'OWNER';
        
        if (!canEdit) {
            alert("Du kan bare redigere dine egne innlegg.");
            return;
        }
        setEntryToEdit(entry);
        setClickedMapLocation(undefined);
        setIsEntryModalOpen(true);
    };

    const handleDeleteEntry = async (entry: JournalEntry) => {
        if (!currentUser) return;
        const canDelete = entry.authorId === currentUser.id || currentUser.role === 'OWNER';

        if (!canDelete) {
            alert("Du kan ikke slette dette innlegget.");
            return;
        }
        
        if (confirm("Slette oppslag?")) {
            setIsLoading(true);
            await storage.deleteEntry(entry.id);
            if (activeTrip) {
                const entries = await storage.getEntriesForTrip(activeTrip.id);
                setTripEntries(entries);
            }
            setIsLoading(false);
        }
    }

    const closeEntryModal = () => {
        setIsEntryModalOpen(false);
        setEntryToEdit(undefined);
        setClickedMapLocation(undefined);
    }
    
    const handleMapClick = (lat: number, lng: number) => {
        setClickedMapLocation({ lat, lng });
        setEntryToEdit(undefined);
        setIsEntryModalOpen(true);
    }

    // --- Render ---

    if (isAuthChecking) {
        return <div className="h-screen flex items-center justify-center"><Loader2 className="animate-spin text-blue-600" size={48} /></div>;
    }

    if (!currentUser) {
        return <AuthScreen onLogin={() => {}} />;
    }

    const renderDashboard = () => (
        <div className="container mx-auto px-4 py-8 max-w-5xl">
            <header className="mb-10 flex justify-between items-center">
                <div>
                    <h1 className="text-4xl font-bold text-slate-800 mb-2 flex items-center gap-3">
                        <Book className="text-blue-600" size={40} /> CaravanLoggen
                    </h1>
                    <p className="text-slate-500">Innlogget som {currentUser.name}</p>
                </div>
                <div className="flex items-center gap-4">
                    <button onClick={handleLogout} className="text-slate-500 hover:text-slate-800 text-sm flex items-center gap-1">
                        <LogOut size={16} /> Logg ut
                    </button>
                    <button 
                        onClick={() => setIsTripModalOpen(true)}
                        className="bg-blue-600 text-white px-5 py-3 rounded-lg shadow-md hover:bg-blue-700 flex items-center gap-2 font-medium transition-colors"
                    >
                        <Plus size={20} /> Ny tur
                    </button>
                </div>
            </header>
            
            {isLoading ? (
                <div className="flex justify-center py-20">
                     <Loader2 className="animate-spin text-blue-600" size={48} />
                </div>
            ) : (
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
                                <div className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity flex gap-2">
                                    <button 
                                        onClick={(e) => handleDeleteTrip(e, trip.id)}
                                        className="p-2 bg-white/20 text-white hover:bg-white/40 rounded-full"
                                    >
                                        <Trash2 size={16} />
                                    </button>
                                </div>
                                <h3 className="text-2xl font-bold text-white truncate shadow-black drop-shadow-md">{trip.title}</h3>
                                {trip.location && (
                                    <div className="flex items-center gap-1 text-white/90 text-sm mt-1 font-medium">
                                        <MapPin size={14} />
                                        <span>{trip.location}</span>
                                    </div>
                                )}
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
            )}
        </div>
    );

    const renderTripDetail = () => {
        if (!activeTrip) return null;

        // Map markers
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
                    <div className="flex items-center gap-3">
                        <button 
                            onClick={() => setIsShareModalOpen(true)}
                            className="text-slate-600 hover:bg-slate-100 p-2 rounded-md flex items-center gap-2 text-sm font-medium"
                            title="Inviter gjester"
                        >
                            <QrCode size={20} />
                            <span className="hidden sm:inline">Inviter</span>
                        </button>
                        
                        <button 
                            onClick={() => setIsEntryModalOpen(true)}
                            className="bg-blue-600 text-white px-4 py-2 rounded-md shadow-sm hover:bg-blue-700 flex items-center gap-2"
                        >
                            <Edit3 size={16} /> Skriv i boka
                        </button>
                    </div>
                </div>

                {/* Content */}
                <div className="flex-1 flex overflow-hidden relative">
                    {/* Loading overlay for trip detail */}
                    {isLoading && (
                        <div className="absolute inset-0 bg-white/50 flex items-center justify-center z-50">
                            <Loader2 className="animate-spin text-blue-600" size={32} />
                        </div>
                    )}

                    {/* Left: Map */}
                    <div className="hidden md:block w-1/3 lg:w-2/5 h-full bg-slate-200 relative border-r border-slate-300">
                       <MapComponent 
                           entries={mapEntries} 
                           route={routePath} 
                           onMapClick={handleMapClick} 
                        />
                       {mapEntries.length === 0 && !isLoading && (
                           <div className="absolute inset-0 flex items-center justify-center bg-slate-100/80 z-[1000] pointer-events-none">
                               <p className="text-slate-500 bg-white px-4 py-2 rounded shadow">Ingen kartdata enda</p>
                           </div>
                       )}
                    </div>

                    {/* Right: Journal */}
                    <div className="flex-1 overflow-y-auto p-4 md:p-8 bg-[url('https://www.transparenttextures.com/patterns/paper.png')] bg-amber-50">
                        <div className="max-w-3xl mx-auto space-y-8">
                            {tripEntries.length === 0 && !isLoading && (
                                <div className="text-center py-20 opacity-60">
                                    <Book size={64} className="mx-auto mb-4 text-amber-800" />
                                    <h2 className="text-2xl font-serif text-amber-900 mb-2">Hytteboka er tom</h2>
                                    <p className="text-amber-800">Trykk på "Skriv i boka" for å legge til første minne.</p>
                                </div>
                            )}

                            {tripEntries.map((entry) => {
                                const canModify = entry.authorId === currentUser.id || currentUser.role === 'OWNER';
                                return (
                                    <div key={entry.id} className="bg-white shadow-sm border border-amber-100 rounded-lg overflow-hidden relative group">
                                        {/* Action Buttons */}
                                        {canModify && (
                                            <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity bg-white/80 rounded-md p-1 shadow-sm z-10">
                                                <button 
                                                    onClick={() => handleEditEntry(entry)}
                                                    className="p-1.5 text-slate-500 hover:text-blue-600 hover:bg-blue-50 rounded"
                                                    title="Rediger"
                                                >
                                                    <Edit3 size={16} />
                                                </button>
                                                <button 
                                                    onClick={() => handleDeleteEntry(entry)}
                                                    className="p-1.5 text-slate-500 hover:text-red-600 hover:bg-red-50 rounded"
                                                    title="Slett"
                                                >
                                                    <Trash2 size={16} />
                                                </button>
                                            </div>
                                        )}

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
                                );
                            })}
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
                currentUser={currentUser!}
                existingTrip={undefined}
                isSaving={isSaving}
            />
            
            {activeTrip && (
                <ShareModal 
                    isOpen={isShareModalOpen}
                    onClose={() => setIsShareModalOpen(false)}
                    trip={activeTrip}
                />
            )}

            {activeTrip && (
                <EntryModal 
                    isOpen={isEntryModalOpen}
                    onClose={closeEntryModal}
                    onSave={handleSaveEntry}
                    tripId={activeTrip.id}
                    currentUser={currentUser!}
                    existingEntry={entryToEdit}
                    initialLocation={clickedMapLocation}
                    isSaving={isSaving}
                />
            )}
        </>
    );
};

export default App;