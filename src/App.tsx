import React, { useState, useEffect } from 'react';
import { Plus, Trash2, ArrowLeft, ChevronRight, Wallet, Users, Calendar, Receipt, Info, Search, MapPin, Sparkles, Loader2, Image as ImageIcon, ExternalLink, Edit2, Check, X, Clock, Coins, History, Globe, Utensils, CloudSun } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Trip, Participant, Expense, Transaction, ParticipantBalance, Itinerary, CurrencyCode, CURRENCIES, LanguageCode, LANGUAGES } from './types';
import { calculateBalances } from './utils';
import { generateItinerary } from './services/geminiService';
import { TRANSLATIONS } from './translations';

const STORAGE_KEY = 'tripsplit_data';

function PlaceImage({ searchTerm, alt }: { searchTerm: string, alt: string }) {
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!searchTerm) {
      setLoading(false);
      return;
    }

    const fetchWikiPhoto = async () => {
      try {
        // Try Italian first, then English if it fails
        const languages = ['it', 'en'];
        
        for (const lang of languages) {
          // Step 1: Search for the page title on Wikipedia
          const searchUrl = `https://${lang}.wikipedia.org/w/api.php?action=query&format=json&origin=*&list=search&srsearch=${encodeURIComponent(searchTerm)}&srlimit=1`;
          const searchRes = await fetch(searchUrl);
          const searchData = await searchRes.json();
          
          const pageTitle = searchData.query?.search?.[0]?.title;
          
          if (pageTitle) {
            // Step 2: Get the main image (pageimage) for that page
            const imageUrl = `https://${lang}.wikipedia.org/w/api.php?action=query&format=json&origin=*&prop=pageimages&titles=${encodeURIComponent(pageTitle)}&pithumbsize=800&piprop=thumbnail|original`;
            const imageRes = await fetch(imageUrl);
            const imageData = await imageRes.json();
            
            const pages = imageData.query?.pages;
            const pageId = Object.keys(pages)[0];
            const thumbnail = pages[pageId]?.thumbnail?.source || pages[pageId]?.original?.source;
            
            if (thumbnail) {
              setPhotoUrl(thumbnail);
              return; // Found an image, stop searching
            }
          }
        }
        
        // Final fallback: just use picsum if nothing found
        setPhotoUrl(`https://picsum.photos/seed/${encodeURIComponent(searchTerm)}/800/600`);
      } catch (error) {
        console.error('Error fetching Wikipedia photo:', error);
        setPhotoUrl(`https://picsum.photos/seed/${encodeURIComponent(searchTerm)}/800/600`);
      } finally {
        setLoading(false);
      }
    };

    fetchWikiPhoto();
  }, [searchTerm]);

  if (loading) {
    return (
      <div className="w-full h-full bg-gray-100 flex items-center justify-center animate-pulse">
        <Loader2 className="text-gray-300 animate-spin" size={24} />
      </div>
    );
  }

  if (!photoUrl) {
    return (
      <div className="w-full h-full bg-gray-100 flex flex-col items-center justify-center text-gray-400 p-4 text-center">
        <ImageIcon size={32} className="mb-2 opacity-20" />
        <span className="text-[10px] uppercase tracking-widest font-bold opacity-50">Nessuna immagine trovata</span>
      </div>
    );
  }

  return (
    <img 
      src={photoUrl}
      alt={alt}
      referrerPolicy="no-referrer"
      className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
    />
  );
}

export default function App() {
  const [trips, setTrips] = useState<Trip[]>([]);
  const [currentTripId, setCurrentTripId] = useState<string | null>(null);
  const [view, setView] = useState<'home' | 'create' | 'dashboard' | 'explore'>('home');
  const [isAddExpenseOpen, setIsAddExpenseOpen] = useState(false);
  const [editingExpense, setEditingExpense] = useState<Expense | null>(null);
  const [language, setLanguage] = useState<LanguageCode>('it');

  // Load data from localStorage
  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      try {
        setTrips(JSON.parse(saved));
      } catch (e) {
        console.error('Failed to parse saved data', e);
      }
    }

    const savedLang = localStorage.getItem('tripsplit_lang');
    if (savedLang && Object.keys(LANGUAGES).includes(savedLang)) {
      setLanguage(savedLang as LanguageCode);
    }
  }, []);

  // Save data to localStorage
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(trips));
  }, [trips]);

  useEffect(() => {
    localStorage.setItem('tripsplit_lang', language);
  }, [language]);

  const t = (key: string) => {
    return TRANSLATIONS[language][key] || key;
  };

  const handleClearAll = () => {
    setTrips([]);
    setCurrentTripId(null);
    localStorage.removeItem(STORAGE_KEY);
  };

  const currentTrip = trips.find(t => t.id === currentTripId);

  const handleCreateTrip = (newTrip: Trip) => {
    setTrips([...trips, newTrip]);
    setCurrentTripId(newTrip.id);
    setView('dashboard');
  };

  const handleDeleteTrip = (id: string) => {
    setTrips(trips.filter(t => t.id !== id));
    if (currentTripId === id) {
      setCurrentTripId(null);
      setView('home');
    }
  };

  const handleAddExpense = (expense: Expense) => {
    if (!currentTripId) return;
    setTrips(trips.map(t => {
      if (t.id === currentTripId) {
        return { ...t, expenses: [expense, ...t.expenses] };
      }
      return t;
    }));
    setIsAddExpenseOpen(false);
  };

  const handleUpdateExpense = (expense: Expense) => {
    if (!currentTripId) return;
    setTrips(trips.map(t => {
      if (t.id === currentTripId) {
        return { 
          ...t, 
          expenses: t.expenses.map(e => e.id === expense.id ? expense : e) 
        };
      }
      return t;
    }));
    setEditingExpense(null);
    setIsAddExpenseOpen(false);
  };

  const handleUpdateTripCurrency = (currencyCode: CurrencyCode) => {
    if (!currentTripId) return;
    setTrips(trips.map(t => {
      if (t.id === currentTripId) {
        return { ...t, currencyCode };
      }
      return t;
    }));
  };

  const handleDeleteExpense = (expenseId: string) => {
    if (!currentTripId) return;
    setTrips(trips.map(t => {
      if (t.id === currentTripId) {
        return { ...t, expenses: t.expenses.filter(e => e.id !== expenseId) };
      }
      return t;
    }));
  };

  return (
    <div className="min-h-screen bg-gray-50 pb-12">
      <AnimatePresence mode="wait">
        {view === 'home' && (
          <HomeView 
            trips={trips} 
            onSelectTrip={(id) => { setCurrentTripId(id); setView('dashboard'); }} 
            onCreateClick={() => setView('create')}
            onDeleteTrip={handleDeleteTrip}
            onExploreClick={() => setView('explore')}
            onClearAll={handleClearAll}
            language={language}
            onLanguageChange={setLanguage}
            t={t}
          />
        )}
        {view === 'create' && (
          <CreateTripView 
            onBack={() => setView('home')} 
            onCreate={handleCreateTrip} 
            language={language}
            t={t}
          />
        )}
        {view === 'dashboard' && currentTrip && (
          <DashboardView 
            trip={currentTrip} 
            onBack={() => setView('home')} 
            onAddExpense={handleAddExpense}
            onUpdateExpense={handleUpdateExpense}
            onDeleteExpense={handleDeleteExpense}
            onUpdateCurrency={handleUpdateTripCurrency}
            isAddExpenseOpen={isAddExpenseOpen}
            setIsAddExpenseOpen={setIsAddExpenseOpen}
            editingExpense={editingExpense}
            setEditingExpense={setEditingExpense}
            language={language}
            t={t}
          />
        )}
        {view === 'explore' && (
          <ExploreView 
            onBack={() => setView('home')} 
            onCreateTrip={handleCreateTrip}
            language={language}
            t={t}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

// --- VIEWS ---

function HomeView({ trips, onSelectTrip, onCreateClick, onDeleteTrip, onExploreClick, onClearAll, language, onLanguageChange, t }: { 
  trips: Trip[], 
  onSelectTrip: (id: string) => void, 
  onCreateClick: () => void,
  onDeleteTrip: (id: string) => void,
  onExploreClick: () => void,
  onClearAll: () => void,
  language: LanguageCode,
  onLanguageChange: (lang: LanguageCode) => void,
  t: (key: string) => string
}) {
  const [isClearConfirmOpen, setIsClearConfirmOpen] = useState(false);

  return (
    <div className="relative min-h-screen overflow-hidden">
      {/* Background Image with Overlay */}
      <div 
        className="absolute inset-0 z-0"
        style={{
          backgroundImage: 'url("https://images.unsplash.com/photo-1469854523086-cc02fe5d8800?q=80&w=2021&auto=format&fit=crop")',
          backgroundSize: 'cover',
          backgroundPosition: 'center',
        }}
      >
        <div className="absolute inset-0 bg-black/50 backdrop-blur-[2px]" />
      </div>

      {/* Language Selector */}
      <div className="absolute top-6 right-6 z-20 flex items-center gap-2 bg-black/30 backdrop-blur-md p-1.5 rounded-full border border-white/20">
        {Object.values(LANGUAGES).map((lang) => (
          <button
            key={lang.code}
            onClick={() => onLanguageChange(lang.code)}
            className={`w-10 h-10 rounded-full flex items-center justify-center text-xl transition-all hover:scale-110 active:scale-95 ${
              language === lang.code 
                ? 'bg-white/20 shadow-lg border border-white/40' 
                : 'opacity-50 hover:opacity-100'
            }`}
            title={lang.name}
            aria-label={`Select ${lang.name}`}
          >
            {lang.flag}
          </button>
        ))}
      </div>

      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -20 }}
        className="relative z-10 max-w-2xl mx-auto px-4 pt-20 pb-12"
      >
        <div className="text-center mb-16">
          <h1 className="text-6xl font-black text-white mb-3 tracking-tight drop-shadow-2xl">TripSplit</h1>
          <p className="text-orange-200 text-xl italic font-medium drop-shadow-lg">{t('app.tagline')}</p>
        </div>

        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row justify-between items-center gap-4 mb-6">
            <h2 className="text-2xl font-bold text-white drop-shadow-md">{t('home.your_trips')}</h2>
            <div className="flex flex-wrap justify-center gap-3">
              {trips.length > 0 && (
                <button 
                  onClick={() => setIsClearConfirmOpen(true)}
                  className="bg-red-500/20 backdrop-blur-md hover:bg-red-500/40 text-red-100 px-4 py-2.5 rounded-full font-bold transition-all flex items-center gap-2 border border-red-500/30"
                  title={t('home.clear_all')}
                >
                  <Trash2 size={18} />
                  {t('home.clear_all')}
                </button>
              )}
              <button 
                onClick={onExploreClick}
                className="bg-white/20 backdrop-blur-md hover:bg-white/30 text-white px-6 py-2.5 rounded-full font-bold transition-all flex items-center gap-2 border border-white/30"
              >
                <Sparkles size={20} />
                {t('home.ai_guide')}
              </button>
              <button 
                onClick={onCreateClick}
                className="bg-primary hover:bg-orange-600 text-white px-6 py-2.5 rounded-full font-bold transition-all flex items-center gap-2 shadow-xl hover:scale-105 active:scale-95"
              >
                <Plus size={20} />
                {t('home.create_trip')}
              </button>
            </div>
          </div>

          {trips.length === 0 ? (
            <div className="bg-white/95 backdrop-blur-md rounded-3xl p-12 text-center border border-white/20 shadow-2xl">
              <div className="bg-orange-50 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6">
                <Calendar className="text-primary" size={40} />
              </div>
              <h3 className="text-2xl font-bold text-gray-900 mb-3">{t('home.no_trips')}</h3>
              <p className="text-gray-600 mb-8 text-lg">{t('home.no_trips_desc')}</p>
              <button 
                onClick={onCreateClick}
                className="text-primary font-bold text-lg hover:underline"
              >
                {t('home.get_started')}
              </button>
            </div>
          ) : (
            <div className="grid gap-4">
              {trips.map(trip => (
                <div 
                  key={trip.id}
                  className="bg-white/95 backdrop-blur-md rounded-2xl p-6 border border-white/20 shadow-lg hover:shadow-xl transition-all group flex justify-between items-center hover:-translate-y-1"
                >
                  <button 
                    onClick={() => onSelectTrip(trip.id)}
                    className="flex-1 text-left"
                  >
                    <h3 className="text-xl font-bold text-gray-900 group-hover:text-primary transition-colors">{trip.name}</h3>
                    <div className="flex items-center gap-5 mt-2 text-sm text-gray-500 font-medium">
                      <span className="flex items-center gap-1.5">
                        <Calendar size={16} className="text-primary" />
                        {new Date(trip.startDate).toLocaleDateString(language)}
                      </span>
                      <span className="flex items-center gap-1.5">
                        <Users size={16} className="text-secondary" />
                        {trip.participants.length} {t('home.people')}
                      </span>
                    </div>
                  </button>
                  <div className="flex items-center gap-3">
                    <button 
                      onClick={() => onDeleteTrip(trip.id)}
                      className="p-2.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-full transition-all"
                    >
                      <Trash2 size={20} />
                    </button>
                    <ChevronRight className="text-gray-300 group-hover:text-primary transition-colors" />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Clear All Confirmation Modal */}
        <AnimatePresence>
          {isClearConfirmOpen && (
            <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => setIsClearConfirmOpen(false)}
                className="absolute inset-0 bg-black/60 backdrop-blur-sm"
              />
              <motion.div 
                initial={{ opacity: 0, scale: 0.9, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.9, y: 20 }}
                className="relative bg-white rounded-3xl p-8 max-w-sm w-full shadow-2xl"
              >
                <div className="bg-red-50 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-6">
                  <Trash2 className="text-red-500" size={32} />
                </div>
                <h3 className="text-2xl font-bold text-gray-900 text-center mb-2">{t('home.clear_confirm_title')}</h3>
                <p className="text-gray-500 text-center mb-8">{t('home.clear_confirm_desc')}</p>
                <div className="flex gap-3">
                  <button 
                    onClick={() => setIsClearConfirmOpen(false)}
                    className="flex-1 px-6 py-3 rounded-2xl font-bold text-gray-500 hover:bg-gray-50 transition-colors"
                  >
                    {t('common.cancel')}
                  </button>
                  <button 
                    onClick={() => {
                      onClearAll();
                      setIsClearConfirmOpen(false);
                    }}
                    className="flex-1 px-6 py-3 rounded-2xl font-bold bg-red-500 text-white hover:bg-red-600 transition-colors shadow-lg shadow-red-100"
                  >
                    {t('home.clear_all')}
                  </button>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>
      </motion.div>
    </div>
  );
}

function CreateTripView({ onBack, onCreate, language, t }: { onBack: () => void, onCreate: (trip: Trip) => void, language: LanguageCode, t: (key: string) => string }) {
  const [name, setName] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [participantName, setParticipantName] = useState('');
  const [participants, setParticipants] = useState<Participant[]>([]);

  const addParticipant = () => {
    if (!participantName.trim()) return;
    setParticipants([...participants, { id: Math.random().toString(36).substr(2, 9), name: participantName.trim() }]);
    setParticipantName('');
  };

  const removeParticipant = (id: string) => {
    setParticipants(participants.filter(p => p.id !== id));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !startDate || !endDate || participants.length < 2) {
      alert(t('create.error_fields'));
      return;
    }

    const newTrip: Trip = {
      id: Math.random().toString(36).substr(2, 9),
      name,
      startDate,
      endDate,
      participants,
      expenses: []
    };
    onCreate(newTrip);
  };

  return (
    <motion.div 
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      className="max-w-2xl mx-auto px-4 pt-8"
    >
      <button onClick={onBack} className="flex items-center gap-2 text-gray-500 hover:text-gray-800 mb-6 transition-colors">
        <ArrowLeft size={20} />
        {t('create.back')}
      </button>

      <div className="bg-white rounded-3xl p-8 shadow-sm border border-gray-100">
        <h2 className="text-2xl font-bold text-gray-900 mb-8">{t('create.title')}</h2>
        
        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2 uppercase tracking-wider">{t('create.trip_name')}</label>
            <input 
              type="text" 
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={t('create.trip_name_placeholder')}
              className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2 uppercase tracking-wider">{t('create.start_date')}</label>
              <input 
                type="date" 
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2 uppercase tracking-wider">{t('create.end_date')}</label>
              <input 
                type="date" 
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
                required
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2 uppercase tracking-wider">{t('create.participants')}</label>
            <div className="flex gap-2 mb-4">
              <input 
                type="text" 
                value={participantName}
                onChange={(e) => setParticipantName(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addParticipant())}
                placeholder={t('create.add_name_placeholder')}
                className="flex-1 px-4 py-3 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
              />
              <button 
                type="button"
                onClick={addParticipant}
                className="bg-secondary text-white px-4 py-3 rounded-xl font-medium hover:bg-teal-600 transition-colors"
              >
                {t('common.add')}
              </button>
            </div>

            <div className="flex flex-wrap gap-2">
              {participants.map(p => (
                <span key={p.id} className="bg-teal-50 text-secondary px-3 py-1.5 rounded-full text-sm font-medium flex items-center gap-2 border border-teal-100">
                  {p.name}
                  <button type="button" onClick={() => removeParticipant(p.id)} className="hover:text-red-500">
                    <Trash2 size={14} />
                  </button>
                </span>
              ))}
              {participants.length === 0 && <p className="text-gray-400 text-sm italic">{t('create.min_participants')}</p>}
            </div>
          </div>

          <button 
            type="submit"
            className="w-full bg-primary text-white py-4 rounded-xl font-bold text-lg shadow-lg shadow-orange-200 hover:bg-orange-600 transition-all transform hover:-translate-y-0.5 active:translate-y-0"
          >
            {t('create.start_trip')}
          </button>
        </form>
      </div>
    </motion.div>
  );
}

function DashboardView({ 
  trip, 
  onBack, 
  onAddExpense, 
  onUpdateExpense, 
  onDeleteExpense, 
  onUpdateCurrency, 
  isAddExpenseOpen, 
  setIsAddExpenseOpen, 
  editingExpense, 
  setEditingExpense,
  language,
  t
}: { 
  trip: Trip, 
  onBack: () => void, 
  onAddExpense: (e: Expense) => void,
  onUpdateExpense: (e: Expense) => void,
  onDeleteExpense: (id: string) => void,
  onUpdateCurrency: (code: CurrencyCode) => void,
  isAddExpenseOpen: boolean,
  setIsAddExpenseOpen: (open: boolean) => void,
  editingExpense: Expense | null,
  setEditingExpense: (e: Expense | null) => void,
  language: LanguageCode,
  t: (key: string) => string
}) {
  const [expenseToDelete, setExpenseToDelete] = useState<Expense | null>(null);
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);
  const [expenseToEdit, setExpenseToEdit] = useState<Expense | null>(null);
  const [isEditConfirmOpen, setIsEditConfirmOpen] = useState(false);

  const { balances, transactions } = calculateBalances(trip);
  const totalCost = trip.expenses.reduce((sum, e) => sum + e.amount, 0);
  const maxAbsBalance = Math.max(...balances.map(b => Math.abs(b.netBalance)), 1);

  const currentCurrency = CURRENCIES[trip.currencyCode || 'EUR'];

  const formatAmount = (amount: number) => {
    const converted = amount * currentCurrency.rate;
    return `${currentCurrency.symbol}${converted.toLocaleString(language, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="relative min-h-screen"
    >
      {/* Themed Background */}
      <div className="fixed inset-0 z-0">
        <div 
          className="absolute inset-0 bg-cover bg-center"
          style={{
            backgroundImage: `url("https://images.unsplash.com/photo-1476514525535-07fb3b4ae5f1?q=80&w=2070&auto=format&fit=crop")`,
          }}
        >
          <div className="absolute inset-0 bg-gray-50/90 backdrop-blur-sm" />
        </div>
      </div>

      <div className="relative z-10 max-w-5xl mx-auto px-4 pt-8 pb-20">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-10">
          <div className="space-y-4">
            <button onClick={onBack} className="flex items-center gap-2 text-gray-500 hover:text-primary font-bold transition-colors group">
              <div className="bg-white p-1.5 rounded-full shadow-sm group-hover:bg-primary group-hover:text-white transition-all">
                <ArrowLeft size={16} />
              </div>
              {t('dashboard.back')}
            </button>
            <div>
              <h1 className="text-4xl md:text-5xl font-black text-gray-900 tracking-tight">{trip.name}</h1>
              <div className="flex flex-wrap items-center gap-4 mt-3">
                <span className="text-gray-500 text-sm flex items-center gap-2 bg-white/50 px-3 py-1.5 rounded-full border border-white/50 backdrop-blur-sm">
                  <Calendar size={14} className="text-primary" />
                  {new Date(trip.startDate).toLocaleDateString(language)} - {new Date(trip.endDate).toLocaleDateString(language)}
                </span>
                <span className="text-gray-500 text-sm flex items-center gap-2 bg-white/50 px-3 py-1.5 rounded-full border border-white/50 backdrop-blur-sm">
                  <Users size={14} className="text-secondary" />
                  {trip.participants.length} {t('home.people')}
                </span>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            {/* Currency Selector */}
            <div className="flex items-center gap-2 bg-white p-1.5 rounded-full shadow-sm border border-gray-100">
              {Object.values(CURRENCIES).map((curr) => (
                <button
                  key={curr.code}
                  onClick={() => onUpdateCurrency(curr.code)}
                  className={`px-3 py-1.5 rounded-full text-xs font-bold transition-all ${
                    currentCurrency.code === curr.code 
                      ? 'bg-primary text-white shadow-md' 
                      : 'text-gray-400 hover:text-gray-600 hover:bg-gray-50'
                  }`}
                >
                  {curr.code}
                </button>
              ))}
            </div>

            <button 
              onClick={() => setIsAddExpenseOpen(true)}
              className="bg-primary text-white px-8 py-3.5 rounded-full font-bold shadow-xl shadow-orange-200 hover:bg-orange-600 transition-all flex items-center justify-center gap-2 hover:scale-105 active:scale-95"
            >
              <Plus size={22} />
              {t('dashboard.add_expense')}
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          {/* Left Column: Stats & Balances */}
          <div className="lg:col-span-4 space-y-6">
            {/* Total Card */}
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-white rounded-[2rem] p-8 shadow-xl shadow-gray-200/50 border border-white relative overflow-hidden group"
            >
              <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 rounded-full -mr-16 -mt-16 transition-transform group-hover:scale-110" />
              <div className="relative z-10">
                <div className="flex items-center gap-3 mb-6">
                  <div className="bg-orange-50 p-3 rounded-2xl">
                    <Wallet className="text-primary" size={24} />
                  </div>
                  <h3 className="font-bold text-gray-400 uppercase text-[10px] tracking-[0.2em]">{t('dashboard.total_cost')}</h3>
                </div>
                <p className="text-5xl font-black text-gray-900 tracking-tighter">
                  {formatAmount(totalCost)}
                </p>
                <div className="mt-6 pt-6 border-t border-gray-50 flex items-center justify-between text-sm">
                  <span className="text-gray-400">{t('dashboard.average_per_person')}</span>
                  <span className="font-bold text-gray-900">{formatAmount(totalCost / trip.participants.length)}</span>
                </div>
              </div>
            </motion.div>

            {/* Balance Summary */}
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="bg-white rounded-[2rem] p-8 shadow-xl shadow-gray-200/50 border border-white"
            >
              <div className="flex items-center justify-between mb-8">
                <h3 className="font-bold text-gray-900 flex items-center gap-3">
                  <div className="bg-teal-50 p-2 rounded-xl">
                    <Users size={20} className="text-secondary" />
                  </div>
                  {t('dashboard.balances')}
                </h3>
              </div>
              <div className="space-y-8">
                {balances.map(b => (
                  <div key={b.participantId} className="space-y-3">
                    <div className="flex justify-between items-end">
                      <div>
                        <span className="text-gray-900 font-bold block">{b.name}</span>
                        <span className="text-[10px] text-gray-400 uppercase tracking-widest font-bold">
                          {b.netBalance >= 0 ? t('dashboard.should_receive') : t('dashboard.should_give')}
                        </span>
                      </div>
                      <span className={`text-lg font-black ${b.netBalance >= 0 ? 'text-teal-600' : 'text-red-500'}`}>
                        {b.netBalance >= 0 ? '+' : ''}{formatAmount(b.netBalance)}
                      </span>
                    </div>
                    <div className="relative w-full h-2 bg-gray-50 rounded-full overflow-hidden">
                      <div className="absolute left-1/2 top-0 bottom-0 w-px bg-gray-200 z-10" />
                      <motion.div 
                        initial={{ width: 0 }}
                        animate={{ 
                          width: `${(Math.abs(b.netBalance) / maxAbsBalance) * 50}%`,
                          left: b.netBalance >= 0 ? '50%' : `${50 - (Math.abs(b.netBalance) / maxAbsBalance) * 50}%`
                        }}
                        className={`absolute h-full rounded-full ${b.netBalance >= 0 ? 'bg-teal-500' : 'bg-red-500'}`}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </motion.div>

            {/* Settlements */}
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="bg-gray-900 rounded-[2rem] p-8 shadow-2xl text-white relative overflow-hidden"
            >
              <div className="absolute bottom-0 right-0 w-24 h-24 bg-white/5 rounded-full -mb-12 -mr-12" />
              <h3 className="font-bold mb-6 flex items-center gap-3 text-lg">
                <div className="bg-white/10 p-2 rounded-xl">
                  <Coins size={20} className="text-primary" />
                </div>
                {t('dashboard.how_to_settle')}
              </h3>
              <div className="space-y-4">
                {transactions.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-6 text-center">
                    <div className="bg-white/10 p-4 rounded-full mb-4">
                      <Check className="text-teal-400" size={32} />
                    </div>
                    <p className="text-gray-400 text-sm italic">{t('dashboard.all_settled')}</p>
                  </div>
                ) : (
                  transactions.map((t_item, i) => (
                    <div key={i} className="bg-white/5 border border-white/10 rounded-2xl p-4 flex items-center gap-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 text-xs text-gray-400 mb-1">
                          <span className="font-bold text-white">{t_item.from}</span>
                          <span>{t('dashboard.pays_to')}</span>
                        </div>
                        <div className="font-bold text-white">{t_item.to}</div>
                      </div>
                      <div className="text-xl font-black text-primary">{formatAmount(t_item.amount)}</div>
                    </div>
                  ))
                )}
              </div>
            </motion.div>
          </div>

          {/* Right Column: Expense List */}
          <div className="lg:col-span-8 space-y-6">
            <div className="flex items-center justify-between px-2">
              <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-3">
                <div className="bg-primary/10 p-2 rounded-xl">
                  <Receipt size={22} className="text-primary" />
                </div>
                {t('dashboard.recent_expenses')}
              </h2>
              <span className="text-sm font-bold text-gray-400 bg-white px-3 py-1 rounded-full shadow-sm border border-gray-100">
                {trip.expenses.length} {t('dashboard.operations')}
              </span>
            </div>
            
            {trip.expenses.length === 0 ? (
              <div className="bg-white/50 backdrop-blur-sm rounded-[2rem] p-20 text-center border-2 border-dashed border-gray-200">
                <div className="bg-gray-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Receipt className="text-gray-300" size={32} />
                </div>
                <h3 className="text-xl font-bold text-gray-400 mb-2">{t('dashboard.no_expenses')}</h3>
                <p className="text-gray-400 text-sm italic">{t('dashboard.no_expenses_desc')}</p>
              </div>
            ) : (
              <div className="grid gap-4">
                {trip.expenses.map((expense, idx) => (
                  <motion.div 
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: idx * 0.05 }}
                    key={expense.id} 
                    onClick={() => {
                      setExpenseToEdit(expense);
                      setIsEditConfirmOpen(true);
                    }}
                    className="bg-white rounded-3xl p-6 shadow-sm border border-transparent hover:border-primary/20 hover:shadow-xl hover:shadow-gray-200/50 transition-all cursor-pointer group flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                  >
                    <div className="flex items-center gap-5">
                      <div className="bg-gray-50 p-4 rounded-2xl group-hover:bg-primary/5 transition-colors">
                        <Utensils className="text-gray-400 group-hover:text-primary transition-colors" size={24} />
                      </div>
                      <div>
                        <div className="flex items-center gap-3">
                          <h4 className="font-bold text-gray-900 text-lg">{expense.title}</h4>
                          <span className="text-[10px] font-black uppercase tracking-widest text-gray-400 bg-gray-100 px-2 py-1 rounded-md">
                            {new Date(expense.date).toLocaleDateString(language, { day: 'numeric', month: 'short' })}
                          </span>
                        </div>
                        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-1">
                          <p className="text-sm text-gray-500">
                            {t('dashboard.paid_by')} <span className="font-bold text-gray-900">{trip.participants.find(p => p.id === expense.paidBy)?.name}</span>
                          </p>
                          <div className="flex items-center gap-1.5">
                            <Users size={12} className="text-gray-400" />
                            <p className="text-xs text-gray-400 font-medium">
                              {t('dashboard.split_between')} {expense.splitBetween.length} {t('home.people')}
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center justify-between sm:justify-end gap-6 pl-16 sm:pl-0">
                      <div className="text-right">
                        <p className="text-2xl font-black text-gray-900">{formatAmount(expense.amount)}</p>
                        <p className="text-[10px] text-gray-400 uppercase tracking-widest font-bold">{t('dashboard.amount')}</p>
                      </div>
                      <button 
                        onClick={(e) => {
                          e.stopPropagation();
                          setExpenseToDelete(expense);
                          setIsDeleteConfirmOpen(true);
                        }}
                        className="p-3 text-gray-200 hover:text-red-500 hover:bg-red-50 rounded-2xl transition-all"
                      >
                        <Trash2 size={20} />
                      </button>
                    </div>
                  </motion.div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Add Expense Modal */}
      <AnimatePresence>
        {isAddExpenseOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white rounded-3xl w-full max-w-md p-8 shadow-2xl"
            >
              <h2 className="text-2xl font-bold text-gray-900 mb-6">{editingExpense ? t('dashboard.edit_expense_title') : t('dashboard.add_expense_title')}</h2>
              <AddExpenseForm 
                participants={trip.participants} 
                expense={editingExpense}
                currencyCode={trip.currencyCode || 'EUR'}
                onCancel={() => {
                  setIsAddExpenseOpen(false);
                  setEditingExpense(null);
                }}
                onSubmit={editingExpense ? onUpdateExpense : onAddExpense}
                t={t}
              />
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Delete Confirmation Modal */}
      <AnimatePresence>
        {isDeleteConfirmOpen && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white rounded-3xl w-full max-w-sm p-8 shadow-2xl text-center"
            >
              <div className="bg-red-50 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-6">
                <Trash2 className="text-red-500" size={32} />
              </div>
              <h3 className="text-2xl font-bold text-gray-900 mb-2">{t('dashboard.delete_confirm_title')}</h3>
              <p className="text-gray-500 mb-8">{t('dashboard.delete_confirm_desc').replace('{title}', expenseToDelete?.title || '')}</p>
              <div className="flex gap-3">
                <button 
                  onClick={() => setIsDeleteConfirmOpen(false)}
                  className="flex-1 py-3 rounded-xl font-bold text-gray-500 hover:bg-gray-50 transition-colors"
                >
                  {t('common.cancel')}
                </button>
                <button 
                  onClick={() => {
                    if (expenseToDelete) onDeleteExpense(expenseToDelete.id);
                    setIsDeleteConfirmOpen(false);
                  }}
                  className="flex-1 bg-red-500 text-white py-3 rounded-xl font-bold shadow-lg shadow-red-100 hover:bg-red-600 transition-all"
                >
                  {t('common.delete')}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Edit Confirmation Modal */}
      <AnimatePresence>
        {isEditConfirmOpen && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white rounded-3xl w-full max-w-sm p-8 shadow-2xl text-center"
            >
              <div className="bg-primary/10 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-6">
                <Edit2 className="text-primary" size={32} />
              </div>
              <h3 className="text-2xl font-bold text-gray-900 mb-2">{t('dashboard.edit_confirm_title')}</h3>
              <p className="text-gray-500 mb-8">{t('dashboard.edit_confirm_desc').replace('{title}', expenseToEdit?.title || '')}</p>
              <div className="flex gap-3">
                <button 
                  onClick={() => setIsEditConfirmOpen(false)}
                  className="flex-1 py-3 rounded-xl font-bold text-gray-500 hover:bg-gray-50 transition-colors"
                >
                  {t('common.cancel')}
                </button>
                <button 
                  onClick={() => {
                    if (expenseToEdit) {
                      setEditingExpense(expenseToEdit);
                      setIsAddExpenseOpen(true);
                    }
                    setIsEditConfirmOpen(false);
                  }}
                  className="flex-1 bg-primary text-white py-3 rounded-xl font-bold shadow-lg shadow-orange-100 hover:bg-orange-600 transition-all"
                >
                  {t('common.edit')}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

function AddExpenseForm({ 
  participants, 
  expense,
  currencyCode,
  onCancel, 
  onSubmit,
  t
}: { 
  participants: Participant[], 
  expense?: Expense | null,
  currencyCode: CurrencyCode,
  onCancel: () => void,
  onSubmit: (e: Expense) => void,
  t: (key: string) => string
}) {
  const [title, setTitle] = useState(expense?.title || '');
  const [amount, setAmount] = useState(expense?.amount.toString() || '');
  const [paidBy, setPaidBy] = useState(expense?.paidBy || participants[0]?.id || '');
  const [splitBetween, setSplitBetween] = useState<string[]>(expense?.splitBetween || participants.map(p => p.id));

  const currentCurrency = CURRENCIES[currencyCode];

  const toggleSplit = (id: string) => {
    if (splitBetween.includes(id)) {
      setSplitBetween(splitBetween.filter(pId => pId !== id));
    } else {
      setSplitBetween([...splitBetween, id]);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title || !amount || parseFloat(amount) <= 0) {
      alert(t('dashboard.alert_fill_all'));
      return;
    }

    const finalSplitBetween = splitBetween.length === 0 
      ? participants.map(p => p.id) 
      : splitBetween;

    const newExpense: Expense = {
      id: expense?.id || Math.random().toString(36).substr(2, 9),
      title,
      amount: parseFloat(amount),
      paidBy,
      splitBetween: finalSplitBetween,
      date: expense?.date || new Date().toISOString()
    };
    onSubmit(newExpense);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div>
        <label className="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-1.5">{t('dashboard.expense_title')}</label>
        <input 
          type="text" 
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder={t('dashboard.expense_title_placeholder')}
          className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
          required
        />
      </div>

      <div>
        <label className="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-1.5">{t('dashboard.amount')} ({currencyCode})</label>
        <div className="relative">
          <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 font-bold">{currentCurrency.symbol}</span>
          <input 
            type="number" 
            step="0.01"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="0.00"
            className="w-full pl-10 pr-4 py-3 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all font-bold"
            required
          />
        </div>
      </div>

      <div>
        <label className="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-1.5">{t('dashboard.paid_by_label')}</label>
        <select 
          value={paidBy}
          onChange={(e) => setPaidBy(e.target.value)}
          className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all bg-white"
        >
          {participants.map(p => (
            <option key={p.id} value={p.id}>{p.name}</option>
          ))}
        </select>
      </div>

      <div>
        <label className="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-1.5">{t('dashboard.split_between_label')}</label>
        <div className="flex flex-wrap gap-2 mt-2">
          {participants.map(p => (
            <button
              key={p.id}
              type="button"
              onClick={() => toggleSplit(p.id)}
              className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all border ${
                splitBetween.includes(p.id) 
                  ? 'bg-secondary text-white border-secondary shadow-sm' 
                  : 'bg-white text-gray-500 border-gray-200 hover:border-secondary'
              }`}
            >
              {p.name}
            </button>
          ))}
        </div>
        {splitBetween.length === 0 && (
          <p className="text-[10px] text-gray-400 mt-1.5 italic">{t('dashboard.split_all_desc')}</p>
        )}
      </div>

      <div className="flex gap-3 pt-4">
        <button 
          type="button"
          onClick={onCancel}
          className="flex-1 py-3 rounded-xl font-bold text-gray-500 hover:bg-gray-50 transition-colors"
        >
          {t('common.cancel')}
        </button>
        <button 
          type="submit"
          className="flex-1 bg-primary text-white py-3 rounded-xl font-bold shadow-lg shadow-orange-100 hover:bg-orange-600 transition-all"
        >
          {expense ? t('common.save') : t('common.add')}
        </button>
      </div>
    </form>
  );
}

function ExploreView({ onBack, onCreateTrip, language, t }: { onBack: () => void, onCreateTrip: (trip: Trip) => void, language: LanguageCode, t: (key: string) => string }) {
  const [city, setCity] = useState('');
  const [startDate, setStartDate] = useState('');
  const [days, setDays] = useState(3);
  const [people, setPeople] = useState(2);
  const [loading, setLoading] = useState(false);
  const [itinerary, setItinerary] = useState<Itinerary | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleSearch = async (e?: React.FormEvent, surpriseCity?: string) => {
    e?.preventDefault();
    const targetCity = surpriseCity || city;
    if (!targetCity.trim()) return;

    if (!startDate || !days || !people) {
      setError(t('explore.error_fill_fields'));
      return;
    }

    const today = new Date().toISOString().split('T')[0];
    if (startDate < today) {
      setError(t('explore.error_date_past'));
      return;
    }

    if (surpriseCity) setCity(surpriseCity);

    setLoading(true);
    setError(null);
    setItinerary(null);

    try {
      const result = await generateItinerary(targetCity, language, startDate, parseInt(days), parseInt(people));
      setItinerary(result);
    } catch (err) {
      console.error(err);
      setError(t('explore.error'));
    } finally {
      setLoading(false);
    }
  };

  const handleSurpriseMe = () => {
    if (!startDate || !days || !people) {
      setError(t('explore.error_surprise_me'));
      return;
    }
    const cities = ['Parigi', 'Londra', 'New York', 'Tokyo', 'Roma', 'Barcellona', 'Amsterdam', 'Lisbona', 'Praga', 'Vienna'];
    const randomCity = cities[Math.floor(Math.random() * cities.length)];
    handleSearch(undefined, randomCity);
  };

  const handleRegenerate = () => {
    const cities = ['Parigi', 'Londra', 'New York', 'Tokyo', 'Roma', 'Barcellona', 'Amsterdam', 'Lisbona', 'Praga', 'Vienna'];
    let newCity = cities[Math.floor(Math.random() * cities.length)];
    // Try to pick a different city if possible
    if (newCity === city) {
      newCity = cities[(cities.indexOf(newCity) + 1) % cities.length];
    }
    handleSearch(undefined, newCity);
  };

  const handleCreateFromItinerary = () => {
    if (!itinerary) return;

    const endDate = new Date(startDate || new Date());
    endDate.setDate(endDate.getDate() + (itinerary.days.length - 1));

    const expenses: Expense[] = [];
    if (itinerary.budgetEstimate.flight) {
      expenses.push({
        id: Math.random().toString(36).substr(2, 9),
        title: t('explore.expense_flight'),
        amount: itinerary.budgetEstimate.flight,
        paidBy: '', // Will be assigned to first participant
        splitBetween: [], // Will be assigned to all participants
        date: startDate || new Date().toISOString()
      });
    }
    if (itinerary.budgetEstimate.accommodation) {
      expenses.push({
        id: Math.random().toString(36).substr(2, 9),
        title: t('explore.expense_accommodation'),
        amount: itinerary.budgetEstimate.accommodation,
        paidBy: '',
        splitBetween: [],
        date: startDate || new Date().toISOString()
      });
    }
    if (itinerary.budgetEstimate.carRental) {
      expenses.push({
        id: Math.random().toString(36).substr(2, 9),
        title: t('explore.expense_car_rental'),
        amount: itinerary.budgetEstimate.carRental,
        paidBy: '',
        splitBetween: [],
        date: startDate || new Date().toISOString()
      });
    }

    const participants: Participant[] = Array.from({ length: people }, (_, i) => ({
      id: (i + 1).toString(),
      name: i === 0 ? t('common.me') : `${t('common.friend')} ${i}`
    }));

    const newTrip: Trip = {
      id: Math.random().toString(36).substr(2, 9),
      name: `${t('explore.trip_to')} ${itinerary.city}`,
      startDate: startDate || new Date().toISOString().split('T')[0],
      endDate: endDate.toISOString().split('T')[0],
      participants,
      expenses: expenses.map(e => ({
        ...e,
        paidBy: '1',
        splitBetween: participants.map(p => p.id)
      })),
      itinerary
    };

    onCreateTrip(newTrip);
  };

  return (
    <div className="relative min-h-screen overflow-hidden">
      {/* Background Image with Overlay */}
      <div 
        className="fixed inset-0 z-0"
        style={{
          backgroundImage: 'url("https://images.unsplash.com/photo-1469854523086-cc02fe5d8800?q=80&w=2021&auto=format&fit=crop")',
          backgroundSize: 'cover',
          backgroundPosition: 'center',
        }}
      >
        <div className="absolute inset-0 bg-black/50 backdrop-blur-[2px]" />
      </div>

      <motion.div 
        initial={{ opacity: 0, x: 20 }}
        animate={{ opacity: 1, x: 0 }}
        exit={{ opacity: 0, x: -20 }}
        className="relative z-10 max-w-3xl mx-auto px-4 pt-8 pb-20"
      >
        <button onClick={onBack} className="flex items-center gap-2 text-white/70 hover:text-white mb-6 transition-colors drop-shadow-md">
          <ArrowLeft size={20} />
          {t('common.back_to_home')}
        </button>

      <div className="bg-white rounded-3xl p-8 shadow-sm border border-gray-100 mb-8">
        <div className="flex items-center gap-3 mb-6">
          <div className="bg-orange-50 p-3 rounded-2xl">
            <Sparkles className="text-primary" size={24} />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-gray-900">{t('explore.title')}</h2>
            <p className="text-gray-500 text-sm">{t('explore.where_to')}</p>
          </div>
        </div>

        <form onSubmit={handleSearch} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
              <input 
                type="text" 
                value={city}
                onChange={(e) => setCity(e.target.value)}
                placeholder={t('explore.city_placeholder')}
                className="w-full pl-12 pr-4 py-4 rounded-2xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all text-lg"
                required
              />
              <span className="absolute -top-2 left-4 bg-white px-1 text-[10px] font-black text-gray-400 uppercase tracking-tighter">{t('create.destination')}</span>
            </div>
            <div className="relative">
              <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
              <input 
                type="date" 
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full pl-12 pr-4 py-4 rounded-2xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all text-lg"
                required
              />
              <span className="absolute -top-2 left-4 bg-white px-1 text-[10px] font-black text-gray-400 uppercase tracking-tighter">{t('create.start_date')}</span>
            </div>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="relative">
              <input 
                type="number" 
                min="1"
                max="30"
                value={days}
                onChange={(e) => setDays(Number(e.target.value))}
                className="w-full px-4 py-4 rounded-2xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all text-lg text-center font-bold"
                title={t('explore.how_many_days')}
                required
              />
              <span className="absolute -top-2 left-1/2 -translate-x-1/2 bg-white px-1 text-[10px] font-black text-gray-400 uppercase tracking-tighter">{t('home.days')}</span>
            </div>
            <div className="relative">
              <input 
                type="number" 
                min="1"
                max="20"
                value={people}
                onChange={(e) => setPeople(Number(e.target.value))}
                className="w-full px-4 py-4 rounded-2xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all text-lg text-center font-bold"
                title={t('explore.how_many_people')}
                required
              />
              <span className="absolute -top-2 left-1/2 -translate-x-1/2 bg-white px-1 text-[10px] font-black text-gray-400 uppercase tracking-tighter">{t('home.people')}</span>
            </div>
            <button 
              type="submit"
              disabled={loading}
              className="bg-primary text-white px-4 py-4 rounded-2xl font-bold shadow-lg shadow-orange-100 hover:bg-orange-600 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {loading ? <Loader2 className="animate-spin" size={20} /> : <Sparkles size={20} />}
              {loading ? t('explore.generating') : t('explore.generate')}
            </button>
            <button 
              type="button"
              onClick={handleSurpriseMe}
              disabled={loading}
              className="bg-secondary text-white px-4 py-4 rounded-2xl font-bold shadow-lg shadow-teal-100 hover:bg-teal-600 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {t('explore.surprise_me')}
            </button>
          </div>
        </form>

        {error && (
          <div className="mt-4 p-4 bg-red-50 text-red-600 rounded-xl text-sm font-medium border border-red-100">
            {error}
          </div>
        )}
      </div>

      <AnimatePresence>
        {itinerary && (
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-8"
          >
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
              <div className="flex items-center gap-2">
                <MapPin className="text-secondary drop-shadow-md" size={32} />
                <h3 className="text-4xl font-black text-white drop-shadow-lg">{t('explore.itinerary')}: {itinerary.city}</h3>
              </div>
              <div className="bg-white rounded-2xl p-4 shadow-sm border border-orange-100 flex items-center gap-4 relative group">
                <div className="bg-orange-50 p-2 rounded-lg">
                  <Wallet className="text-primary" size={24} />
                </div>
                <div>
                  <p className="text-[10px] text-gray-400 uppercase tracking-widest font-bold">{t('explore.est_budget')}</p>
                  <p className="text-xl font-black text-gray-900">
                    {itinerary.budgetEstimate.currency} {itinerary.budgetEstimate.low} - {itinerary.budgetEstimate.high}
                  </p>
                  <div className="flex flex-wrap gap-x-3 gap-y-1 mt-1">
                    {itinerary.budgetEstimate.flight > 0 && (
                      <span className="text-[9px] bg-blue-50 text-blue-600 px-1.5 py-0.5 rounded font-bold uppercase">{t('explore.expense_flight')}: {itinerary.budgetEstimate.currency}{itinerary.budgetEstimate.flight}</span>
                    )}
                    {itinerary.budgetEstimate.accommodation > 0 && (
                      <span className="text-[9px] bg-green-50 text-green-600 px-1.5 py-0.5 rounded font-bold uppercase">{t('explore.expense_accommodation')}: {itinerary.budgetEstimate.currency}{itinerary.budgetEstimate.accommodation}</span>
                    )}
                    {itinerary.budgetEstimate.carRental > 0 && (
                      <span className="text-[9px] bg-purple-50 text-purple-600 px-1.5 py-0.5 rounded font-bold uppercase">{t('explore.expense_car_rental')}: {itinerary.budgetEstimate.currency}{itinerary.budgetEstimate.carRental}</span>
                    )}
                  </div>
                  <p className="text-[10px] text-gray-500 italic max-w-[200px] leading-tight mt-1">
                    {itinerary.budgetEstimate.description}
                  </p>
                </div>
              </div>
            </div>

            {itinerary.cityPresentation && (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {[
                  { title: t('explore.history'), icon: History, color: 'text-primary', bg: 'bg-orange-50', content: itinerary.cityPresentation.history },
                  { title: t('explore.culture'), icon: Globe, color: 'text-secondary', bg: 'bg-teal-50', content: itinerary.cityPresentation.culture },
                  { title: t('explore.typical_dishes'), icon: Utensils, color: 'text-orange-400', bg: 'bg-amber-50', content: itinerary.cityPresentation.typicalDishes },
                  { title: t('explore.general_info'), icon: Info, color: 'text-blue-400', bg: 'bg-blue-50', content: itinerary.cityPresentation.generalInfo },
                ].map((item, i) => (
                  <motion.div 
                    key={i}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.1 }}
                    className="bg-white/90 backdrop-blur-md p-6 rounded-[2rem] border border-white/20 shadow-lg"
                  >
                    <div className={`${item.bg} w-10 h-10 rounded-xl flex items-center justify-center mb-4`}>
                      <item.icon className={item.color} size={20} />
                    </div>
                    <h4 className={`text-xs font-black uppercase tracking-widest mb-2 ${item.color}`}>{item.title}</h4>
                    <p className="text-xs text-gray-600 leading-relaxed line-clamp-4 hover:line-clamp-none transition-all cursor-pointer">{item.content}</p>
                  </motion.div>
                ))}
              </div>
            )}

            {itinerary.weather && (
              <div className="bg-white/80 backdrop-blur-md p-6 rounded-[2.5rem] border border-white/20 shadow-xl overflow-hidden">
                <div className="flex items-center gap-3 mb-6">
                  <div className="bg-blue-50 p-2 rounded-xl">
                    <CloudSun className="text-blue-500" size={24} />
                  </div>
                  <h4 className="text-lg font-black text-gray-900 uppercase tracking-widest">{t('explore.weather_forecast')}</h4>
                </div>
                <div className="flex gap-4 overflow-x-auto pb-2 scrollbar-hide">
                  {itinerary.weather.map((w, idx) => (
                    <div key={idx} className="flex-shrink-0 bg-white p-4 rounded-3xl border border-gray-100 shadow-sm min-w-[120px] text-center flex flex-col items-center justify-center gap-2 group hover:border-primary/30 transition-all">
                      <span className="text-[10px] font-black text-gray-400 uppercase tracking-tighter">{w.date}</span>
                      <span className="text-3xl">{w.icon}</span>
                      <div className="flex flex-col">
                        <span className="text-lg font-black text-gray-900">{w.tempMax}°</span>
                        <span className="text-[10px] font-bold text-gray-400">{w.tempMin}°</span>
                      </div>
                      <span className="text-[9px] font-bold text-gray-500 uppercase tracking-widest text-center line-clamp-1">{w.condition}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="flex gap-4">
              <button 
                onClick={handleCreateFromItinerary}
                className="flex-1 bg-secondary text-white py-4 rounded-2xl font-bold shadow-lg shadow-teal-100 hover:bg-teal-600 transition-all flex items-center justify-center gap-2"
              >
                <Plus size={20} />
                {t('explore.choose_trip')}
              </button>
              <button 
                onClick={handleRegenerate}
                className="flex-1 bg-white text-gray-600 py-4 rounded-2xl font-bold border border-gray-200 hover:bg-gray-50 transition-all flex items-center justify-center gap-2"
              >
                <Sparkles size={20} className="text-primary" />
                {t('explore.regenerate')}
              </button>
            </div>

            {itinerary.days.map((day) => (
              <div key={day.day} className="relative pl-12 pb-12 last:pb-0">
                {/* Timeline Line */}
                <div className="absolute left-[19px] top-0 bottom-0 w-0.5 bg-gradient-to-b from-primary/50 to-secondary/50 rounded-full" />
                
                {/* Day Marker */}
                <motion.div 
                  initial={{ scale: 0 }}
                  whileInView={{ scale: 1 }}
                  viewport={{ once: true }}
                  className="absolute left-0 top-0 w-10 h-10 rounded-full bg-white shadow-lg border-4 border-primary flex items-center justify-center z-10"
                >
                  <span className="text-primary font-black text-sm">{day.day}</span>
                </motion.div>

                <div className="space-y-6">
                  <div className="flex items-center gap-4 mb-8">
                    <div className="bg-primary/20 backdrop-blur-sm px-6 py-2 rounded-full border border-primary/30">
                      <h4 className="text-xl font-black text-white uppercase tracking-[0.2em] drop-shadow-sm">{t('explore.day')} {day.day}</h4>
                    </div>
                    <div className="h-px flex-1 bg-gradient-to-r from-white/20 to-transparent" />
                  </div>
                  
                  <div className="grid gap-8">
                    {day.items.map((item, idx) => (
                      <motion.div 
                        key={idx}
                        initial={{ opacity: 0, x: -20 }}
                        whileInView={{ opacity: 1, x: 0 }}
                        viewport={{ once: true }}
                        transition={{ delay: idx * 0.1 }}
                        className="bg-white rounded-[2rem] overflow-hidden shadow-xl border border-gray-100 hover:border-primary/30 transition-all group flex flex-col lg:flex-row"
                      >
                        <div className="w-full lg:w-64 h-64 lg:h-auto overflow-hidden relative">
                          <PlaceImage searchTerm={item.imageSearchTerm} alt={item.activity} />
                          {item.time && (
                            <div className="absolute top-4 left-4 bg-black/60 backdrop-blur-md text-white px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border border-white/20">
                              {item.time}
                            </div>
                          )}
                        </div>
                        <div className="p-8 flex-1 flex flex-col justify-between">
                          <div>
                            <div className="flex justify-between items-start mb-4">
                              <h5 className="text-2xl font-black text-gray-900 group-hover:text-primary transition-colors leading-tight">{item.activity}</h5>
                            </div>
                            <p className="text-gray-600 leading-relaxed mb-6 text-sm lg:text-base">{item.description}</p>
                          </div>
                          
                          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-6 border-t border-gray-100">
                            {item.address && (
                              <div className="flex items-start gap-3">
                                <div className="bg-teal-50 p-2 rounded-xl">
                                  <MapPin size={16} className="text-secondary" />
                                </div>
                                <div className="flex flex-col">
                                  <span className="text-[9px] font-black text-gray-400 uppercase tracking-tighter">{t('explore.address')}</span>
                                  <span className="text-xs text-gray-600 line-clamp-2">{item.address}</span>
                                </div>
                              </div>
                            )}
                            {item.hours && (
                              <div className="flex items-start gap-3">
                                <div className="bg-orange-50 p-2 rounded-xl">
                                  <Clock size={16} className="text-primary" />
                                </div>
                                <div className="flex flex-col">
                                  <span className="text-[9px] font-black text-gray-400 uppercase tracking-tighter">{t('explore.hours')}</span>
                                  <span className="text-xs text-gray-600">{item.hours}</span>
                                </div>
                              </div>
                            )}
                            {item.cost && (
                              <div className="flex items-start gap-3">
                                <div className="bg-amber-50 p-2 rounded-xl">
                                  <Coins size={16} className="text-amber-500" />
                                </div>
                                <div className="flex flex-col">
                                  <span className="text-[9px] font-black text-gray-400 uppercase tracking-tighter">{t('explore.cost')}</span>
                                  <span className="text-xs font-bold text-gray-900">{item.cost}</span>
                                </div>
                              </div>
                            )}
                          </div>
                        </div>
                      </motion.div>
                    ))}
                  </div>
                </div>
              </div>
            ))}
          </motion.div>
        )}
      </AnimatePresence>

      {loading && !itinerary && (
        <div className="py-20 text-center">
          <div className="inline-block p-4 bg-white rounded-full shadow-xl mb-4">
            <Loader2 className="animate-spin text-primary" size={40} />
          </div>
          <p className="text-gray-500 font-medium animate-pulse">{t('explore.planning_message')}</p>
        </div>
      )}
    </motion.div>
    </div>
  );
}
