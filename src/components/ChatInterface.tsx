import { useState, useRef, useEffect } from 'react';
import { Send, Bot, User, Waves, Settings } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { ChartRenderer } from './ChartRenderer';

interface Message {
  id: string;
  text: string;
  sender: 'user' | 'ai';
  timestamp: Date;
  chartData?: {
    type: 'bar' | 'line' | 'pie';
    title?: string;
    data: any[];
    xKey?: string;
    yKey?: string;
    dataKey?: string;
  };
}

interface ChatInterfaceProps {
  pdfText: string;
  fileName: string;
}

type AIProvider = 'openai' | 'gemini';

export const ChatInterface = ({ pdfText, fileName }: ChatInterfaceProps) => {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      text: `Hello! I've processed "${fileName}" and I'm ready to answer questions about it. What would you like to know?`,
      sender: 'ai',
      timestamp: new Date(),
    },
  ]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [apiKey, setApiKey] = useState(localStorage.getItem('ai_api_key') || '');
  const [aiProvider, setAiProvider] = useState<AIProvider>((localStorage.getItem('ai_provider') as AIProvider) || 'gemini');
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();

  useEffect(() => {
    // Scroll to bottom when new messages are added
    if (scrollAreaRef.current) {
      const scrollContainer = scrollAreaRef.current.querySelector('[data-radix-scroll-area-viewport]');
      if (scrollContainer) {
        scrollContainer.scrollTop = scrollContainer.scrollHeight;
      }
    }
  }, [messages]);

  const callOpenAI = async (question: string): Promise<string> => {
    if (!apiKey) {
      throw new Error('OpenAI API key is required');
    }

    const systemPrompt = `You are a helpful AI assistant that answers questions about PDF documents. 
    
The user has uploaded a PDF document with the following content:
${pdfText.substring(0, 12000)}...

Please analyze this content carefully and answer questions based on it. Provide detailed, accurate responses with specific references to the document content when possible. If the answer isn't clearly stated in the document, let the user know and provide your best interpretation based on the available information.

CHART GENERATION: When the user asks for charts, graphs, or data visualization, you can generate charts by including a JSON block in your response with the following format:
\`\`\`chart
{
  "type": "bar|line|pie",
  "title": "Chart Title",
  "data": [{"name": "Item1", "value": 100}, {"name": "Item2", "value": 200}],
  "xKey": "name",
  "yKey": "value",
  "dataKey": "value"
}
\`\`\`

For pie charts, use "dataKey" instead of "yKey". Always extract real data from the PDF content when creating charts.`;

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: question },
        ],
        max_tokens: 1000,
        temperature: 0.7,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(`OpenAI API error (${response.status}): ${errorData.error?.message || response.statusText}`);
    }

    const data = await response.json();
    return data.choices[0]?.message?.content || 'Sorry, I could not generate a response.';
  };

  const callGemini = async (question: string): Promise<string> => {
    if (!apiKey) {
      throw new Error('Gemini API key is required');
    }

    const systemPrompt = `You are a helpful AI assistant that answers questions about PDF documents. 
    
The user has uploaded a PDF document with the following content:
${pdfText.substring(0, 12000)}...

Please analyze this content carefully and answer questions based on it. Provide detailed, accurate responses with specific references to the document content when possible. If the answer isn't clearly stated in the document, let the user know and provide your best interpretation based on the available information.

CHART GENERATION: When the user asks for charts, graphs, or data visualization, you can generate charts by including a JSON block in your response with the following format:
\`\`\`chart
{
  "type": "bar|line|pie",
  "title": "Chart Title", 
  "data": [{"name": "Item1", "value": 100}, {"name": "Item2", "value": 200}],
  "xKey": "name",
  "yKey": "value",
  "dataKey": "value"
}
\`\`\`

For pie charts, use "dataKey" instead of "yKey". Always extract real data from the PDF content when creating charts.

User question: ${question}`;

    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-exp:generateContent?key=${apiKey}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        contents: [{
          parts: [{
            text: systemPrompt
          }]
        }],
        generationConfig: {
          temperature: 0.7,
          maxOutputTokens: 1000,
        }
      }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(`Gemini API error (${response.status}): ${errorData.error?.message || response.statusText}`);
    }

    const data = await response.json();
    return data.candidates?.[0]?.content?.parts?.[0]?.text || 'Sorry, I could not generate a response.';
  };

  const callAI = async (question: string): Promise<string> => {
    if (aiProvider === 'openai') {
      return callOpenAI(question);
    } else {
      return callGemini(question);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!inputValue.trim()) return;
    
    if (!apiKey) {
      toast({
        title: "API Key Required",
        description: "Please enter your OpenAI API key to start chatting.",
        variant: "destructive",
      });
      return;
    }

    const userMessage: Message = {
      id: Date.now().toString(),
      text: inputValue,
      sender: 'user',
      timestamp: new Date(),
    };

    setMessages(prev => [...prev, userMessage]);
    setInputValue('');
    setIsLoading(true);

    try {
      const aiResponse = await callAI(inputValue);
      
      // Extract chart data if present
      const chartRegex = /```chart\n([\s\S]*?)\n```/;
      const chartMatch = aiResponse.match(chartRegex);
      let chartData = null;
      let cleanedText = aiResponse;
      
      if (chartMatch) {
        try {
          chartData = JSON.parse(chartMatch[1]);
          cleanedText = aiResponse.replace(chartRegex, '').trim();
        } catch (e) {
          console.error('Failed to parse chart data:', e);
        }
      }
      
      const aiMessage: Message = {
        id: (Date.now() + 1).toString(),
        text: cleanedText,
        sender: 'ai',
        timestamp: new Date(),
        chartData,
      };
      
      setMessages(prev => [...prev, aiMessage]);
    } catch (error) {
      console.error(`Error calling ${aiProvider.toUpperCase()}:`, error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      toast({
        title: "AI Error",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleApiKeyChange = (value: string) => {
    setApiKey(value);
    localStorage.setItem('ai_api_key', value);
  };

  const handleProviderChange = (provider: AIProvider) => {
    setAiProvider(provider);
    localStorage.setItem('ai_provider', provider);
    // Reset API key when switching providers since they use different keys
    setApiKey('');
    localStorage.removeItem('ai_api_key');
  };

  const resetApiKey = () => {
    setApiKey('');
    localStorage.removeItem('ai_api_key');
    toast({
      title: "API Key Reset",
      description: "You can now enter a new API key.",
    });
  };

  return (
    <div className="flex flex-col h-full max-w-4xl mx-auto">
      {/* API Provider Selection */}
      <div className="ocean-card p-4 mb-4">
        <div className="flex items-center space-x-3 mb-3">
          <Settings className="w-5 h-5 text-primary" />
          <h3 className="font-semibold">AI Provider</h3>
        </div>
        <Select value={aiProvider} onValueChange={handleProviderChange}>
          <SelectTrigger className="w-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="gemini">Google Gemini (Free)</SelectItem>
            <SelectItem value="openai">OpenAI GPT-4o</SelectItem>
          </SelectContent>
        </Select>
        <p className="text-xs text-muted-foreground mt-2">
          Gemini offers free API access with generous limits
        </p>
      </div>

      {/* API Key Input */}
      {!apiKey && (
        <div className="ocean-card p-4 mb-4">
          <div className="flex items-center space-x-3 mb-2">
            <Waves className="w-5 h-5 text-primary" />
            <h3 className="font-semibold">API Key Required</h3>
          </div>
          <p className="text-sm text-muted-foreground mb-3">
            {aiProvider === 'openai' 
              ? 'Enter your OpenAI API key:' 
              : 'Enter your Google AI Studio API key:'
            }
          </p>
          <Input
            type="password"
            placeholder={aiProvider === 'openai' ? 'sk-...' : 'AIza...'}
            value={apiKey}
            onChange={(e) => handleApiKeyChange(e.target.value)}
            className="w-full"
          />
          <div className="text-xs text-muted-foreground mt-2 space-y-1">
            <p>Your API key is stored locally and never sent to our servers.</p>
            {aiProvider === 'gemini' && (
              <p>
                Get your free Gemini API key at{' '}
                <a 
                  href="https://aistudio.google.com/app/apikey" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="text-primary hover:underline"
                >
                  Google AI Studio
                </a>
              </p>
            )}
            {aiProvider === 'openai' && (
              <p>
                Get your OpenAI API key at{' '}
                <a 
                  href="https://platform.openai.com/api-keys" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="text-primary hover:underline"
                >
                  OpenAI Platform
                </a>
              </p>
            )}
          </div>
        </div>
      )}

      {/* Chat Messages */}
      <ScrollArea className="flex-1 px-4" ref={scrollAreaRef}>
        <div className="space-y-4 py-4">
          {messages.map((message) => (
            <div
              key={message.id}
              className={`flex items-start space-x-3 ${
                message.sender === 'user' ? 'flex-row-reverse space-x-reverse' : ''
              }`}
            >
              <div className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${
                message.sender === 'user' 
                  ? 'bg-primary text-primary-foreground' 
                  : 'bg-muted text-muted-foreground'
              }`}>
                {message.sender === 'user' ? <User className="w-4 h-4" /> : <Bot className="w-4 h-4" />}
              </div>
              
              <div className={`chat-bubble ${message.sender}`}>
                <p className="text-sm whitespace-pre-wrap">{message.text}</p>
                {message.chartData && <ChartRenderer chartData={message.chartData} />}
                <p className="text-xs opacity-60 mt-1">
                  {message.timestamp.toLocaleTimeString()}
                </p>
              </div>
            </div>
          ))}
          
          {isLoading && (
            <div className="flex items-start space-x-3">
              <div className="flex-shrink-0 w-8 h-8 rounded-full bg-muted text-muted-foreground flex items-center justify-center">
                <Bot className="w-4 h-4" />
              </div>
              <div className="chat-bubble ai">
                <div className="flex space-x-1">
                  <div className="w-2 h-2 bg-primary/60 rounded-full animate-bounce"></div>
                  <div className="w-2 h-2 bg-primary/60 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                  <div className="w-2 h-2 bg-primary/60 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                </div>
              </div>
            </div>
          )}
        </div>
      </ScrollArea>

      {/* Input Form */}
      <div className="border-t border-border p-4">
        {apiKey && (
          <div className="flex justify-end mb-2">
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={resetApiKey}
              className="text-xs text-muted-foreground hover:text-foreground"
            >
              Change API Key
            </Button>
          </div>
        )}
        <form onSubmit={handleSubmit} className="flex space-x-2">
          <Input
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            placeholder="Ask a question about your PDF..."
            disabled={isLoading || !apiKey}
            className="flex-1"
          />
          <Button 
            type="submit" 
            disabled={isLoading || !inputValue.trim() || !apiKey}
            className="btn-ocean"
          >
            <Send className="w-4 h-4" />
          </Button>
        </form>
      </div>
    </div>
  );
};