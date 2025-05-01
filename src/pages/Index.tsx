import { useState, useEffect } from "react";
import { ReactFlowProvider } from "reactflow";
import "reactflow/dist/style.css";

import { Header } from "@/components/Header";
import { SchemaCanvas } from "@/components/SchemaCanvas";
import { CodePreview } from "@/components/CodePreview";
import { useToast } from "@/hooks/use-toast";
import { SchemaDefinition } from "@/services/aiSchemaService";
import { SidebarProvider } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/AppSidebar";

interface Stack {
  id: string;
  name: string;
  db: string;
  language: string;
  framework: string;
  orm: string;
}

const Index = () => {
  const [schema, setSchema] = useState<SchemaDefinition | null>(null);
  const [apiKey, setApiKey] = useState<string | undefined>(undefined);
  const [isGenerating, setIsGenerating] = useState(false);
  const [selectedStack, setSelectedStack] = useState<Stack | null>(null);
  const [isSchemaGenerated, setIsSchemaGenerated] = useState(false);
  const [isCodeGenerated, setIsCodeGenerated] = useState(false);
  const [activeTab, setActiveTab] = useState<"schema" | "code">("schema");
  const { toast } = useToast();
  
  // Load initial state based on localStorage if available
  useEffect(() => {
    const savedApiKey = localStorage.getItem("schema-craft-openai-key");
    if (savedApiKey) {
      setApiKey(savedApiKey);
    }
  }, []);

  const handleGenerateSchema = async (generatedSchema: SchemaDefinition | null, openAiKey?: string) => {
    try {
      setIsGenerating(true);
      
      // Handle error case where schema is null
      if (generatedSchema === null) {
        setIsGenerating(false);
        return;
      }
      
      if (openAiKey) {
        // Save API key to localStorage
        localStorage.setItem("schema-craft-openai-key", openAiKey);
        setApiKey(openAiKey);
      }
      
      // Short timeout to simulate processing
      setTimeout(() => {
        setSchema(generatedSchema);
        setIsSchemaGenerated(true);
        setIsGenerating(false);
      }, 500);
    } catch (error) {
      console.error("Error in handleGenerateSchema:", error);
      toast({
        title: "Error",
        description: "Failed to process the generated schema",
        variant: "destructive",
      });
      setIsGenerating(false);
    }
  };

  const handleSaveSchema = (updatedSchema: SchemaDefinition) => {
    setSchema(updatedSchema);

  };

  const handleStackSelected = (stack: Stack) => {
    setSelectedStack(stack);
  };

  const handleGenerateBundle = (stack: Stack) => {
    if (!stack) return;
    
    // Switch to code tab but don't automatically generate
    setActiveTab("code");
  };

  const handleDownloadBundle = () => {
    // Download logic is handled in CodePreview component
    toast({
      title: "Downloading bundle",
      description: "Preparing your code bundle for download",
    });
  };

  return (
    <div className="flex min-h-screen flex-col dark:bg-gray-900">
      <Header 
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        isSchemaGenerated={isSchemaGenerated}
      />
      
      <div className="flex flex-1 overflow-hidden">
        <SidebarProvider defaultOpen={true} open={true}>
          <AppSidebar 
            isGenerating={isGenerating}
            isSchemaGenerated={isSchemaGenerated}
            selectedStack={selectedStack}
            onGenerate={handleGenerateSchema}
            onStackSelected={handleStackSelected}
            onGenerateBundle={handleGenerateBundle}
            onDownload={handleDownloadBundle}
            isCodeGenerated={isCodeGenerated}
            activeTab={activeTab}
            setActiveTab={setActiveTab}
          />
          
          <main className="flex flex-1 flex-col overflow-hidden p-4">
            {activeTab === "schema" ? (
              <div className="h-full w-full rounded-md border">
                <ReactFlowProvider>
                  <SchemaCanvas 
                    schema={schema} 
                    onSave={handleSaveSchema} 
                  />
                </ReactFlowProvider>
              </div>
            ) : (
              <div className="h-full w-full overflow-hidden">
                <CodePreview 
                  stack={selectedStack} 
                  schema={schema}
                  apiKey={apiKey}
                  isCodeGenerated={isCodeGenerated}
                  onGenerateCode={() => setIsCodeGenerated(true)}
                />
              </div>
            )}
          </main>
        </SidebarProvider>
      </div>
    </div>
  );
}

export default Index;
