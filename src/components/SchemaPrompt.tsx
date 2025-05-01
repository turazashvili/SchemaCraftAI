import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { generateSchema } from "@/services/aiSchemaService";
import { Loader2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { ChevronDown } from "lucide-react";

interface SchemaPromptProps {
  onGenerate: (schema: any | null, apiKey?: string) => void;
  isGenerating: boolean;
}

export function SchemaPrompt({ onGenerate, isGenerating }: SchemaPromptProps) {
  const [prompt, setPrompt] = useState("");
  const [apiKey, setApiKey] = useState("");
  const [showApiKeyInput, setShowApiKeyInput] = useState(false);
  const [localLoading, setLocalLoading] = useState(false);
  const { toast } = useToast();
  const isSubmitting = useRef(false);
  
  // Load API key from localStorage on component mount
  useEffect(() => {
    const savedApiKey = localStorage.getItem("schema-craft-openai-key");
    if (savedApiKey) {
      setApiKey(savedApiKey);
      setShowApiKeyInput(true);
    }
  }, []);

  const handleGenerateSchema = async () => {
    // Prevent execution if already generating or local loading
    if (isGenerating || localLoading || isSubmitting.current) {
      return;
    }

    if (!prompt.trim()) {
      toast({
        title: "Error",
        description: "Please enter a schema description",
        variant: "destructive",
      });
      return;
    }

    if (showApiKeyInput && !apiKey.trim()) {
      toast({
        title: "Error",
        description: "Please enter your OpenAI API key",
        variant: "destructive",
      });
      return;
    }

    // Set local loading state immediately to prevent multiple clicks
    setLocalLoading(true);
    isSubmitting.current = true;

    try {
      // Save API key to localStorage if provided
      if (apiKey.trim()) {
        localStorage.setItem("schema-craft-openai-key", apiKey);
      }
      
      // Call our AI service to generate a schema from the prompt
      const generatedSchema = await generateSchema(prompt, apiKey);
      
      // Pass both the schema and API key to the parent component
      onGenerate(generatedSchema, showApiKeyInput ? apiKey : undefined);
      
      toast({
        title: "Schema generated!",
        description: "Your schema has been created based on your description.",
        variant: "default",
      });
    } catch (error) {
      console.error("Error generating schema:", error);
      // Notify the parent component about the error to reset isGenerating
      onGenerate(null, showApiKeyInput ? apiKey : undefined);
      
      toast({
        title: "Error",
        description: "Failed to generate schema. Please try again.",
        variant: "destructive",
      });
    } finally {
      // Reset local loading state
      setLocalLoading(false);
      setTimeout(() => {
        isSubmitting.current = false;
      }, 500);
    }
  };

  // Local combined loading state
  const isButtonDisabled = isGenerating || localLoading || !prompt.trim() || isSubmitting.current;
  const isInputDisabled = isGenerating || localLoading || isSubmitting.current;

  return (
    <div className="space-y-4">
      <div>
        <p className="text-sm text-muted-foreground mb-2">
          Describe your database using natural language
        </p>
        <Textarea
          placeholder="Example: Create a blog database with users, posts, and comments..."
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          className="min-h-32 font-mono text-sm"
          disabled={isInputDisabled}
        />
      </div>

      <Collapsible>
        <div className="flex items-center justify-between">
          <CollapsibleTrigger asChild>
            <Button variant="ghost" size="sm" className="p-0 h-7" disabled={isInputDisabled}>
              <ChevronDown className="h-4 w-4 mr-1" />
              <span className="text-xs">API Key Settings</span>
            </Button>
          </CollapsibleTrigger>
        </div>
        <CollapsibleContent className="mt-2">
          <div className="space-y-2">
            <Label htmlFor="apiKey" className="text-xs">OpenAI API Key</Label>
            <Input
              id="apiKey"
              type="password"
              value={apiKey}
              onChange={(e) => {
                setApiKey(e.target.value);
                setShowApiKeyInput(true);
              }}
              placeholder="Enter your OpenAI API key"
              className="font-mono text-xs h-8"
              disabled={isInputDisabled}
            />
            <p className="text-xs text-muted-foreground">
              Your API key is required for custom schema generation
            </p>
          </div>
        </CollapsibleContent>
      </Collapsible>

      <Button 
        onClick={handleGenerateSchema} 
        disabled={isButtonDisabled}
        size="sm"
        className="w-full"
      >
        {(isGenerating || localLoading) ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Generating...
          </>
        ) : (
          "Generate Schema"
        )}
      </Button>
    </div>
  );
}
