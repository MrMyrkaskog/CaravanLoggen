import { GoogleGenAI, Type } from "@google/genai";

// Initialize the client with the API key from the environment
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

export const improveJournalEntry = async (text: string): Promise<string> => {
  try {
    const modelId = 'gemini-2.5-flash';
    const prompt = `Du er en hjelpsom assistent for en "hyttebok" (campingjournal). 
    Brukeren har skrevet et notat. Din jobb er å omskrive dette til en hyggelig, stemningsfull tekst som passer i en reisedagbok. 
    Behold alle fakta, men gjør språket mer levende. Skriv på norsk.
    
    Her er notatet: "${text}"`;

    const response = await ai.models.generateContent({
      model: modelId,
      contents: prompt,
      config: {
        systemInstruction: "Du er en ekspert på norsk reiselitteratur.",
      }
    });

    return response.text || text;
  } catch (error) {
    console.error("Feil ved bruk av Gemini:", error);
    return text; // Fallback to original text
  }
};

export const suggestTripTitle = async (description: string): Promise<string> => {
    try {
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: `Lag en kort, fengende tittel (maks 5 ord) for en campingtur basert på denne beskrivelsen: "${description}". Svar kun med tittelen.`,
        });
        return response.text?.replace(/['"]+/g, '').trim() || "Ny tur";
    } catch (e) {
        return "Ny tur";
    }
}

export interface GroundingResult {
    locationName: string;
    uri?: string;
    coordinates?: { lat: number, lng: number };
}

// Uses Google Maps Grounding to find a place based on text
export const findLocationFromText = async (query: string, userLat?: number, userLng?: number): Promise<GroundingResult | null> => {
    try {
        const modelId = 'gemini-2.5-flash';
        
        // We ask Gemini to find the place using the Maps tool.
        // Note: The actual coordinates come from the tool invocation in a real tool-use scenario, 
        // but for Grounding, we extract the grounding chunks.
        // However, to get specific lat/lng strictly for plotting, we might need to ask the model to extract it from the grounding context or return it if available.
        // Since the standard groundingChunks gives URIs, we will try to ask Gemini to infer coordinates or use the grounding metadata.
        
        const retrievalConfig = (userLat && userLng) ? {
            retrievalConfig: {
                latLng: {
                    latitude: userLat,
                    longitude: userLng
                }
            }
        } : undefined;

        const response = await ai.models.generateContent({
            model: modelId,
            contents: `Finn stedet "${query}". Gi meg en kort beskrivelse.`,
            config: {
                tools: [{ googleMaps: {} }],
                toolConfig: retrievalConfig
            }
        });

        // Extract grounding information
        const chunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks;
        
        if (chunks && chunks.length > 0) {
            // Look for a map chunk
            const mapChunk = chunks.find(c => c.maps);
            if (mapChunk?.maps) {
                 // Grounding returns a Place ID or URI usually. 
                 // For this demo, getting exact Lat/Lng from Grounding ONLY is tricky without the Places API directly.
                 // However, let's see if we can get the model to output the JSON of the estimated location *after* it has grounded.
                 // A common pattern is to ask for JSON output *with* the tool enabled, but Grounding usually appends metadata.
                 
                 // Strategy B: Since we cannot easily parse lat/lng from the groundingChunk URI directly without an extra API call,
                 // We will trust the model to output the coordinates if it knows them from the grounding context.
                 
                 return {
                     locationName: mapChunk.maps.title || query,
                     uri: mapChunk.maps.uri
                 };
            }
        }

        return null;

    } catch (error) {
        console.error("Map grounding error:", error);
        return null;
    }
}

export const parseCoordinatesFromAI = async (text: string): Promise<{lat: number, lng: number} | null> => {
    // Helper: If user types "Vi er i Oslo", we just want coords.
    // This is a fallback if we don't use the Maps tool directly for the UI marker, or to augment it.
    try {
         const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: `Hva er breddegrad og lengdegrad for sentrum av: "${text}"? Svar KUN med JSON format: {"lat": number, "lng": number}`,
            config: {
                responseMimeType: "application/json",
                responseSchema: {
                    type: Type.OBJECT,
                    properties: {
                        lat: { type: Type.NUMBER },
                        lng: { type: Type.NUMBER }
                    }
                }
            }
        });
        
        if (!response.text) return null;
        return JSON.parse(response.text);
    } catch (e) {
        return null;
    }
}