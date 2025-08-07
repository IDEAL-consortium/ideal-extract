import React, { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import OpenAI from 'openai';

const SettingsPage: React.FC = () => {
  const [apiKey, setApiKey] = useState(localStorage.getItem('openai_api_key') || '');
  const [isValidating, setIsValidating] = useState(false);

  const validateApiKey = async (key: string): Promise<boolean> => {
    if (!key || key.trim() === '') {
      toast.error('Please enter an API key');
      return false;
    }

    if (!key.startsWith('sk-')) {
      toast.error('Invalid API key format. OpenAI API keys should start with "sk-"');
      return false;
    }

    try {
      const openai = new OpenAI({
        apiKey: key,
        dangerouslyAllowBrowser: true,
      });

      // Make a simple API call to validate the key
      await openai.models.list();
      return true;
    } catch (error: any) {
      if (error?.status === 401) {
        toast.error('Invalid API key. Please check your OpenAI API key.');
      } else if (error?.status === 429) {
        toast.error('Rate limit exceeded. Please try again later.');
      } else {
        toast.error('Failed to validate API key. Please check your internet connection.');
      }
      return false;
    }
  };

  const handleSave = async () => {
    setIsValidating(true);
    
    const isValid = await validateApiKey(apiKey);
    
    if (isValid) {
      localStorage.setItem('openai_api_key', apiKey);
      toast.success('API Key validated and saved successfully!');
    }
    
    setIsValidating(false);
  };

  return (
    <div className="p-4">
      <h1 className="text-2xl font-bold mb-4">Settings</h1>
      <div className="space-y-4">
        <div>
          <label htmlFor="api-key" className="block text-sm font-medium text-gray-700">
            OpenAI API Key
          </label>
          <div className="mt-1 flex items-center space-x-2">
            <Input
              id="api-key"
              type="password"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              className="max-w-md"
            />
            <Button onClick={handleSave} disabled={isValidating}>
              {isValidating ? 'Validating...' : 'Save'}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SettingsPage;
