import { Trip, JournalEntry, User, PlannedStop } from '../types';
import { apiClient } from './apiClient';

export const getCurrentUser = async (): Promise<User | null> => {
    const saved = localStorage.getItem('jwt_user');
    if (!saved) return null;
    try {
        return JSON.parse(saved);
    } catch {
        return null;
    }
};

export const signOut = async () => {
    localStorage.removeItem('jwt_token');
    localStorage.removeItem('jwt_user');
};

// --- MAPPING HELPERS ---
// Konverterer frå Rust snake_case til TypeScript camelCase

const mapTripFromApi = (apiTrip: any): Trip => ({
    id: apiTrip.id,
    ownerId: apiTrip.owner_id,
    title: apiTrip.title,
    location: apiTrip.location,
    startDate: apiTrip.start_date,
    endDate: apiTrip.end_date,
    description: apiTrip.description,
    coverImage: apiTrip.cover_image,
    shareCode: apiTrip.share_code,
    createdAt: apiTrip.created_at,
    status: apiTrip.status,
});

const mapEntryFromApi = (apiEntry: any): JournalEntry => ({
    id: apiEntry.id,
    tripId: apiEntry.trip_id,
    authorId: apiEntry.author_id,
    author: apiEntry.author_name,
    date: apiEntry.date,
    content: apiEntry.content,
    location: apiEntry.loc_lat ? {
        lat: apiEntry.loc_lat,
        lng: apiEntry.loc_lng,
        name: apiEntry.loc_name,
    } : undefined,
    images: apiEntry.images || [],
    createdAt: apiEntry.created_at,
});

// --- Trips ---

export const getTrips = async (): Promise<Trip[]> => {
    try {
        const data = await apiClient.get<any[]>(`/trips`);
        return data.map(mapTripFromApi);
    } catch (error) {
        console.error('Error fetching trips:', error);
        return [];
    }
};

export const saveTrip = async (trip: Trip): Promise<Trip> => {
    try {
        const payload = {
            title: trip.title,
            location: trip.location,
            start_date: trip.startDate,
            end_date: trip.endDate,
            description: trip.description,
            cover_image: trip.coverImage,
        };

        if (trip.createdAt) {
            const result = await apiClient.put<any>(`/trips/${trip.id}`, payload);
            return mapTripFromApi(result);
        } else {
            const result = await apiClient.post<any>('/trips', payload);
            return mapTripFromApi(result);
        }
    } catch (error) {
        console.error('Error saving trip:', error);
        throw error;
    }
};

// --- Entries ---

export const getEntriesForTrip = async (tripId: string): Promise<JournalEntry[]> => {
    try {
        const data = await apiClient.get<any[]>(`/trips/${tripId}/entries`);
        return data.map(mapEntryFromApi);
    } catch (error) {
        console.error('Error fetching entries:', error);
        return [];
    }
};

export const saveEntry = async (entry: JournalEntry): Promise<JournalEntry> => {
    try {
        const payload = {
            trip_id: entry.tripId,
            content: entry.content,
            date: entry.date,
            loc_lat: entry.location?.lat ? Math.round(entry.location.lat * 1000000) / 1000000 : undefined,
            loc_lng: entry.location?.lng ? Math.round(entry.location.lng * 1000000) / 1000000 : undefined,
            loc_name: entry.location?.name,
            images: entry.images,
            author_name: entry.author,
        };

        if (entry.createdAt) {
            const result = await apiClient.put<any>(`/entries/${entry.id}`, payload);
            return mapEntryFromApi(result);
        } else {
            const result = await apiClient.post<any>('/entries', payload);
            return mapEntryFromApi(result);
        }
    } catch (error) {
        console.error('Error saving entry:', error);
        throw error;
    }
};

export const deleteEntry = async (id: string): Promise<void> => {
    await apiClient.delete(`/entries/${id}`);
};

export const deleteTrip = async (id: string): Promise<void> => {
    await apiClient.delete(`/trips/${id}`);
};

export const uploadEntryImages = async (entryId: string, files: File[]) => {
    const fd = new FormData();
    files.forEach(f => fd.append("images", f));
    return apiClient.postForm<{ entry_id: string; uploaded: { url: string }[] }>(`/entries/${entryId}/images`, fd);
};

// --- Trip Status ---

export const updateTripStatus = async (id: string, status: string): Promise<Trip> => {
    try {
        const result = await apiClient.put<any>(`/trips/${id}/status`, { status });
        return mapTripFromApi(result);
    } catch (error) {
        console.error('Error updating trip status:', error);
        throw error;
    }
};

// --- Planned Stops ---

export const getPlannedStops = async (tripId: string): Promise<PlannedStop[]> => {
    try {
        return await apiClient.get<PlannedStop[]>(`/trips/${tripId}/planned_stops`);
    } catch (error) {
        console.error('Error fetching planned stops:', error);
        return [];
    }
};

export const savePlannedStop = async (tripId: string, stop: any): Promise<PlannedStop> => {
    try {
        const payload = { ...stop };
        if (!stop.id) delete payload.id;

        if (stop.id && stop.id.length === 36) {
            return await apiClient.put<PlannedStop>(`/planned_stops/${stop.id}`, payload);
        } else {
            return await apiClient.post<PlannedStop>(`/trips/${tripId}/planned_stops`, payload);
        }
    } catch (error) {
        console.error('Error saving planned stop:', error);
        throw error;
    }
};

export const importGpx = async (tripId: string, file: File) => {
    const fd = new FormData();
    fd.append("gpx_file", file);
    return apiClient.postForm<PlannedStop[]>(`/trips/${tripId}/import_gpx`, fd);
};

export const deletePlannedStop = async (stopId: string): Promise<void> => {
    await apiClient.delete(`/planned_stops/${stopId}`);
};
