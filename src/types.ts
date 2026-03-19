export interface Participant {
  id: string;
  name: string;
}

export interface Expense {
  id: string;
  title: string;
  amount: number;
  paidBy: string; // Participant ID
  splitBetween: string[]; // Array of Participant IDs
  date: string;
}

export interface ItineraryItem {
  time?: string;
  activity: string;
  description: string;
  imageSearchTerm: string;
  address?: string;
  hours?: string;
  cost?: string;
}

export interface WeatherDay {
  date: string;
  tempMax: number;
  tempMin: number;
  condition: string;
  icon: string;
}

export interface Itinerary {
  city: string;
  cityPresentation?: {
    history: string;
    culture: string;
    typicalDishes: string;
    generalInfo: string;
  };
  budgetEstimate: {
    low: number;
    high: number;
    currency: string;
    description: string;
    flight?: number;
    accommodation?: number;
    carRental?: number;
  };
  days: {
    day: number;
    items: ItineraryItem[];
  }[];
  weather?: WeatherDay[];
}

export interface Trip {
  id: string;
  name: string;
  startDate: string;
  endDate: string;
  participants: Participant[];
  expenses: Expense[];
  itinerary?: Itinerary;
  currencyCode?: CurrencyCode;
}

export interface Transaction {
  from: string;
  to: string;
  amount: number;
}

export interface ParticipantBalance {
  participantId: string;
  name: string;
  netBalance: number;
}

export type CurrencyCode = 'EUR' | 'USD' | 'GBP' | 'JPY' | 'CHF';
export type LanguageCode = 'it' | 'en' | 'es' | 'fr' | 'de';

export interface Language {
  code: LanguageCode;
  name: string;
  flag: string;
}

export const LANGUAGES: Record<LanguageCode, Language> = {
  it: { code: 'it', name: 'Italiano', flag: '🇮🇹' },
  en: { code: 'en', name: 'English', flag: '🇺🇸' },
  es: { code: 'es', name: 'Español', flag: '🇪🇸' },
  fr: { code: 'fr', name: 'Français', flag: '🇫🇷' },
  de: { code: 'de', name: 'Deutsch', flag: '🇩🇪' },
};

export interface Currency {
  code: CurrencyCode;
  symbol: string;
  rate: number; // Rate relative to EUR
}

export const CURRENCIES: Record<CurrencyCode, Currency> = {
  EUR: { code: 'EUR', symbol: '€', rate: 1 },
  USD: { code: 'USD', symbol: '$', rate: 1.08 },
  GBP: { code: 'GBP', symbol: '£', rate: 0.85 },
  JPY: { code: 'JPY', symbol: '¥', rate: 163.5 },
  CHF: { code: 'CHF', symbol: 'CHF', rate: 0.96 },
};
