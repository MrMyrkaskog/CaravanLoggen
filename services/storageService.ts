import { Trip, JournalEntry, User } from '../types';
import { supabase } from './supabaseClient';
import { v4 as uuidv4 } from 'uuid';

// --- Auth & Users ---

export const getCurrentUser = async (): Promise<User | null> => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.user) return null;

    // Fetch profile data
    const { data: profile } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', session.user.id)
        .single();

    if (profile) {
        return {
            id: profile.id,
            name: profile.full_name || session.user.email?.split('@')[0] || 'Bruker',
            role: profile.role || 'MEMBER',
            avatar: profile.avatar_url
        };
    }

    return {
        id: session.user.id,
        name: session.user.email?.split('@')[0] || 'Bruker',
        role: 'MEMBER',
    };
};

export const signInWithEmail = async (email: string) => {
    // For demo purposes, we use magic link or simple sign up. 
    // In a real app, you'd handle password or OTP.
    // Let's assume simple password login for now.
    // NOTE: This requires the user to have signed up first.
    return await supabase.auth.signInWithOtp({ email });
};

export const signOut = async () => {
    await supabase.auth.signOut();
};

// --- Trips ---

export const getTrips = async (): Promise<Trip[]> => {
    const { data, error } = await supabase
        .from('trips')
        .select('*')
        .order('start_date', { ascending: false });

    if (error) {
        console.error('Error fetching trips:', error);
        return [];
    }

    // Map snake_case DB columns to camelCase types if necessary
    // Assuming we created the table with columns matching our types or use mapping here
    // For simplicity, let's assume columns are: id, owner_id, title, location, start_date, end_date, description, share_code
    
    return data.map((t: any) => ({
        id: t.id,
        ownerId: t.owner_id,
        title: t.title,
        location: t.location,
        startDate: t.start_date,
        endDate: t.end_date,
        description: t.description,
        shareCode: t.share_code,
        coverImage: t.cover_image
    }));
};

export const saveTrip = async (trip: Trip): Promise<Trip> => {
    // Determine if insert or update
    // We need to map camelCase to snake_case for DB
    const dbTrip = {
        id: trip.id,
        owner_id: trip.ownerId,
        title: trip.title,
        location: trip.location,
        start_date: trip.startDate,
        end_date: trip.endDate,
        description: trip.description,
        share_code: trip.shareCode,
        cover_image: trip.coverImage
    };

    const { error } = await supabase
        .from('trips')
        .upsert(dbTrip);

    if (error) throw error;
    return trip;
};

export const deleteTrip = async (id: string): Promise<void> => {
    const { error } = await supabase.from('trips').delete().eq('id', id);
    if (error) throw error;
    // Cascading delete in Postgres usually handles entries, but verify RLS.
};

// --- Entries ---

export const getEntriesForTrip = async (tripId: string): Promise<JournalEntry[]> => {
    const { data, error } = await supabase
        .from('entries')
        .select('*')
        .eq('trip_id', tripId)
        .order('date', { ascending: false });

    if (error) {
        console.error('Error fetching entries:', error);
        return [];
    }

    return data.map((e: any) => ({
        id: e.id,
        tripId: e.trip_id,
        date: e.date,
        content: e.content,
        location: e.location, // JSONB column
        images: e.images || [], // Array of URLs
        author: e.author_name,
        authorId: e.author_id
    }));
};

// Helper to upload base64 image to Supabase Storage
const uploadImage = async (base64Image: string): Promise<string> => {
    try {
        // Check if it's already a URL (from previous save)
        if (base64Image.startsWith('http')) return base64Image;

        // Convert Base64 to Blob
        const res = await fetch(base64Image);
        const blob = await res.blob();
        
        const fileName = `${uuidv4()}.jpg`;
        const filePath = `journal_images/${fileName}`;

        const { error: uploadError } = await supabase.storage
            .from('images')
            .upload(filePath, blob);

        if (uploadError) throw uploadError;

        const { data } = supabase.storage.from('images').getPublicUrl(filePath);
        return data.publicUrl;
    } catch (e) {
        console.error("Image upload failed", e);
        return base64Image; // Fallback (though DB might reject large string)
    }
};

export const saveEntry = async (entry: JournalEntry): Promise<JournalEntry> => {
    // 1. Upload images first
    const imageUrls: string[] = [];
    for (const img of entry.images) {
        const url = await uploadImage(img);
        imageUrls.push(url);
    }

    const dbEntry = {
        id: entry.id,
        trip_id: entry.tripId,
        date: entry.date,
        content: entry.content,
        location: entry.location,
        images: imageUrls,
        author_name: entry.author,
        author_id: entry.authorId
    };

    const { error } = await supabase
        .from('entries')
        .upsert(dbEntry);

    if (error) throw error;
    
    // Return entry with updated image URLs
    return { ...entry, images: imageUrls };
};

export const deleteEntry = async (id: string): Promise<void> => {
    const { error } = await supabase.from('entries').delete().eq('id', id);
    if (error) throw error;
};

// --- Mock User Helpers (Deprecated but kept for signature compatibility if needed) ---
export const getAvailableUsers = (): User[] => [];