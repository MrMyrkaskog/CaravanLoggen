import { Trip, JournalEntry, User } from '../types';
import { pb } from './pocketbaseClient';
import { v4 as uuidv4 } from 'uuid';

// --- Auth & Users ---

export const getCurrentUser = async (): Promise<User | null> => {
    if (!pb.authStore.isValid) return null;

    const user = pb.authStore.model;
    if (!user) return null;

    return {
        id: user.id,
        name: user.name || user.email?.split('@')[0] || 'Bruker',
        role: user.role || 'MEMBER',
        avatar: user.avatar ? pb.getFileUrl(user, user.avatar) : undefined
    };
};

export const signInWithEmail = async (email: string) => {
    // PocketBase supports passwordless auth via magic links (OTP) too
    return await pb.collection('users').requestMagicLink(email);
};

export const signOut = async () => {
    pb.authStore.clear();
};

// --- Trips ---

export const getTrips = async (): Promise<Trip[]> => {
    try {
        const records = await pb.collection('trips').getFullList({
            sort: '-startDate',
        });

        return records.map((t: any) => ({
            id: t.id,
            ownerId: t.ownerId,
            title: t.title,
            location: t.location,
            startDate: t.startDate,
            endDate: t.endDate,
            description: t.description,
            shareCode: t.shareCode,
            coverImage: t.coverImage ? pb.getFileUrl(t, t.coverImage) : undefined
        }));
    } catch (error) {
        console.error('Error fetching trips:', error);
        return [];
    }
};

export const saveTrip = async (trip: Trip): Promise<Trip> => {
    const data = {
        ownerId: trip.ownerId,
        title: trip.title,
        location: trip.location,
        startDate: trip.startDate,
        endDate: trip.endDate,
        description: trip.description,
        shareCode: trip.shareCode,
    };

    try {
        if (trip.id && trip.id.length >= 15) { // PocketBase IDs are usually 15 chars
             await pb.collection('trips').update(trip.id, data);
        } else {
             const record = await pb.collection('trips').create(data);
             trip.id = record.id;
        }
        return trip;
    } catch (error) {
        // Handle potential "id does not exist" by trying create if update fails
        const record = await pb.collection('trips').create(data);
        trip.id = record.id;
        return trip;
    }
};

export const deleteTrip = async (id: string): Promise<void> => {
    await pb.collection('trips').delete(id);
};

// --- Entries ---

export const getEntriesForTrip = async (tripId: string): Promise<JournalEntry[]> => {
    try {
        const records = await pb.collection('journal_entries').getFullList({
            filter: `tripId = "${tripId}"`,
            sort: '-date',
        });

        return records.map((e: any) => ({
            id: e.id,
            tripId: e.tripId,
            date: e.date,
            content: e.content,
            location: e.location, // PocketBase handles JSON fields
            images: e.images ? e.images.map((img: string) => pb.getFileUrl(e, img)) : [],
            author: e.author,
            authorId: e.authorId
        }));
    } catch (error) {
        console.error('Error fetching entries:', error);
        return [];
    }
};

export const saveEntry = async (entry: JournalEntry): Promise<JournalEntry> => {
    // PocketBase handles file uploads directly via FormData
    const formData = new FormData();
    formData.append('tripId', entry.tripId);
    formData.append('date', entry.date);
    formData.append('content', entry.content);
    formData.append('author', entry.author);
    formData.append('authorId', entry.authorId || '');
    
    if (entry.location) {
        formData.append('location', JSON.stringify(entry.location));
    }

    // Handle images
    for (const img of entry.images) {
        // If it's already a URL, we don't need to re-upload (PB keeps existing if not sent, or we handle it)
        // But for simplicity in this migration:
        if (img.startsWith('data:')) {
            const res = await fetch(img);
            const blob = await res.blob();
            formData.append('images', blob, `image_${uuidv4()}.jpg`);
        }
    }

    try {
        let record;
        if (entry.id && entry.id.length >= 15) {
            record = await pb.collection('journal_entries').update(entry.id, formData);
        } else {
            record = await pb.collection('journal_entries').create(formData);
        }

        return {
            ...entry,
            id: record.id,
            images: record.images.map((img: string) => pb.getFileUrl(record, img))
        };
    } catch (error) {
        const record = await pb.collection('journal_entries').create(formData);
        return {
            ...entry,
            id: record.id,
            images: record.images.map((img: string) => pb.getFileUrl(record, img))
        };
    }
};

export const deleteEntry = async (id: string): Promise<void> => {
    await pb.collection('journal_entries').delete(id);
};

export const getAvailableUsers = (): User[] => [];
