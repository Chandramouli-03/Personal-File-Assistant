import { useState, useCallback, useEffect } from 'react';
import { getAISettings, updateAISettings, getAIFeatures, testAPIConnection, deleteAPIKey } from '../services/api';

/**
 * Custom hook for managing AI settings
 * @returns {Object} Settings state and methods
 */
export function useSettings() {
  const [settings, setSettings] = useState(null);
  const [features, setFeatures] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [saving, setSaving] = useState(false);
  const [testingConnection, setTestingConnection] = useState(false);
  const [testResult, setTestResult] = useState(null);

  /**
   * Fetch AI settings from backend
   */
  const fetchSettings = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const [settingsData, featuresData] = await Promise.all([
        getAISettings(),
        getAIFeatures(),
      ]);

      setSettings(settingsData);
      setFeatures(featuresData);
    } catch (err) {
      console.error('Failed to fetch settings:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  /**
   * Update AI settings
   */
  const updateSettings = useCallback(async (updates) => {
    try {
      setSaving(true);
      setError(null);

      const updatedSettings = await updateAISettings(updates);
      setSettings(updatedSettings);

      return updatedSettings;
    } catch (err) {
      console.error('Failed to update settings:', err);
      setError(err.message);
      throw err;
    } finally {
      setSaving(false);
    }
  }, []);

  /**
   * Test API connection for a provider
   */
  const testConnection = useCallback(async (provider, apiKey, baseUrl = null, model = null) => {
    try {
      setTestingConnection(true);
      setTestResult(null);

      const result = await testAPIConnection(provider, apiKey, baseUrl, model);
      setTestResult(result);

      return result;
    } catch (err) {
      console.error('Connection test failed:', err);
      const result = {
        success: false,
        message: err.message,
        provider,
      };
      setTestResult(result);
      return result;
    } finally {
      setTestingConnection(false);
    }
  }, []);

  /**
   * Delete the stored API key
   */
  const removeAPIKey = useCallback(async () => {
    try {
      await deleteAPIKey();
      // Refresh settings to reflect the change
      await fetchSettings();
    } catch (err) {
      console.error('Failed to delete API key:', err);
      setError(err.message);
      throw err;
    }
  }, [fetchSettings]);

  /**
   * Clear error state
   */
  const clearError = useCallback(() => {
    setError(null);
  }, []);

  /**
   * Clear test result
   */
  const clearTestResult = useCallback(() => {
    setTestResult(null);
  }, []);

  // Fetch settings on mount
  useEffect(() => {
    fetchSettings();
  }, [fetchSettings]);

  return {
    // State
    settings,
    features,
    loading,
    error,
    saving,
    testingConnection,
    testResult,

    // Actions
    fetchSettings,
    updateSettings,
    testConnection,
    removeAPIKey,
    clearError,
    clearTestResult,

    // Computed
    hasAPIKey: settings?.has_api_key || false,
    currentProvider: settings?.ai_provider || 'glm',
    nlSearchEnabled: settings?.nl_search_enabled ?? true,
    semanticSearchEnabled: settings?.semantic_search_enabled ?? false,
    contentSearchEnabled: settings?.content_search_enabled ?? false,
  };
}

export default useSettings;
