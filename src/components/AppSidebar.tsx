import { useState } from "react";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
} from "@/components/ui/sidebar";
import { SchemaPrompt } from "@/components/SchemaPrompt";
import { StackSelector } from "@/components/StackSelector";
import { Button } from "@/components/ui/button";
import { Download } from "lucide-react";

interface AppSidebarProps {
  isGenerating: boolean;
  isSchemaGenerated: boolean;
  selectedStack: any;
  onGenerate: (schema: any, apiKey?: string) => void;
  onStackSelected: (stack: any) => void;
  onGenerateBundle: (stack: any) => void;
  onDownload: () => void;
  isCodeGenerated: boolean;
  activeTab: "schema" | "code";
  setActiveTab: (tab: "schema" | "code") => void;
}

export function AppSidebar({
  isGenerating,
  isSchemaGenerated,
  selectedStack,
  onGenerate,
  onStackSelected,
  onGenerateBundle,
  onDownload,
  isCodeGenerated,
  activeTab,
  setActiveTab,
}: AppSidebarProps) {
  return (
    <Sidebar collapsible="none">

      
      <SidebarContent>
        {activeTab === "schema" ? (
          <SidebarGroup>
            <SidebarGroupLabel>Design Schema</SidebarGroupLabel>
            <SidebarGroupContent>
              <SchemaPrompt onGenerate={onGenerate} isGenerating={isGenerating} />
            </SidebarGroupContent>
          </SidebarGroup>
        ) : (
          <>
            <SidebarGroup>
              <SidebarGroupLabel>Choose Tech Stack</SidebarGroupLabel>
              <SidebarGroupContent>
                <StackSelector 
                  onStackSelected={onStackSelected}
                  onGenerateBundle={onGenerateBundle}
                  selectedStack={selectedStack}
                  isGenerating={isGenerating}
                  isSchemaGenerated={isSchemaGenerated}
                  isCodeGenerated={isCodeGenerated}
                />
              </SidebarGroupContent>
            </SidebarGroup>
          </>
        )}
      </SidebarContent>
      
      <SidebarFooter>
        <div className="px-3 py-2 text-xs text-muted-foreground">
          SchemaCraft • Database schema generation made easy
        </div>
      </SidebarFooter>
    </Sidebar>
  );
}
