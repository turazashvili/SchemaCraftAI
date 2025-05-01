import { Button } from "@/components/ui/button";
import { useTheme } from "@/hooks/use-theme";
import { Moon, Sun, Github } from "lucide-react";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

interface HeaderProps {
  activeTab: "schema" | "code";
  setActiveTab: (tab: "schema" | "code") => void;
  isSchemaGenerated: boolean;
}

export function Header({ activeTab, setActiveTab, isSchemaGenerated }: HeaderProps) {
  const { theme, setTheme } = useTheme();
  
  return (
    <header className="sticky top-0 z-10 w-full border-b bg-background/95 backdrop-blur">
      <div className="container flex h-16 items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="text-2xl font-bold">
            <span className="text-primary">Schema</span>
            <span>Craft</span>
          </div>
          <div className="rounded-full bg-primary/10 px-2 py-0.5 text-xs text-primary">
            MVP
          </div>
        </div>

        <div className="flex items-center gap-4">
          {isSchemaGenerated && (
            <ToggleGroup type="single" value={activeTab} onValueChange={(value) => value && setActiveTab(value as "schema" | "code")}>
              <ToggleGroupItem value="schema" aria-label="Toggle schema view">
                Schema
              </ToggleGroupItem>
              <ToggleGroupItem value="code" aria-label="Toggle code view">
                Code
              </ToggleGroupItem>
            </ToggleGroup>
          )}

          <Tooltip>
            <TooltipTrigger asChild>
              <Button 
                variant="ghost" 
                size="icon" 
                onClick={() => window.open("https://github.com/turazashvili", "_blank")}
                aria-label="Creator's GitHub"
              >
                <Github className="h-5 w-5" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              <p>Created by Nikoloz Turazashvili</p>
            </TooltipContent>
          </Tooltip>

          <Button 
            variant="ghost" 
            size="icon" 
            onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
            aria-label="Toggle theme"
          >
            {theme === "dark" ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
          </Button>
        </div>
      </div>
    </header>
  );
}
