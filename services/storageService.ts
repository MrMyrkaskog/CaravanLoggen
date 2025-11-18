import { Trip, JournalEntry } from '../types';

const TRIPS_KEY = 'caravan_trips';
const ENTRIES_KEY = 'caravan_entries';

export const getTrips = (): Trip[] => {
  const data = localStorage.getItem(TRIPS_KEY);
  return data ? JSON.parse(data) : [];
};

export const saveTrip = (trip: Trip): void => {
  const trips = getTrips();
  const existingIndex = trips.findIndex(t => t.id === trip.id);
  if (existingIndex >= 0) {
    trips[existingIndex] = trip;
  } else {
    trips.push(trip);
  }
  localStorage.setItem(TRIPS_KEY, JSON.stringify(trips));
};

export const deleteTrip = (id: string): void => {
    const trips = getTrips().filter(t => t.id !== id);
    localStorage.setItem(TRIPS_KEY, JSON.stringify(trips));
    
    // Cleanup entries
    const allEntries = getEntriesRaw();
    const filteredEntries = allEntries.filter(e => e.tripId !== id);
    localStorage.setItem(ENTRIES_KEY, JSON.stringify(filteredEntries));
}

const getEntriesRaw = (): JournalEntry[] => {
    const data = localStorage.getItem(ENTRIES_KEY);
    return data ? JSON.parse(data) : [];
}

export const getEntriesForTrip = (tripId: string): JournalEntry[] => {
  const entries = getEntriesRaw();
  return entries.filter(e => e.tripId === tripId).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
};

export const saveEntry = (entry: JournalEntry): void => {
  const entries = getEntriesRaw();
  const existingIndex = entries.findIndex(e => e.id === entry.id);
  if (existingIndex >= 0) {
    entries[existingIndex] = entry;
  } else {
    entries.push(entry);
  }
  localStorage.setItem(ENTRIES_KEY, JSON.stringify(entries));
};

export const deleteEntry = (id: string): void => {
    const entries = getEntriesRaw().filter(e => e.id !== id);
    localStorage.setItem(ENTRIES_KEY, JSON.stringify(entries));
}