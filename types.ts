export interface LocationData {
  lat: number;
  lng: number;
  name: string;
  address?: string;
}

export interface JournalEntry {
  id: string;
  tripId: string;
  date: string; // ISO string
  content: string;
  location?: LocationData;
  images: string[]; // Base64 strings for simplicity in this demo
  author: string;
}

export interface Trip {
  id: string;
  title: string;
  startDate: string; // ISO string
  endDate?: string; // ISO string
  description: string;
  coverImage?: string;
}

export enum ViewState {
  DASHBOARD = 'DASHBOARD',
  TRIP_DETAIL = 'TRIP_DETAIL',
  CREATE_TRIP = 'CREATE_TRIP',
}