
export interface LocationData {
  lat: number;
  lng: number;
  name: string;
  address?: string;
}

export type UserRole = 'OWNER' | 'MEMBER' | 'GUEST';

export interface User {
  id: string;
  name: string;
  role: UserRole;
  avatar?: string; // Url to avatar or placeholder color
}

export interface JournalEntry {
  id: string;
  tripId: string;
  date: string; // ISO string
  content: string;
  location?: LocationData;
  images: string[]; // Base64 strings for simplicity in this demo
  author: string;
  authorId?: string; // If linked to a registered user
}

export interface Trip {
  id: string;
  ownerId: string; // Link to the creator
  title: string;
  location?: string; // General location/destination for the trip
  startDate: string; // ISO string
  endDate?: string; // ISO string
  description: string;
  coverImage?: string;
  shareCode?: string; // Unique code for QR generation
}

export enum ViewState {
  DASHBOARD = 'DASHBOARD',
  TRIP_DETAIL = 'TRIP_DETAIL',
  CREATE_TRIP = 'CREATE_TRIP',
}
