import { GoogleGenAI, Type } from "@google/genai";
import { Itinerary } from "../types";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || "" });

export async function generateItinerary(city: string, language: string = 'it', startDate?: string, days: number = 3, people: number = 1): Promise<Itinerary> {
  const datePrompt = startDate ? ` per la data di partenza ${startDate}` : "";
  const response = await ai.models.generateContent({
    model: "gemini-3-flash-preview",
    contents: `Genera un itinerario di ${days} giorni per la città di ${city}${datePrompt} per un gruppo di ${people} persone. 
               Includi i luoghi da non perdere e una breve descrizione per ciascuno.
               Per ogni attività, fornisci:
               - Indirizzo fisico del luogo (address)
               - Orari di apertura e chiusura (hours)
               - Costo stimato se presente, altrimenti indica "Gratuito" (cost)
               Fornisci anche un termine di ricerca specifico e accurato (il nome ufficiale del luogo seguito dalla città, es: "Colosseo, Roma") per trovare un'immagine reale e attendibile di ciascuna attività su Wikipedia.
               Inoltre, fornisci una stima del budget totale per ${people} persone per questi ${days} giorni, indicando un range basso e alto.
               Includi anche stime specifiche per il gruppo:
               - Volo (flight) - costo totale per ${people} persone
               - Alloggio/Casa (accommodation) - costo totale per ${people} persone
               - Eventuale noleggio auto (carRental) - costo totale
               
               IMPORTANTE: Includi anche una breve presentazione della città che racconti:
               - Storia (history)
               - Cultura (culture)
               - Piatti tipici (typicalDishes)
               - Informazioni generali (generalInfo)
               
               Inoltre, fornisci le previsioni meteo (weather) per i ${days} giorni del viaggio a partire dal ${startDate || 'oggi'}.
               Per ogni giorno, indica la temperatura massima, minima, la condizione (es. Soleggiato, Pioggia) e un'icona emoji appropriata.
               
               Tieni conto della stagionalità se la data è fornita.
               Rispondi in lingua: ${language}.`,
    config: {
      tools: [{ googleSearch: {} }],
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          city: { type: Type.STRING },
          cityPresentation: {
            type: Type.OBJECT,
            properties: {
              history: { type: Type.STRING },
              culture: { type: Type.STRING },
              typicalDishes: { type: Type.STRING },
              generalInfo: { type: Type.STRING }
            },
            required: ["history", "culture", "typicalDishes", "generalInfo"]
          },
          budgetEstimate: {
            type: Type.OBJECT,
            properties: {
              low: { type: Type.NUMBER },
              high: { type: Type.NUMBER },
              currency: { type: Type.STRING },
              description: { type: Type.STRING },
              flight: { type: Type.NUMBER, description: "Stima costo volo" },
              accommodation: { type: Type.NUMBER, description: "Stima costo alloggio" },
              carRental: { type: Type.NUMBER, description: "Stima costo noleggio auto (opzionale)" }
            },
            required: ["low", "high", "currency", "description"]
          },
          weather: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                date: { type: Type.STRING },
                tempMax: { type: Type.NUMBER },
                tempMin: { type: Type.NUMBER },
                condition: { type: Type.STRING },
                icon: { type: Type.STRING }
              },
              required: ["date", "tempMax", "tempMin", "condition", "icon"]
            }
          },
          days: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                day: { type: Type.INTEGER },
                items: {
                  type: Type.ARRAY,
                  items: {
                    type: Type.OBJECT,
                    properties: {
                      time: { type: Type.STRING },
                      activity: { type: Type.STRING },
                      description: { type: Type.STRING },
                      imageSearchTerm: { type: Type.STRING },
                      address: { type: Type.STRING },
                      hours: { type: Type.STRING },
                      cost: { type: Type.STRING }
                    },
                    required: ["activity", "description", "imageSearchTerm", "address", "hours", "cost"]
                  }
                }
              },
              required: ["day", "items"]
            }
          }
        },
        required: ["city", "days", "budgetEstimate", "weather"]
      }
    }
  });

  if (!response.text) {
    throw new Error("No response from AI");
  }

  return JSON.parse(response.text);
}
