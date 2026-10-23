import { apiClient } from './apiClient';

export const suggestTripTitle = async (description: string): Promise<string> => {
    try {
        const prompt = `Du er ein kreativ marknadsførar for reiseliv. Foreslå ein kort, fengjande og unik tittel for ein bobiltur basert på denne beskrivinga: "${description}". Svar berre med sjølve tittelen, utan sitatteikn eller forklaringar.`;
        const response = await apiClient.post<{ text: string }>('/ai/generate', { prompt });
        return response.text.trim();
    } catch (error) {
        console.error('Feil ved forslag til turtittel:', error);
        return 'Min nye tur';
    }
};

export const improveJournalEntry = async (content: string): Promise<string> => {
    try {
        const prompt = `Du er ein erfaren forfattar av reisejournalar. Forbetre språket og flyten i dette journalnotatet, men behald originalt innhald, fakta og tone: "${content}". Svar berre med den forbetra teksten, utan kommentarar eller innleiingar.`;
        const response = await apiClient.post<{ text: string }>('/ai/generate', { prompt });
        return response.text.trim();
    } catch (error) {
        console.error('Feil ved språkforbetring av journalnotat:', error);
        return content;
    }
};

export const parseCoordinatesFromAI = async (locationName: string): Promise<{lat: number, lng: number} | null> => {
    try {
        const prompt = `Du er ein ekspert på geografi. Gitt staden "${locationName}", finn den mest nøyaktige breiddegrad (latitude) og lengdegrad (longitude). Svar UTELUKANDE med eit JSON-objekt i dette formatet: {"lat": tall, "lng": tall}. Ikkje inkluder noko anna tekst, markdown-format, eller forklaringar.`;
        const response = await apiClient.post<{ text: string }>('/ai/generate', { prompt });
        const cleanJson = response.text.replace(/```json/g, '').replace(/```/g, '').trim();
        const coords = JSON.parse(cleanJson);
        if (typeof coords.lat === 'number' && typeof coords.lng === 'number') {
            return { lat: coords.lat, lng: coords.lng };
        }
        return null;
    } catch (error) {
        console.error('Feil ved parsing av koordinatar frå AI:', error);
        return null;
    }
};
