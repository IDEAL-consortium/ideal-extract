import React, { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import OpenAI from 'openai';
import { HelpText } from './help-text';
import { useNavigate } from 'react-router-dom';

const SettingsPage: React.FC = () => {
  const navigate = useNavigate();
  const [apiKey, setApiKey] = useState(localStorage.getItem('openai_api_key') || '');
  const [enableLogprobs, setEnableLogprobs] = useState(localStorage.getItem('enable_logprobs') === 'true');
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
      console.error("API key validation error:", error);
      const errorMessage = error?.message || "Unknown error";
      
      if (error?.status === 401 || error?.status === 403) {
        toast.error('Invalid API key. Please check your OpenAI API key is correct and active.');
      } else if (error?.status === 429) {
        toast.error('Rate limit exceeded. Your API key is valid but has exceeded the rate limit. Please try again later.');
      } else if (error?.status === 500 || error?.status === 502 || error?.status === 503) {
        toast.error('OpenAI service is temporarily unavailable. Please try again later.');
      } else if (errorMessage.includes("network") || errorMessage.includes("fetch") || errorMessage.includes("ECONNREFUSED")) {
        toast.error('Network error: Unable to connect to OpenAI. Please check your internet connection.');
      } else {
        toast.error(`Failed to validate API key: ${errorMessage}`);
      }
      return false;
    }
  };

  const handleSave = async () => {
    setIsValidating(true);
    
    const isValid = await validateApiKey(apiKey);
    
    if (isValid) {
      localStorage.setItem('openai_api_key', apiKey);
      localStorage.setItem('enable_logprobs', enableLogprobs.toString());
      toast.success('Settings saved successfully!');
    }
    
    setIsValidating(false);
  };

  const handleLogprobsChange = (checked: boolean) => {
    setEnableLogprobs(checked);
  };

  return (
    <div className="p-4">
      <h1 className="text-2xl font-bold mb-4">Settings</h1>
      <div className="bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800 rounded-lg p-4 space-y-2 mb-6">
        <h4 className="font-semibold text-sm">Getting Started</h4>
        <ol className="list-decimal list-inside text-sm text-muted-foreground space-y-1 ml-2">
          <li>Get your OpenAI API key from <a href="https://platform.openai.com/api-keys" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline cursor-pointer">OpenAI Platform</a></li>
          <li>Enter your API key below (must start with "sk-")</li>
          <li>Click "Save" to validate and store the key</li>
          <li>Optionally enable Log Probabilities for confidence scores (GPT-4.1 models only)</li>
          <li>Once configured, you can start extraction jobs in <a href="/#/extract" onClick={(e) => { e.preventDefault(); navigate('/extract'); }} className="text-blue-600 hover:underline cursor-pointer">Extract Fields</a></li>
        </ol>
      </div>
      <div className="space-y-6">
        <div>
          <label htmlFor="api-key" className="block text-sm font-medium text-gray-700 mb-1">
            OpenAI API Key
          </label>
          <HelpText 
            text="Your API key is stored locally in your browser and only used for OpenAI API requests. Keys must start with 'sk-' and are validated before saving."
            linkTo="/#/manual#settings"
            linkText="Learn more about API key configuration"
            className="mb-2"
          />
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
        
        <div className="space-y-2">
          <h2 className="text-lg font-semibold">API Options</h2>
          <div className="flex items-center space-x-2 cursor-pointer">
            <Checkbox
              id="enable-logprobs"
              checked={enableLogprobs}
              onCheckedChange={handleLogprobsChange}
            />
            <Label htmlFor="enable-logprobs" className="cursor-pointer">
              Enable Log Probabilities
            </Label>
          </div>
          <HelpText 
            text="Log probabilities represent model confidence. When enabled, they're automatically requested for GPT-4.1 models and stored in output CSV. Useful for setting confidence thresholds."
            linkTo="/#/manual#settings"
            linkText="Learn more about log probabilities"
            className="ml-6"
          />
        </div>
      </div>
    </div>
  );
};

export default SettingsPage;
