import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import axios from 'axios';
import { useAppStore } from '../store/useAppStore';

export default function Admin() {
  const navigate = useNavigate();
  const { tab } = useParams();
  const { user, isLoggedIn, isLoading } = useAppStore();

  const [activeTab, setActiveTab] = useState<'sso' | 'ai' | 'telegram' | 'users' | 'maintenance' | 'tts' | 'ai-batch' | 'image-batch'>('sso');
  const [globalLoading, setGlobalLoading] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  // Sync activeTab with URL sub-route
  useEffect(() => {
    if (tab && ['sso', 'ai', 'telegram', 'users', 'maintenance', 'tts', 'ai-batch', 'image-batch'].includes(tab)) {
      setActiveTab(tab as any);
    } else if (!tab) {
      navigate('/admin/sso', { replace: true });
    }
  }, [tab, navigate]);

  // Tab: Telegram Config state
  const [tgBotToken, setTgBotToken] = useState('');
  const [tgBotUsername, setTgBotUsername] = useState('');
  const [tgEnabled, setTgEnabled] = useState(false);
  const [tgTestStatus, setTgTestStatus] = useState<{ status: 'idle' | 'loading' | 'success' | 'error'; message?: string }>({ status: 'idle' });
  const [broadcastMsg, setBroadcastMsg] = useState('');
  const [broadcastStatus, setBroadcastStatus] = useState<{ status: 'idle' | 'loading' | 'success' | 'error'; message?: string }>({ status: 'idle' });

  // Tab 1: SSO Config state
  const [ssoUrl, setSsoUrl] = useState('');
  const [ssoClientId, setSsoClientId] = useState('');
  const [ssoClientSecret, setSsoClientSecret] = useState('');
  const [ssoEnabled, setSsoEnabled] = useState(false);
  const [ssoTestStatus, setSsoTestStatus] = useState<{ status: 'idle' | 'loading' | 'success' | 'error'; message?: string }>({ status: 'idle' });

  // Tab 2: AI Config state
  const [aiKey, setAiKey] = useState('');
  const [aiModel, setAiModel] = useState('');
  const [aiEnabled, setAiEnabled] = useState(false);
  const [aiModels, setAiModels] = useState<any[]>([]);
  const [loadingModels, setLoadingModels] = useState(false);

  // Tab 3: Users state
  const [usersList, setUsersList] = useState<any[]>([]);

  // Tab 4: Maintenance state
  const [maintenanceEnabled, setMaintenanceEnabled] = useState(false);

  // Tab 5: TTS Config state
  const [adminDecks, setAdminDecks] = useState<any[]>([]);
  const [selectedDeckId, setSelectedDeckId] = useState<string>('');
  const [isFetchingTTSStatus, setIsFetchingTTSStatus] = useState(false);
  const [ttsStatus, setTtsStatus] = useState<{ total_cards: number, missing_audio_cards: number } | null>(null);
  const [isStartingTTS, setIsStartingTTS] = useState(false);

  const loadAdminDecks = async () => {
    try {
      const res = await axios.get('/api/v1/admin/decks');
      setAdminDecks(res.data || []);
      if (res.data && res.data.length > 0) {
        const firstId = res.data[0].id.toString();
        setSelectedDeckId(firstId);
        
        setIsFetchingTTSStatus(true);
        const statusRes = await axios.get(`/api/v1/deck/${firstId}/tts-status`);
        setTtsStatus(statusRes.data);
      }
    } catch (e) {
      console.error("Failed to load admin decks", e);
    } finally {
      setIsFetchingTTSStatus(false);
    }
  };

  const handleCheckTTSStatus = async (deckIdStr: string) => {
    setSelectedDeckId(deckIdStr);
    if (!deckIdStr) {
      setTtsStatus(null);
      return;
    }
    setIsFetchingTTSStatus(true);
    setTtsStatus(null);
    try {
      const res = await axios.get(`/api/v1/deck/${deckIdStr}/tts-status`);
      setTtsStatus(res.data);
    } catch (e) {
      console.error("Failed to check deck tts status", e);
    } finally {
      setIsFetchingTTSStatus(false);
    }
  };

  const handleStartTTSGeneration = async () => {
    if (!selectedDeckId) return;
    setIsStartingTTS(true);
    setSuccessMsg('');
    setErrorMsg('');
    try {
      await axios.post(`/api/v1/deck/${selectedDeckId}/generate-all-audio`, { force: false });
      setSuccessMsg("Đã bắt đầu hàng đợi sinh âm thanh tự động ngầm cho bộ bài!");
      setTimeout(() => {
        handleCheckTTSStatus(selectedDeckId);
      }, 2000);
    } catch (e) {
      setErrorMsg("Không thể khởi động hàng đợi âm thanh.");
    } finally {
      setIsStartingTTS(false);
    }
  };

  // Tab 6: AI Batch Config state
  const [selectedAIBatchField, setSelectedAIBatchField] = useState<string>('');
  const [isFetchingAIBatchStatus, setIsFetchingAIBatchStatus] = useState(false);
  const [aiBatchStatus, setAiBatchStatus] = useState<{ total_cards: number, missing_ai_cards: number } | null>(null);
  const [isStartingAIBatch, setIsStartingAIBatch] = useState(false);

  // Tab 7: Image Batch Config state
  const [selectedImageSourceField, setSelectedImageSourceField] = useState<string>('front');
  const [selectedImageTargetField, setSelectedImageTargetField] = useState<string>('front_img');
  const [isFetchingImageBatchStatus, setIsFetchingImageBatchStatus] = useState(false);
  const [imageBatchStatus, setImageBatchStatus] = useState<{ total_cards: number, missing_image_cards: number } | null>(null);
  const [isStartingImageBatch, setIsStartingImageBatch] = useState(false);

  const handleCheckImageBatchStatus = async (deckIdStr: string, targetFieldStr?: string) => {
    setSelectedDeckId(deckIdStr);
    if (!deckIdStr) {
      setImageBatchStatus(null);
      return;
    }
    const target = targetFieldStr || selectedImageTargetField;
    setIsFetchingImageBatchStatus(true);
    setImageBatchStatus(null);
    try {
      const res = await axios.get(`/api/v1/deck/${deckIdStr}/image-status?target_field=${target}`);
      setImageBatchStatus(res.data);
    } catch (e) {
      console.error("Failed to check deck image status", e);
    } finally {
      setIsFetchingImageBatchStatus(false);
    }
  };

  const handleStartImageBatchGeneration = async () => {
    if (!selectedDeckId) return;
    setIsStartingImageBatch(true);
    setSuccessMsg('');
    setErrorMsg('');
    try {
      await axios.post(`/api/v1/deck/${selectedDeckId}/generate-all-images`, {
        source_field: selectedImageSourceField,
        target_field: selectedImageTargetField,
        force: false
      });
      setSuccessMsg(`Đã bắt đầu hàng đợi tìm & tải ảnh hàng loạt cho trường '${selectedImageTargetField}'!`);
      setTimeout(() => {
        handleCheckImageBatchStatus(selectedDeckId, selectedImageTargetField);
      }, 2000);
    } catch (e) {
      setErrorMsg("Không thể khởi động hàng đợi tìm ảnh hàng loạt.");
    } finally {
      setIsStartingImageBatch(false);
    }
  };

  const handleCheckAIBatchStatus = async (deckIdStr: string, fieldStr?: string) => {
    setSelectedDeckId(deckIdStr);
    if (!deckIdStr) {
      setAiBatchStatus(null);
      return;
    }

    const currentDeck = adminDecks.find(d => d.id.toString() === deckIdStr);
    const customPrompts = currentDeck?.practice_settings?.ai_prompts || [];
    
    let activeField = fieldStr || selectedAIBatchField;
    if (customPrompts.length > 0) {
      const exists = customPrompts.some((cp: any) => cp.id === activeField);
      if (!exists || !activeField) {
        activeField = customPrompts[0].id;
        setSelectedAIBatchField(activeField);
      }
    } else {
      activeField = '';
      setSelectedAIBatchField('');
    }

    if (!activeField) {
      setAiBatchStatus(null);
      return;
    }

    setIsFetchingAIBatchStatus(true);
    setAiBatchStatus(null);
    try {
      const res = await axios.get(`/api/v1/deck/${deckIdStr}/ai-status?field=${activeField}`);
      setAiBatchStatus(res.data);
    } catch (e) {
      console.error("Failed to check deck ai status", e);
    } finally {
      setIsFetchingAIBatchStatus(false);
    }
  };

  const handleStartAIBatchGeneration = async () => {
    if (!selectedDeckId) return;
    setIsStartingAIBatch(true);
    setSuccessMsg('');
    setErrorMsg('');
    try {
      await axios.post(`/api/v1/deck/${selectedDeckId}/generate-all-ai`, { field: selectedAIBatchField, force: false });
      setSuccessMsg(`Đã bắt đầu hàng đợi sinh AI cho trường '${selectedAIBatchField}' của bộ thẻ!`);
      setTimeout(() => {
        handleCheckAIBatchStatus(selectedDeckId);
      }, 2000);
    } catch (e) {
      setErrorMsg("Không thể khởi động hàng đợi sinh AI.");
    } finally {
      setIsStartingAIBatch(false);
    }
  };

  // Enforce admin authorization
  useEffect(() => {
    if (!isLoading) {
      if (!isLoggedIn) {
        navigate('/login');
      } else if (user?.role !== 'admin') {
        navigate('/');
      }
    }
  }, [isLoggedIn, user, isLoading, navigate]);

  // Load SSO & AI settings on mount
  useEffect(() => {
    if (isLoggedIn && user?.role === 'admin') {
      loadSSOConfig();
      loadAIConfig();
      loadTelegramConfig();
      loadUsersList();
      loadMaintenanceMode();
      loadAdminDecks();
    }
  }, [isLoggedIn, user]);

  const loadSSOConfig = async () => {
    try {
      const res = await axios.get('/api/v1/admin/sso');
      setSsoUrl(res.data.central_auth_url || '');
      setSsoClientId(res.data.client_id || '');
      setSsoClientSecret(res.data.client_secret || '');
      setSsoEnabled(res.data.enabled || false);
    } catch (e) {
      console.error("Failed to load SSO configuration", e);
    }
  };

  const loadAIConfig = async () => {
    try {
      const res = await axios.get('/api/v1/admin/ai');
      setAiKey(res.data.api_key || '');
      setAiModel(res.data.model_id || 'gemini-2.5-flash');
      setAiEnabled(res.data.enabled || false);
    } catch (e) {
      console.error("Failed to load AI configuration", e);
    }
  };

  const loadTelegramConfig = async () => {
    try {
      const res = await axios.get('/api/v1/admin/telegram');
      setTgBotToken(res.data.bot_token || '');
      setTgBotUsername(res.data.bot_username || '');
      setTgEnabled(res.data.enabled || false);
    } catch (e) {
      console.error("Failed to load Telegram configuration", e);
    }
  };

  const loadUsersList = async () => {
    try {
      const res = await axios.get('/api/v1/admin/users');
      setUsersList(res.data || []);
    } catch (e) {
      console.error("Failed to load users list", e);
    }
  };

  const loadMaintenanceMode = async () => {
    try {
      const res = await axios.get('/api/v1/admin/maintenance');
      setMaintenanceEnabled(res.data.maintenance_enabled || false);
    } catch (e) {
      console.error("Failed to load maintenance mode", e);
    }
  };

  // Action: Save SSO config
  const handleSaveSSO = async (e: React.FormEvent) => {
    e.preventDefault();
    setSuccessMsg('');
    setErrorMsg('');
    setGlobalLoading(true);

    try {
      await axios.post('/api/v1/admin/sso', {
        central_auth_url: ssoUrl.trim(),
        client_id: ssoClientId.trim(),
        client_secret: ssoClientSecret.trim(),
        enabled: ssoEnabled
      });
      setSuccessMsg("SSO configuration updated successfully!");
    } catch (e) {
      setErrorMsg("Failed to save SSO configuration.");
    } finally {
      setGlobalLoading(false);
    }
  };

  // Action: Test SSO connection
  const handleTestSSO = async () => {
    if (!ssoUrl.trim()) {
      setSsoTestStatus({ status: 'error', message: 'CentralAuth URL is required to test' });
      return;
    }
    setSsoTestStatus({ status: 'loading' });
    try {
      const res = await axios.post('/api/v1/admin/sso/test', { central_auth_url: ssoUrl.trim() });
      if (res.data.status === 'success') {
        setSsoTestStatus({ status: 'success', message: res.data.message });
      } else {
        setSsoTestStatus({ status: 'error', message: res.data.message });
      }
    } catch (e: any) {
      setSsoTestStatus({ status: 'error', message: e.message || 'Connection test failed' });
    }
  };

  // Action: Save AI Config
  const handleSaveAI = async (e: React.FormEvent) => {
    e.preventDefault();
    setSuccessMsg('');
    setErrorMsg('');
    setGlobalLoading(true);

    try {
      await axios.post('/api/v1/admin/ai', {
        api_key: aiKey.trim(),
        model_id: aiModel,
        enabled: aiEnabled
      });
      setSuccessMsg("AI configuration updated successfully!");
    } catch (e) {
      setErrorMsg("Failed to save AI configuration.");
    } finally {
      setGlobalLoading(false);
    }
  };

  // Action: Save Telegram Config
  const handleSaveTelegram = async (e: React.FormEvent) => {
    e.preventDefault();
    setSuccessMsg('');
    setErrorMsg('');
    setGlobalLoading(true);

    try {
      await axios.post('/api/v1/admin/telegram', {
        bot_token: tgBotToken.trim(),
        bot_username: tgBotUsername.trim(),
        enabled: tgEnabled
      });
      setSuccessMsg("Telegram configuration updated successfully! Bot is now polling for messages.");
    } catch (e) {
      setErrorMsg("Failed to save Telegram configuration.");
    } finally {
      setGlobalLoading(false);
    }
  };

  // Action: Test Telegram Bot
  const handleTestTelegram = async () => {
    setTgTestStatus({ status: 'loading' });
    try {
      const res = await axios.post('/api/v1/admin/telegram/test');
      if (res.data.status === 'success') {
        setTgTestStatus({ status: 'success', message: res.data.message });
      } else {
        setTgTestStatus({ status: 'error', message: res.data.message });
      }
    } catch (e: any) {
      setTgTestStatus({ status: 'error', message: e.message || 'Connection test failed' });
    }
  };

  // Action: Broadcast Telegram Message
  const handleBroadcastTelegram = async () => {
    if (!broadcastMsg.trim()) return;
    setBroadcastStatus({ status: 'loading' });
    try {
      const res = await axios.post('/api/v1/admin/telegram/broadcast', { message: broadcastMsg });
      if (res.data.status === 'success') {
        setBroadcastStatus({ status: 'success', message: res.data.message });
        setBroadcastMsg('');
      } else {
        setBroadcastStatus({ status: 'error', message: res.data.message });
      }
    } catch (e: any) {
      setBroadcastStatus({ status: 'error', message: e.response?.data?.message || e.message || 'Broadcast failed' });
    }
  };

  // Action: List AI Models
  const handleListAIModels = async () => {
    if (!aiKey.trim()) {
      setErrorMsg("Google AI Studio API Key is required to list models.");
      return;
    }
    setLoadingModels(true);
    setSuccessMsg('');
    setErrorMsg('');
    try {
      const res = await axios.post('/api/v1/admin/ai/list-models', { api_key: aiKey.trim() });
      if (res.data.models) {
        setAiModels(res.data.models);
        setSuccessMsg(`Discovered ${res.data.models.length} generative models!`);
      }
    } catch (e: any) {
      setErrorMsg(e.response?.data?.error || "Failed to fetch generative models.");
    } finally {
      setLoadingModels(false);
    }
  };

  // Action: Toggle Maintenance
  const handleToggleMaintenance = async () => {
    setSuccessMsg('');
    setErrorMsg('');
    setGlobalLoading(true);

    try {
      const res = await axios.post('/api/v1/admin/maintenance/toggle');
      setMaintenanceEnabled(res.data.maintenance_enabled);
      setSuccessMsg(`System maintenance mode ${res.data.maintenance_enabled ? 'ENABLED' : 'DISABLED'}!`);
    } catch (e) {
      setErrorMsg("Failed to toggle system maintenance mode.");
    } finally {
      setGlobalLoading(false);
    }
  };

  if (isLoading || globalLoading) {
    return (
      <div className="min-h-screen bg-[#0b0f19] text-white flex items-center justify-center font-sans">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 rounded-full border-4 border-indigo-500/30 border-t-indigo-500 animate-spin" />
          <span className="text-gray-400 font-medium">Processing Admin Instruction...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0b0f19] text-white font-sans p-6 md:p-12 relative overflow-x-hidden selection:bg-[#6366f1] selection:text-white">
      {/* Glow Orbs */}
      <div className="absolute top-[-20%] left-[-20%] w-[60vw] h-[60vw] rounded-full bg-[#4f46e5] opacity-5 blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[-20%] right-[-20%] w-[60vw] h-[60vw] rounded-full bg-[#ec4899] opacity-5 blur-[120px] pointer-events-none" />

      <div className="max-w-6xl mx-auto z-10 relative">
        {/* Navigation Breadcrumb & Title */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-12 border-b border-white/5 pb-8">
          <div>
            <div className="flex items-center gap-3 text-sm text-gray-500 mb-2">
              <span className="hover:text-indigo-400 cursor-pointer transition-colors" onClick={() => navigate('/')}>Dashboard</span>
              <span>/</span>
              <span className="text-indigo-300">Admin Control Panel</span>
            </div>
            <h1 className="text-4xl font-extrabold tracking-tight bg-gradient-to-r from-white to-gray-300 bg-clip-text text-transparent">
              Vocaburn System Control
            </h1>
          </div>

          <button
            onClick={() => navigate('/')}
            className="px-5 py-2.5 rounded-xl font-bold bg-[#1e293b] hover:bg-[#334155] border border-white/10 transition-all text-sm self-start active:scale-95"
          >
            ← Return to Dashboard
          </button>
        </div>

        {/* Dynamic Alerts */}
        {successMsg && (
          <div className="p-4 mb-8 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 text-sm font-medium flex gap-3 items-center animate-fade-in shadow-lg shadow-emerald-500/5">
            <svg className="w-5 h-5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span>{successMsg}</span>
          </div>
        )}

        {errorMsg && (
          <div className="p-4 mb-8 rounded-xl bg-red-500/10 border border-red-500/20 text-red-300 text-sm font-medium flex gap-3 items-center animate-fade-in shadow-lg shadow-red-500/5">
            <svg className="w-5 h-5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            <span>{errorMsg}</span>
          </div>
        )}

        {/* Dashboard Grid / Tabs Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          {/* Navigation Tabs */}
          <div className="flex flex-col gap-2.5">
            <button
              onClick={() => navigate('/admin/sso')}
              className={`p-4 rounded-xl font-bold flex items-center gap-3 transition-all text-left ${activeTab === 'sso' ? 'bg-[#6366f1] text-white shadow-lg shadow-indigo-500/20' : 'bg-white/[0.02] hover:bg-white/[0.05] border border-white/5 text-gray-400'}`}
            >
              🔒 CentralAuth SSO
            </button>
            <button
              onClick={() => navigate('/admin/ai')}
              className={`p-4 rounded-xl font-bold flex items-center gap-3 transition-all text-left ${activeTab === 'ai' ? 'bg-[#6366f1] text-white shadow-lg shadow-indigo-500/20' : 'bg-white/[0.02] hover:bg-white/[0.05] border border-white/5 text-gray-400'}`}
            >
              🧠 Google Gemini AI
            </button>
            <button
              onClick={() => navigate('/admin/telegram')}
              className={`p-4 rounded-xl font-bold flex items-center gap-3 transition-all text-left ${activeTab === 'telegram' ? 'bg-[#6366f1] text-white shadow-lg shadow-indigo-500/20' : 'bg-white/[0.02] hover:bg-white/[0.05] border border-white/5 text-gray-400'}`}
            >
              🤖 Telegram Bot
            </button>
            <button
              onClick={() => navigate('/admin/users')}
              className={`p-4 rounded-xl font-bold flex items-center gap-3 transition-all text-left ${activeTab === 'users' ? 'bg-[#6366f1] text-white shadow-lg shadow-indigo-500/20' : 'bg-white/[0.02] hover:bg-white/[0.05] border border-white/5 text-gray-400'}`}
            >
              👥 User Registry
            </button>
            <button
              onClick={() => navigate('/admin/maintenance')}
              className={`p-4 rounded-xl font-bold flex items-center gap-3 transition-all text-left ${activeTab === 'maintenance' ? 'bg-[#6366f1] text-white shadow-lg shadow-indigo-500/20' : 'bg-white/[0.02] hover:bg-white/[0.05] border border-white/5 text-gray-400'}`}
            >
              ⚙️ System Control
            </button>
            <button
              onClick={() => navigate('/admin/tts')}
              className={`p-4 rounded-xl font-bold flex items-center gap-3 transition-all text-left ${activeTab === 'tts' ? 'bg-[#6366f1] text-white shadow-lg shadow-indigo-500/20' : 'bg-white/[0.02] hover:bg-white/[0.05] border border-white/5 text-gray-400'}`}
            >
              🎵 Batch TTS Sync
            </button>
            <button
              onClick={() => {
                navigate('/admin/ai-batch');
                if (selectedDeckId) {
                  handleCheckAIBatchStatus(selectedDeckId, selectedAIBatchField);
                }
              }}
              className={`p-4 rounded-xl font-bold flex items-center gap-3 transition-all text-left ${activeTab === 'ai-batch' ? 'bg-[#6366f1] text-white shadow-lg shadow-indigo-500/20' : 'bg-white/[0.02] hover:bg-white/[0.05] border border-white/5 text-gray-400'}`}
            >
              🧠 Batch AI Sync
            </button>
            <button
              onClick={() => {
                navigate('/admin/image-batch');
                if (selectedDeckId) {
                  handleCheckImageBatchStatus(selectedDeckId, selectedImageTargetField);
                }
              }}
              className={`p-4 rounded-xl font-bold flex items-center gap-3 transition-all text-left ${activeTab === 'image-batch' ? 'bg-[#6366f1] text-white shadow-lg shadow-indigo-500/20' : 'bg-white/[0.02] hover:bg-white/[0.05] border border-white/5 text-gray-400'}`}
            >
              🖼️ Batch Image Sync
            </button>
          </div>

          {/* Form Content Area */}
          <div className="lg:col-span-3 bg-white/[0.02] border border-white/5 backdrop-blur-md rounded-2xl p-8 shadow-xl">
            {/* Tab 1: SSO Config */}
            {activeTab === 'sso' && (
              <form onSubmit={handleSaveSSO} className="flex flex-col gap-6">
                <div>
                  <h3 className="text-2xl font-bold mb-2">CentralAuth SSO Integration</h3>
                  <p className="text-gray-400 text-sm">Synchronize user credentials across the platform effortlessly.</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  <div className="md:col-span-2">
                    <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">CentralAuth Server URL</label>
                    <input
                      type="url"
                      value={ssoUrl}
                      onChange={(e) => setSsoUrl(e.target.value)}
                      placeholder="https://central-auth-domain.com"
                      className="w-full bg-[#0d1321] border border-white/10 rounded-xl px-4 py-3.5 text-white placeholder-gray-700 focus:outline-none focus:border-indigo-500 transition-all text-sm"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Client ID</label>
                    <input
                      type="text"
                      value={ssoClientId}
                      onChange={(e) => setSsoClientId(e.target.value)}
                      placeholder="vocaburn-sub-client"
                      className="w-full bg-[#0d1321] border border-white/10 rounded-xl px-4 py-3.5 text-white placeholder-gray-700 focus:outline-none focus:border-indigo-500 transition-all text-sm"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Client Secret</label>
                    <input
                      type="password"
                      value={ssoClientSecret}
                      onChange={(e) => setSsoClientSecret(e.target.value)}
                      placeholder="••••••••••••••••••••••••••••••••"
                      className="w-full bg-[#0d1321] border border-white/10 rounded-xl px-4 py-3.5 text-white placeholder-gray-700 focus:outline-none focus:border-indigo-500 transition-all text-sm"
                    />
                  </div>
                </div>

                <div className="flex items-center gap-3 bg-[#0d1321]/50 border border-white/5 p-4 rounded-xl mt-2">
                  <input
                    type="checkbox"
                    id="ssoEnabled"
                    checked={ssoEnabled}
                    onChange={(e) => setSsoEnabled(e.target.checked)}
                    className="w-5 h-5 text-indigo-500 bg-[#0d1321] border-white/10 rounded focus:ring-indigo-500 focus:ring-offset-0 focus:ring-0"
                  />
                  <label htmlFor="ssoEnabled" className="text-sm font-semibold select-none cursor-pointer">
                    Enable SSO Routing (Redirect regular logins to CentralAuth)
                  </label>
                </div>

                <div className="flex flex-col sm:flex-row gap-4 border-t border-white/5 pt-6 mt-4">
                  <button
                    type="submit"
                    className="px-6 py-3 rounded-xl font-bold bg-indigo-500 hover:bg-indigo-600 shadow-lg shadow-indigo-500/20 transition-all text-sm flex items-center gap-2 active:scale-95"
                  >
                    Save Changes
                  </button>

                  <button
                    type="button"
                    onClick={handleTestSSO}
                    disabled={ssoTestStatus.status === 'loading'}
                    className="px-6 py-3 rounded-xl font-bold bg-pink-500 hover:bg-pink-600 shadow-lg shadow-pink-500/20 transition-all text-sm flex items-center gap-2 active:scale-95 disabled:opacity-50"
                  >
                    {ssoTestStatus.status === 'loading' ? 'Testing Connection...' : 'Test Connection'}
                  </button>
                </div>

                {ssoTestStatus.status !== 'idle' && (
                  <div className={`p-4 rounded-xl text-sm font-medium ${ssoTestStatus.status === 'success' ? 'bg-emerald-500/10 border border-emerald-500/20 text-emerald-300' : ssoTestStatus.status === 'error' ? 'bg-red-500/10 border border-red-500/20 text-red-300' : 'bg-white/[0.03] text-gray-400'}`}>
                    {ssoTestStatus.status === 'loading' && 'Checking central authentication health state...'}
                    {ssoTestStatus.status === 'success' && `✅ ${ssoTestStatus.message}`}
                    {ssoTestStatus.status === 'error' && `❌ ${ssoTestStatus.message}`}
                  </div>
                )}
              </form>
            )}

            {/* Tab 2: AI Config */}
            {activeTab === 'ai' && (
              <form onSubmit={handleSaveAI} className="flex flex-col gap-6">
                <div>
                  <h3 className="text-2xl font-bold mb-2">Google Gemini AI Studio</h3>
                  <p className="text-gray-400 text-sm">Configure raw key credentials and active LLM models for generation.</p>
                </div>

                <div className="flex flex-col gap-5">
                  <div>
                    <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Gemini API Key</label>
                    <input
                      type="password"
                      value={aiKey}
                      onChange={(e) => setAiKey(e.target.value)}
                      placeholder="AIzaSy..."
                      className="w-full bg-[#0d1321] border border-white/10 rounded-xl px-4 py-3.5 text-white placeholder-gray-700 focus:outline-none focus:border-indigo-500 transition-all text-sm"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Active LLM Model</label>
                    <div className="flex gap-4">
                      <select
                        value={aiModel}
                        onChange={(e) => setAiModel(e.target.value)}
                        className="flex-grow bg-[#0d1321] border border-white/10 rounded-xl px-4 py-3.5 text-white focus:outline-none focus:border-indigo-500 transition-all text-sm"
                      >
                        <option value="gemini-2.5-flash">gemini-2.5-flash (Fast & recommended)</option>
                        <option value="gemini-2.5-pro">gemini-2.5-pro (High intelligence)</option>
                        <option value="gemini-1.5-flash">gemini-1.5-flash</option>
                        <option value="gemini-1.5-pro">gemini-1.5-pro</option>
                        {aiModels.map((m) => (
                          <option key={m.id} value={m.id}>
                            {m.display_name} ({m.id})
                          </option>
                        ))}
                      </select>

                      <button
                        type="button"
                        onClick={handleListAIModels}
                        disabled={loadingModels}
                        className="px-5 py-3 rounded-xl font-bold bg-[#1e293b] hover:bg-[#334155] border border-white/10 transition-all text-sm whitespace-nowrap active:scale-95 disabled:opacity-50"
                      >
                        {loadingModels ? 'Fetching...' : 'Discover Models'}
                      </button>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-3 bg-[#0d1321]/50 border border-white/5 p-4 rounded-xl mt-2">
                  <input
                    type="checkbox"
                    id="aiEnabled"
                    checked={aiEnabled}
                    onChange={(e) => setAiEnabled(e.target.checked)}
                    className="w-5 h-5 text-indigo-500 bg-[#0d1321] border-white/10 rounded focus:ring-indigo-500 focus:ring-offset-0 focus:ring-0"
                  />
                  <label htmlFor="aiEnabled" className="text-sm font-semibold select-none cursor-pointer">
                    Enable AI Services (Permit smart generation from text/audio/video)
                  </label>
                </div>

                <div className="border-t border-white/5 pt-6 mt-4">
                  <button
                    type="submit"
                    className="px-6 py-3 rounded-xl font-bold bg-indigo-500 hover:bg-indigo-600 shadow-lg shadow-indigo-500/20 transition-all text-sm active:scale-95"
                  >
                    Save Changes
                  </button>
                </div>
              </form>
            )}

            {/* Tab: Telegram Config */}
            {activeTab === 'telegram' && (
              <form onSubmit={handleSaveTelegram} className="flex flex-col gap-6">
                <div>
                  <h3 className="text-2xl font-bold mb-2">Telegram Bot Integration</h3>
                  <p className="text-gray-400 text-sm">Configure the bot token to enable Telegram notifications and daily reminders.</p>
                </div>

                <div className="flex flex-col gap-5">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                    <div>
                      <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Bot Token</label>
                      <input
                        type="password"
                        value={tgBotToken}
                        onChange={(e) => setTgBotToken(e.target.value)}
                        placeholder="123456:ABC-DEF1234ghIkl-zyx57W2v1u123ew11"
                        className="w-full bg-[#0d1321] border border-white/10 rounded-xl px-4 py-3.5 text-white placeholder-gray-700 focus:outline-none focus:border-indigo-500 transition-all text-sm"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Bot Username</label>
                      <input
                        type="text"
                        value={tgBotUsername}
                        onChange={(e) => setTgBotUsername(e.target.value)}
                        placeholder="VocaburnBot"
                        className="w-full bg-[#0d1321] border border-white/10 rounded-xl px-4 py-3.5 text-white placeholder-gray-700 focus:outline-none focus:border-indigo-500 transition-all text-sm"
                      />
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-3 bg-[#0d1321]/50 border border-white/5 p-4 rounded-xl mt-2">
                  <input
                    type="checkbox"
                    id="tgEnabled"
                    checked={tgEnabled}
                    onChange={(e) => setTgEnabled(e.target.checked)}
                    className="w-5 h-5 text-indigo-500 bg-[#0d1321] border-white/10 rounded focus:ring-indigo-500 focus:ring-offset-0 focus:ring-0"
                  />
                  <label htmlFor="tgEnabled" className="text-sm font-semibold select-none cursor-pointer">
                    Enable Telegram Reminders
                  </label>
                </div>

                <div className="flex flex-col sm:flex-row gap-4 border-t border-white/5 pt-6 mt-4">
                  <button
                    type="submit"
                    className="px-6 py-3 rounded-xl font-bold bg-indigo-500 hover:bg-indigo-600 shadow-lg shadow-indigo-500/20 transition-all text-sm flex items-center justify-center gap-2 active:scale-95"
                  >
                    Save Changes
                  </button>

                  <button
                    type="button"
                    onClick={handleTestTelegram}
                    disabled={tgTestStatus.status === 'loading'}
                    className="px-6 py-3 rounded-xl font-bold bg-[#1e293b] hover:bg-[#334155] border border-white/10 transition-all text-sm flex items-center justify-center gap-2 active:scale-95 disabled:opacity-50"
                  >
                    Test Token
                  </button>
                </div>

                {tgTestStatus.status !== 'idle' && (
                  <div className={`p-4 rounded-xl text-sm font-medium ${tgTestStatus.status === 'success' ? 'bg-emerald-500/10 border border-emerald-500/20 text-emerald-300' : tgTestStatus.status === 'error' ? 'bg-red-500/10 border border-red-500/20 text-red-300' : 'bg-white/[0.03] text-gray-400'}`}>
                    {tgTestStatus.status === 'loading' && 'Processing request...'}
                    {tgTestStatus.status === 'success' && `✅ ${tgTestStatus.message}`}
                    {tgTestStatus.status === 'error' && `❌ ${tgTestStatus.message}`}
                  </div>
                )}
                
                <div className="border-t border-white/10 my-4"></div>
                
                <div>
                  <h3 className="text-xl font-bold mb-2 text-indigo-400">Broadcast Message</h3>
                  <p className="text-gray-400 text-sm mb-4">Send a message to all active users via the Telegram Bot. Supports HTML formatting.</p>
                  <textarea
                    value={broadcastMsg}
                    onChange={(e) => setBroadcastMsg(e.target.value)}
                    placeholder={`Hello! Welcome to Vocaburn.\n<b>Bold</b>, <i>Italic</i>, <a href="https://example.com">Link</a>`}
                    rows={4}
                    className="w-full bg-[#0d1321] border border-white/10 rounded-xl px-4 py-3 text-white placeholder-gray-700 focus:outline-none focus:border-indigo-500 transition-all text-sm mb-4"
                  />
                  <button
                    type="button"
                    onClick={handleBroadcastTelegram}
                    disabled={broadcastStatus.status === 'loading' || !broadcastMsg.trim()}
                    className="px-6 py-3 rounded-xl font-bold bg-pink-600 hover:bg-pink-700 shadow-lg shadow-pink-500/20 transition-all text-sm flex items-center justify-center gap-2 active:scale-95 disabled:opacity-50"
                  >
                    {broadcastStatus.status === 'loading' ? 'Sending...' : 'Send Broadcast'}
                  </button>
                  
                  {broadcastStatus.status !== 'idle' && (
                    <div className={`mt-4 p-4 rounded-xl text-sm font-medium ${broadcastStatus.status === 'success' ? 'bg-emerald-500/10 border border-emerald-500/20 text-emerald-300' : broadcastStatus.status === 'error' ? 'bg-red-500/10 border border-red-500/20 text-red-300' : 'bg-white/[0.03] text-gray-400'}`}>
                      {broadcastStatus.status === 'loading' && 'Sending broadcast...'}
                      {broadcastStatus.status === 'success' && `✅ ${broadcastStatus.message}`}
                      {broadcastStatus.status === 'error' && `❌ ${broadcastStatus.message}`}
                    </div>
                  )}
                </div>
              </form>
            )}

            {/* Tab 3: User Registry */}
            {activeTab === 'users' && (
              <div className="flex flex-col gap-6">
                <div>
                  <h3 className="text-2xl font-bold mb-2">User Registry</h3>
                  <p className="text-gray-400 text-sm">Full index of users initialized or synced locally in the database.</p>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm border-collapse">
                    <thead>
                      <tr className="border-b border-white/10 text-gray-400 text-xs font-semibold uppercase tracking-wider">
                        <th className="py-4 px-3">ID</th>
                        <th className="py-4 px-3">Username</th>
                        <th className="py-4 px-3">Email Address</th>
                        <th className="py-4 px-3">System Role</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5">
                      {usersList.length === 0 ? (
                        <tr>
                          <td colSpan={4} className="py-8 px-3 text-center text-gray-600 font-medium">
                            No synced users found in DB.
                          </td>
                        </tr>
                      ) : (
                        usersList.map((u) => (
                          <tr key={u.id} className="hover:bg-white/[0.01] transition-colors">
                            <td className="py-4 px-3 text-indigo-400 font-bold">{u.id}</td>
                            <td className="py-4 px-3 font-semibold">{u.username}</td>
                            <td className="py-4 px-3 text-gray-400">{u.email || 'None'}</td>
                            <td className="py-4 px-3">
                              <select
                                value={u.role}
                                onChange={async (e) => {
                                  const newRole = e.target.value;
                                  if (u.id === user?.id) {
                                    setErrorMsg("You cannot change your own role!");
                                    return;
                                  }
                                  try {
                                    setGlobalLoading(true);
                                    await axios.post(`/api/v1/admin/users/${u.id}/role`, { role: newRole });
                                    setSuccessMsg(`Updated role for ${u.username} to ${newRole.toUpperCase()}!`);
                                    setErrorMsg('');
                                    loadUsersList();
                                  } catch (err: any) {
                                    setErrorMsg(err.response?.data?.error || "Failed to update user role.");
                                  } finally {
                                    setGlobalLoading(false);
                                  }
                                }}
                                disabled={u.id === user?.id}
                                className={`bg-[#0d1321] border border-white/10 rounded-xl px-3 py-1.5 text-xs font-bold focus:outline-none focus:ring-1 focus:ring-indigo-500 transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed ${
                                  u.role === 'admin' ? 'text-pink-400' : 'text-indigo-400'
                                }`}
                              >
                                <option value="user" className="bg-[#0d1321] text-indigo-400 font-bold">USER</option>
                                <option value="admin" className="bg-[#0d1321] text-pink-400 font-bold">ADMIN</option>
                              </select>
                            </td>

                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Tab 4: Maintenance Mode */}
            {activeTab === 'maintenance' && (
              <div className="flex flex-col gap-6">
                <div>
                  <h3 className="text-2xl font-bold mb-2">System Controls</h3>
                  <p className="text-gray-400 text-sm">Toggle global operational flags for platform administrative windows.</p>
                </div>

                <div className="p-6 rounded-2xl bg-white/[0.01] border border-white/5 flex flex-col md:flex-row items-center justify-between gap-6 mt-4">
                  <div className="flex gap-4 items-center">
                    <div className={`w-12 h-12 rounded-xl flex items-center justify-center text-lg ${maintenanceEnabled ? 'bg-amber-500/10 text-amber-400' : 'bg-emerald-500/10 text-emerald-400'}`}>
                      {maintenanceEnabled ? '⚠️' : '✅'}
                    </div>
                    <div>
                      <h4 className="font-bold text-lg">System Maintenance Window</h4>
                      <p className="text-sm text-gray-500 mt-0.5">
                        {maintenanceEnabled 
                          ? 'Maintenance Mode is active. Normal accounts are restricted.' 
                          : 'Platform is online and serving traffic under healthy conditions.'}
                      </p>
                    </div>
                  </div>

                  <button
                    onClick={handleToggleMaintenance}
                    className={`px-6 py-3.5 rounded-xl font-bold transition-all text-sm active:scale-95 whitespace-nowrap ${maintenanceEnabled ? 'bg-emerald-500 hover:bg-emerald-600 shadow-lg shadow-emerald-500/20' : 'bg-amber-500 hover:bg-amber-600 shadow-lg shadow-amber-500/20'}`}
                  >
                    {maintenanceEnabled ? 'Disable Maintenance' : 'Enable Maintenance'}
                  </button>
                </div>
              </div>
            )}

            {/* Tab 5: TTS Batch Queue */}
            {activeTab === 'tts' && (
              <div className="flex flex-col gap-6">
                <div>
                  <h3 className="text-2xl font-bold mb-2">Batch TTS Audio Generation</h3>
                  <p className="text-gray-400 text-sm">Generate synthesized audio for all flashcards in a deck in the background.</p>
                </div>

                <div className="space-y-5 bg-[#0d1321]/50 border border-white/5 p-6 rounded-2xl">
                  <div>
                    <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Select Card Deck</label>
                    <select
                      value={selectedDeckId}
                      onChange={(e) => handleCheckTTSStatus(e.target.value)}
                      className="w-full bg-[#0d1321] border border-white/10 rounded-xl px-4 py-3.5 text-white font-bold focus:outline-none focus:border-indigo-500 transition-all text-sm cursor-pointer"
                    >
                      {adminDecks.length === 0 ? (
                        <option value="">No decks found</option>
                      ) : (
                        adminDecks.map(d => (
                          <option key={d.id} value={d.id} className="bg-[#0d1321] text-white font-semibold">
                            {d.title} (ID: {d.id})
                          </option>
                        ))
                      )}
                    </select>
                  </div>

                  {/* Status Panel */}
                  <div className="bg-white/[0.01] border border-white/5 p-5 rounded-xl">
                    <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-4">Deck TTS Audio Status</h4>
                    
                    {isFetchingTTSStatus ? (
                      <div className="py-4 flex flex-col items-center justify-center gap-2">
                        <div className="w-6 h-6 border-2 border-indigo-600/30 border-t-indigo-600 rounded-full animate-spin" />
                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Scanning cards...</span>
                      </div>
                    ) : ttsStatus ? (
                      <div className="grid grid-cols-2 gap-4">
                        <div className="bg-[#0d1321] border border-white/5 p-4 rounded-xl">
                          <p className="text-[9px] font-black text-gray-500 uppercase">Total Cards</p>
                          <p className="text-xl font-black text-white mt-1">{ttsStatus.total_cards}</p>
                        </div>
                        <div className="bg-[#0d1321] border border-white/5 p-4 rounded-xl">
                          <p className="text-[9px] font-black text-amber-500 uppercase">Missing Audio</p>
                          <p className="text-xl font-black text-amber-500 mt-1">{ttsStatus.missing_audio_cards}</p>
                        </div>
                      </div>
                    ) : (
                      <p className="text-xs text-gray-500">Select a deck above to scan its audio status.</p>
                    )}
                  </div>

                  {ttsStatus && ttsStatus.missing_audio_cards > 0 && (
                    <div className="flex items-center gap-3 bg-indigo-500/10 border border-indigo-500/20 p-4 rounded-xl text-xs text-indigo-300 font-bold leading-relaxed">
                      💡 Có {ttsStatus.missing_audio_cards} thẻ chưa có file âm thanh. Bấm bắt đầu để tạo ngầm tự động.
                    </div>
                  )}

                  <div className="flex justify-end pt-4 border-t border-white/5">
                    <button
                      type="button"
                      onClick={handleStartTTSGeneration}
                      disabled={isFetchingTTSStatus || !selectedDeckId || !ttsStatus || ttsStatus.missing_audio_cards === 0 || isStartingTTS}
                      className="px-6 py-3.5 rounded-xl font-bold bg-amber-500 hover:bg-amber-600 shadow-lg shadow-amber-500/20 transition-all text-sm flex items-center gap-2 active:scale-95 disabled:opacity-40 disabled:pointer-events-none"
                    >
                      {isStartingTTS ? 'Starting Task Queue...' : 'Start TTS Generation'}
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Tab 6: AI Batch Queue */}
            {activeTab === 'ai-batch' && (
              <div className="flex flex-col gap-6">
                <div>
                  <h3 className="text-2xl font-bold mb-2">Batch AI Content Generation</h3>
                  <p className="text-gray-400 text-sm">Generate explanations, hints, or mnemonics for all flashcards in a deck in the background.</p>
                </div>

                <div className="space-y-5 bg-[#0d1321]/50 border border-white/5 p-6 rounded-2xl">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Select Card Deck</label>
                      <select
                        value={selectedDeckId}
                        onChange={(e) => handleCheckAIBatchStatus(e.target.value, selectedAIBatchField)}
                        className="w-full bg-[#0d1321] border border-white/10 rounded-xl px-4 py-3.5 text-white font-bold focus:outline-none focus:border-indigo-500 transition-all text-sm cursor-pointer"
                      >
                        {adminDecks.length === 0 ? (
                          <option value="">No decks found</option>
                        ) : (
                          adminDecks.map(d => (
                            <option key={d.id} value={d.id} className="bg-[#0d1321] text-white font-semibold">
                              {d.title} (ID: {d.id})
                            </option>
                          ))
                        )}
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Select Target Field</label>
                      <select
                        value={selectedAIBatchField}
                        onChange={(e) => {
                          const newField = e.target.value;
                          setSelectedAIBatchField(newField);
                          if (selectedDeckId) {
                            handleCheckAIBatchStatus(selectedDeckId, newField);
                          }
                        }}
                        className="w-full bg-[#0d1321] border border-white/10 rounded-xl px-4 py-3.5 text-white font-bold focus:outline-none focus:border-indigo-500 transition-all text-sm cursor-pointer"
                      >
                        {(() => {
                          const currentDeck = adminDecks.find(d => d.id.toString() === selectedDeckId);
                          const customPrompts = currentDeck?.practice_settings?.ai_prompts || [];
                          if (customPrompts.length === 0) {
                            return <option value="" className="bg-[#0d1321] text-slate-500 font-semibold">No Custom Prompts Configured</option>;
                          }
                          return customPrompts.map((cp: any) => (
                            <option key={cp.id} value={cp.id} className="bg-[#0d1321] text-white font-semibold">
                              {cp.title || cp.id}
                            </option>
                          ));
                        })()}
                      </select>
                    </div>
                  </div>

                  {/* Status Panel */}
                  <div className="bg-white/[0.01] border border-white/5 p-5 rounded-xl">
                    <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-4">Deck AI Status</h4>
                    
                    {isFetchingAIBatchStatus ? (
                      <div className="py-4 flex flex-col items-center justify-center gap-2">
                        <div className="w-6 h-6 border-2 border-indigo-600/30 border-t-indigo-600 rounded-full animate-spin" />
                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Scanning cards...</span>
                      </div>
                    ) : aiBatchStatus ? (() => {
                      const currentDeck = adminDecks.find(d => d.id.toString() === selectedDeckId);
                      const selectedPromptObj = currentDeck?.practice_settings?.ai_prompts?.find((cp: any) => cp.id === selectedAIBatchField);
                      const fieldLabel = selectedPromptObj?.title || selectedAIBatchField;
                      
                      return (
                        <>
                          <div className="grid grid-cols-2 gap-4">
                            <div className="bg-[#0d1321] border border-white/5 p-4 rounded-xl">
                              <p className="text-[9px] font-black text-gray-500 uppercase">Total Cards</p>
                              <p className="text-xl font-black text-white mt-1">{aiBatchStatus.total_cards}</p>
                            </div>
                            <div className="bg-[#0d1321] border border-white/5 p-4 rounded-xl">
                              <p className="text-[9px] font-black text-indigo-500 uppercase">Missing AI {fieldLabel}</p>
                              <p className="text-xl font-black text-indigo-500 mt-1">{aiBatchStatus.missing_ai_cards}</p>
                            </div>
                          </div>
                          {aiBatchStatus.missing_ai_cards > 0 && (
                            <div className="flex items-center gap-3 bg-indigo-500/10 border border-indigo-500/20 p-4 rounded-xl text-xs text-indigo-300 font-bold leading-relaxed mt-4">
                              💡 Có {aiBatchStatus.missing_ai_cards} thẻ chưa có nội dung AI '{fieldLabel}'. Bấm bắt đầu để gửi hàng loạt vào hàng đợi CentralAuth.
                            </div>
                          )}
                        </>
                      );
                    })() : (
                      <p className="text-xs text-gray-500">Select a deck above to scan its AI status.</p>
                    )}
                  </div>

                  <div className="flex justify-end pt-4 border-t border-white/5">
                    <button
                      type="button"
                      onClick={handleStartAIBatchGeneration}
                      disabled={isFetchingAIBatchStatus || !selectedDeckId || !aiBatchStatus || aiBatchStatus.missing_ai_cards === 0 || isStartingAIBatch}
                      className="px-6 py-3.5 rounded-xl font-bold bg-indigo-500 hover:bg-indigo-600 shadow-lg shadow-indigo-500/20 transition-all text-sm flex items-center gap-2 active:scale-95 disabled:opacity-40 disabled:pointer-events-none"
                    >
                      {isStartingAIBatch ? 'Starting Task Queue...' : 'Start AI Generation'}
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Tab 7: Image Batch Queue */}
            {activeTab === 'image-batch' && (
              <div className="space-y-6">
                <div>
                  <h3 className="text-2xl font-bold mb-2">Batch Image Search & Download</h3>
                  <p className="text-gray-400 text-sm">Tìm kiếm và tải ảnh minh họa hàng loạt cho cả bộ thẻ qua CentralAuth.</p>
                </div>

                <div className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {/* Select Deck */}
                    <div className="flex flex-col">
                      <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Chọn bộ thẻ</label>
                      <select
                        value={selectedDeckId}
                        onChange={(e) => {
                          const newDeckId = e.target.value;
                          setSelectedDeckId(newDeckId);
                          if (newDeckId) {
                            handleCheckImageBatchStatus(newDeckId, selectedImageTargetField);
                          } else {
                            setImageBatchStatus(null);
                          }
                        }}
                        className="w-full bg-[#0d1321] border border-white/10 rounded-xl px-4 py-3.5 text-white font-bold focus:outline-none focus:border-indigo-500 transition-all text-sm cursor-pointer"
                      >
                        <option value="" style={{ color: '#94a3b8', backgroundColor: '#0d1321' }}>-- Chọn bộ thẻ --</option>
                        {adminDecks.map((deck) => (
                          <option key={deck.id} value={deck.id.toString()} style={{ color: '#ffffff', backgroundColor: '#0d1321' }} className="font-semibold">
                            {deck.name}
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* Select Source Keyword Field */}
                    <div className="flex flex-col">
                      <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Cột chứa Từ khóa (Source)</label>
                      <select
                        value={selectedImageSourceField}
                        onChange={(e) => setSelectedImageSourceField(e.target.value)}
                        className="w-full bg-[#0d1321] border border-white/10 rounded-xl px-4 py-3.5 text-white font-bold focus:outline-none focus:border-indigo-500 transition-all text-sm cursor-pointer"
                      >
                        <option value="front" style={{ color: '#ffffff', backgroundColor: '#0d1321' }} className="font-semibold">Mặt Trước (Word)</option>
                        <option value="back" style={{ color: '#ffffff', backgroundColor: '#0d1321' }} className="font-semibold">Mặt Sau (Definition)</option>
                        {(() => {
                          const currentDeck = adminDecks.find(d => d.id.toString() === selectedDeckId);
                          const customCols = currentDeck?.practice_settings?.custom_columns || [];
                          return customCols.map((c: string) => (
                            <option key={c} value={c} style={{ color: '#ffffff', backgroundColor: '#0d1321' }} className="font-semibold">{c}</option>
                          ));
                        })()}
                      </select>
                    </div>

                    {/* Select Target Image Field */}
                    <div className="flex flex-col">
                      <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Cột lưu URL Ảnh (Target)</label>
                      <select
                        value={selectedImageTargetField}
                        onChange={(e) => {
                          const newField = e.target.value;
                          setSelectedImageTargetField(newField);
                          if (selectedDeckId) {
                            handleCheckImageBatchStatus(selectedDeckId, newField);
                          }
                        }}
                        className="w-full bg-[#0d1321] border border-white/10 rounded-xl px-4 py-3.5 text-white font-bold focus:outline-none focus:border-indigo-500 transition-all text-sm cursor-pointer"
                      >
                        <option value="front_img" style={{ color: '#ffffff', backgroundColor: '#0d1321' }} className="font-semibold">front_img (Ảnh mặt trước)</option>
                        <option value="back_img" style={{ color: '#ffffff', backgroundColor: '#0d1321' }} className="font-semibold">back_img (Ảnh mặt sau)</option>
                        {(() => {
                          const currentDeck = adminDecks.find(d => d.id.toString() === selectedDeckId);
                          const customCols = currentDeck?.practice_settings?.custom_columns || [];
                          return customCols.map((c: string) => (
                            <option key={c} value={c} style={{ color: '#ffffff', backgroundColor: '#0d1321' }} className="font-semibold">{c}</option>
                          ));
                        })()}
                      </select>
                    </div>
                  </div>

                  {/* Status Panel */}
                  <div className="bg-white/[0.01] border border-white/5 p-5 rounded-xl">
                    <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-4">Trạng thái ảnh bộ thẻ</h4>
                    
                    {isFetchingImageBatchStatus ? (
                      <div className="py-4 flex flex-col items-center justify-center gap-2">
                        <div className="w-6 h-6 border-2 border-indigo-600/30 border-t-indigo-600 rounded-full animate-spin" />
                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Scanning cards...</span>
                      </div>
                    ) : imageBatchStatus ? (
                      <>
                        <div className="grid grid-cols-2 gap-4">
                          <div className="bg-[#0d1321] border border-white/5 p-4 rounded-xl">
                            <p className="text-[9px] font-black text-gray-500 uppercase">Tổng số thẻ</p>
                            <p className="text-xl font-black text-white mt-1">{imageBatchStatus.total_cards}</p>
                          </div>
                          <div className="bg-[#0d1321] border border-white/5 p-4 rounded-xl">
                            <p className="text-[9px] font-black text-indigo-500 uppercase">Thẻ thiếu ảnh ở cột '{selectedImageTargetField}'</p>
                            <p className="text-xl font-black text-indigo-500 mt-1">{imageBatchStatus.missing_image_cards}</p>
                          </div>
                        </div>
                        {imageBatchStatus.missing_image_cards > 0 && (
                          <div className="flex items-center gap-3 bg-indigo-500/10 border border-indigo-500/20 p-4 rounded-xl text-xs text-indigo-300 font-bold leading-relaxed mt-4">
                            💡 Có {imageBatchStatus.missing_image_cards} thẻ chưa có ảnh ở cột '{selectedImageTargetField}'. Bấm bắt đầu để tự động tìm kiếm và tải ảnh.
                          </div>
                        )}
                      </>
                    ) : (
                      <p className="text-xs text-gray-500">Chọn bộ thẻ ở trên để quét tình trạng ảnh minh họa.</p>
                    )}
                  </div>

                  <div className="flex justify-end pt-4 border-t border-white/5">
                    <button
                      type="button"
                      onClick={handleStartImageBatchGeneration}
                      disabled={isFetchingImageBatchStatus || !selectedDeckId || !imageBatchStatus || imageBatchStatus.missing_image_cards === 0 || isStartingImageBatch}
                      className="px-6 py-3.5 rounded-xl font-bold bg-indigo-500 hover:bg-indigo-600 shadow-lg shadow-indigo-500/20 transition-all text-sm flex items-center gap-2 active:scale-95 disabled:opacity-40 disabled:pointer-events-none"
                    >
                      {isStartingImageBatch ? 'Starting Task Queue...' : 'Start Image Generation'}
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
