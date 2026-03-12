import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { MdArrowBack, MdVisibility, MdVisibilityOff, MdCheck, MdClose, MdRefresh } from 'react-icons/md';
import { useSettings } from '../hooks/useSettings';

// Provider configurations
const PROVIDERS = [
  { id: 'openai', name: 'OpenAI', description: 'GPT-4 and GPT-3.5 models', keyUrl: 'https://platform.openai.com/api-keys', defaultBaseUrl: 'https://api.openai.com/v1' },
  { id: 'anthropic', name: 'Anthropic', description: 'Claude models', keyUrl: 'https://console.anthropic.com/settings/keys', defaultBaseUrl: 'https://api.anthropic.com/v1' },
  { id: 'glm', name: 'GLM (Zhipu AI)', description: 'Chinese GLM models', keyUrl: 'https://open.bigmodel.cn/', defaultBaseUrl: 'https://open.bigmodel.cn/api/paas/v4' },
  { id: 'custom', name: 'Custom Provider', description: 'Any OpenAI-compatible API', keyUrl: '', defaultBaseUrl: '' },
];

// Model options per provider
const MODEL_OPTIONS = {
  openai: ['gpt-4o', 'gpt-4o-mini', 'gpt-4-turbo', 'gpt-3.5-turbo'],
  anthropic: ['claude-3-5-sonnet-20241022', 'claude-3-opus-20240229', 'claude-3-sonnet-20240229', 'claude-3-haiku-20240307'],
  glm: ['glm-4', 'glm-4-flash', 'glm-4-plus', 'glm-4-long', 'glm-3-turbo'],
  custom: [], // User can enter any model name
};

export default function Settings() {
  const navigate = useNavigate();
  const {
    settings,
    features,
    loading,
    error,
    saving,
    testingConnection,
    testResult,
    updateSettings,
    testConnection,
    removeAPIKey,
    clearError,
    clearTestResult,
  } = useSettings();

  // Form state
  const [provider, setProvider] = useState('glm');
  const [apiKey, setApiKey] = useState('');
  const [showApiKey, setShowApiKey] = useState(false);
  const [customBaseUrl, setCustomBaseUrl] = useState('');
  const [showCustomUrl, setShowCustomUrl] = useState(false);
  const [selectedModel, setSelectedModel] = useState('');
  const [customModel, setCustomModel] = useState('');
  const [nlSearchEnabled, setNlSearchEnabled] = useState(true);
  const [semanticSearchEnabled, setSemanticSearchEnabled] = useState(false);
  const [contentSearchEnabled, setContentSearchEnabled] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  // Sync form state with settings from backend
  useEffect(() => {
    if (settings) {
      setProvider(settings.ai_provider || 'glm');
      setCustomBaseUrl(settings.base_url || '');

      if (settings.model) {
        setSelectedModel(settings.model);
        setCustomModel(settings.model);
      } else {
        // Use provider-specific model
        const providerSettings = PROVIDERS.find(p => p.id === (settings.ai_provider || 'glm'));
        if (providerSettings) {
          const models = MODEL_OPTIONS[providerSettings.id] || [];
          setSelectedModel(models[0] || '');
          setCustomModel('');
        }
      }
      setNlSearchEnabled(settings.nl_search_enabled ?? true);
      setSemanticSearchEnabled(settings.semantic_search_enabled ?? false);
      setContentSearchEnabled(settings.content_search_enabled ?? false);
    }
  }, [settings]);

  // Handle provider change
  const handleProviderChange = (newProvider) => {
    setProvider(newProvider);
    setApiKey(''); // Clear API key when changing provider
    clearTestResult();

    const providerConfig = PROVIDERS.find(p => p.id === newProvider);
    if (providerConfig) {
      // Auto-fill default base URL if no custom one is set
      if (!showCustomUrl || !settings?.base_url) {
        setCustomBaseUrl('');
      }
      // Set default model for new provider
      const models = MODEL_OPTIONS[newProvider] || [];
      setSelectedModel(models[0] || '');
      setCustomModel('');
    }
  };

  // Handle save
  const handleSave = async () => {
    try {
      clearError();
      setSaveSuccess(false);

      const updates = {
        ai_provider: provider,
        nl_search_enabled: nlSearchEnabled,
        semantic_search_enabled: semanticSearchEnabled,
        content_search_enabled: contentSearchEnabled,
        model: showCustomUrl || customBaseUrl ? customModel : selectedModel,
        base_url: showCustomUrl && customBaseUrl ? customBaseUrl : null,
      };

      // Include API key only if provided
      if (apiKey.trim()) {
        updates.api_key = apiKey.trim();
      }

      await updateSettings(updates);
      setSaveSuccess(true);
      setApiKey(''); // Clear input after save

      // Clear success message after 3 seconds
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (err) {
      console.error('Save failed:', err);
    }
  };

  // Handle test connection
  const handleTestConnection = async () => {
    if (!apiKey.trim()) {
      return;
    }

    const modelToTest = showCustomUrl || customBaseUrl ? customModel : selectedModel;
    await testConnection(provider, apiKey.trim(), showCustomUrl && customBaseUrl ? customBaseUrl : null, modelToTest);
  };

  // Handle delete API key
  const handleDeleteKey = async () => {
    if (window.confirm('Are you sure you want to delete the stored API key?')) {
      try {
        await removeAPIKey();
      } catch (err) {
        console.error('Delete failed:', err);
      }
    }
  };

  // Get current models for provider
  const getCurrentModels = () => {
    const providerInfo = PROVIDERS.find(p => p.id === provider);
    if (!providerInfo) return [];
    return MODEL_OPTIONS[provider] || [];
  };

  const getProviderInfo = () => {
    return PROVIDERS.find(p => p.id === provider) || PROVIDERS[0];
  };

  if (loading) {
    return (
      <main className="flex-1 overflow-y-auto bg-background-light dark:bg-background-dark p-6">
        <div className="px-8 mx-auto">
          <div className="animate-pulse space-y-4">
            <div className="h-8 bg-slate-200 dark:bg-slate-700 rounded w-1/4"></div>
            <div className="h-32 bg-slate-200 dark:bg-slate-700 rounded"></div>
            <div className="h-48 bg-slate-200 dark:bg-slate-700 rounded"></div>
          </div>
        </div>
      </main>
    );
  }

  const providerInfo = getProviderInfo();
  const models = getCurrentModels();

  return (
    <main className="flex-1 overflow-y-auto bg-background-light dark:bg-background-dark p-6">
      <div className="px-8 space-y-6">
        {/* Header */}
        <div className="flex items-center gap-4">
          <button
            onClick={() => navigate(-1)}
            className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            <MdArrowBack className="w-5 h-5" />
          </button>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Settings</h1>
        </div>

        {/* Error Banner */}
        {error && (
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-400 px-4 py-3 rounded-lg flex items-center justify-between">
            <span>{error}</span>
            <button onClick={clearError} className="text-red-500 hover:text-red-700">
              <MdClose />
            </button>
          </div>
        )}

        {/* Success Banner */}
        {saveSuccess && (
          <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 text-green-700 dark:text-green-400 px-4 py-3 rounded-lg flex items-center gap-2">
            <MdCheck className="w-5 h-5" />
            <span>Settings saved successfully!</span>
          </div>
        )}

        {/* AI Provider Settings */}
        <section className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 p-6">
          <h2 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">
            AI Provider Configuration
          </h2>
          <p className="text-sm text-slate-500 dark:text-slate-400 mb-6">
            Configure your AI provider for intelligent file search features. Your API key is encrypted and stored locally.
            Works with any OpenAI-compatible API provider.
          </p>

          {/* Provider Selection */}
          <div className="space-y-4 mb-6">
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">
              Select Provider
            </label>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
              {PROVIDERS.map((p) => (
                <button
                  key={p.id}
                  onClick={() => handleProviderChange(p.id)}
                  className={`p-4 rounded-lg border-2 text-left transition-all ${
                    provider === p.id
                      ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                      : 'border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600'
                  }`}
                >
                  <div className="font-medium text-slate-900 dark:text-white">{p.name}</div>
                  <div className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                    {p.description}
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* API Key Input */}
          <div className="space-y-4 mb-6">
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">
              API Key
            </label>
            <div className="flex gap-2">
              <div className="relative flex-1">
                <input
                  type={showApiKey ? 'text' : 'password'}
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                  placeholder={settings?.has_api_key ? '•••••••• (key already saved)' : 'Enter your API key'}
                  className="w-full px-4 py-2 pr-10 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-white placeholder-slate-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
                <button
                  type="button"
                  onClick={() => setShowApiKey(!showApiKey)}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                >
                  {showApiKey ? <MdVisibilityOff className="w-5 h-5" /> : <MdVisibility className="w-5 h-5" />}
                </button>
              </div>
              <button
                onClick={handleTestConnection}
                disabled={!apiKey.trim() || testingConnection}
                className="px-4 py-2 bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-600 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                {testingConnection ? (
                  <>
                    <MdRefresh className="w-4 h-4 animate-spin" />
                    Testing...
                  </>
                ) : (
                  'Test'
                )}
              </button>
            </div>

            {/* Test Result */}
            {testResult && (
              <div className={`mt-2 p-3 rounded-lg flex items-center gap-2 ${
                testResult.success
                  ? 'bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400'
                  : 'bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400'
              }`}>
                {testResult.success ? (
                  <MdCheck className="w-5 h-5" />
                ) : (
                  <MdClose className="w-5 h-5" />
                )}
                <span className="text-sm">{testResult.message}</span>
              </div>
            )}
          </div>

          {/* Custom Base URL Toggle */}
          <div className="space-y-4 mb-6">
            <label className="flex items-start gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={showCustomUrl}
                onChange={(e) => setShowCustomUrl(e.target.checked)}
                className="mt-1 w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
              />
              <div>
                <div className="font-medium text-slate-900 dark:text-white">
                  Use Custom Base URL
                </div>
                <div className="text-sm text-slate-500 dark:text-slate-400">
                  Override default API endpoint (for custom providers or local deployments)
                </div>
              </div>
            </label>

            {showCustomUrl && (
              <div>
                <input
                  type="url"
                  value={customBaseUrl}
                  onChange={(e) => setCustomBaseUrl(e.target.value)}
                  placeholder="https://api.provider.com/v1"
                  className="w-full px-4 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-white placeholder-slate-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                  Default for {providerInfo.name}: {providerInfo.defaultBaseUrl}
                </p>
              </div>
            )}
          </div>

          {/* Model Selection */}
          <div className="space-y-4 mb-6">
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">
              Model
            </label>
            {(showCustomUrl || customBaseUrl) ? (
              // Custom model input
              <input
                type="text"
                value={customModel}
                onChange={(e) => setCustomModel(e.target.value)}
                placeholder="Enter model name (e.g., glm-4, gpt-4o, etc.)"
                className="w-full px-4 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-white placeholder-slate-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            ) : (
              // Preset model selection
              models.length > 0 ? (
                <select
                  value={selectedModel}
                  onChange={(e) => setSelectedModel(e.target.value)}
                  className="w-full px-4 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  {models.map((model) => (
                    <option key={model} value={model}>
                      {model}
                    </option>
                  ))}
                </select>
              ) : (
                <input
                  type="text"
                  value={selectedModel}
                  onChange={(e) => setSelectedModel(e.target.value)}
                  placeholder="Enter model name"
                  className="w-full px-4 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-white placeholder-slate-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              )
            )}
          </div>

          {/* Delete Key Button */}
          {settings?.has_api_key && (
            <button
              onClick={handleDeleteKey}
              className="text-sm text-red-600 dark:text-red-400 hover:underline"
            >
              Delete stored API key
            </button>
          )}
        </section>

        {/* AI Features */}
        <section className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 p-6">
          <h2 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">
            AI Features
          </h2>
          <p className="text-sm text-slate-500 dark:text-slate-400 mb-6">
            Enable or disable AI-powered features. Some features require additional setup.
          </p>

          <div className="space-y-4">
            {/* Natural Language Search */}
            <label className="flex items-start gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={nlSearchEnabled}
                onChange={(e) => setNlSearchEnabled(e.target.checked)}
                className="mt-1 w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
              />
              <div>
                <div className="font-medium text-slate-900 dark:text-white">
                  Natural Language Search
                </div>
                <div className="text-sm text-slate-500 dark:text-slate-400">
                  Convert queries like "find my resume pdf" into structured search filters
                </div>
              </div>
            </label>

            {/* Semantic Search */}
            <label className="flex items-start gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={semanticSearchEnabled}
                onChange={(e) => setSemanticSearchEnabled(e.target.checked)}
                className="mt-1 w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
              />
              <div>
                <div className="font-medium text-slate-900 dark:text-white">
                  Semantic Search
                </div>
                <div className="text-sm text-slate-500 dark:text-slate-400">
                  Search files by meaning using AI embeddings (e.g., "invoice from amazon" finds order files)
                </div>
              </div>
            </label>

            {/* Content Search */}
            <label className="flex items-start gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={contentSearchEnabled}
                onChange={(e) => setContentSearchEnabled(e.target.checked)}
                className="mt-1 w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
              />
              <div>
                <div className="font-medium text-slate-900 dark:text-white">
                  File Content Understanding
                </div>
                <div className="text-sm text-slate-500 dark:text-slate-400">
                  Search within file contents (PDF, Word, text files)
                </div>
              </div>
            </label>
          </div>
        </section>

        {/* Save Button */}
        <div className="flex justify-end gap-3">
          <button
            onClick={() => navigate(-1)}
            className="px-4 py-2 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            {saving ? (
              <>
                <MdRefresh className="w-4 h-4 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <MdCheck className="w-4 h-4" />
                Save Settings
              </>
            )}
          </button>
        </div>
      </div>
    </main>
  );
}
