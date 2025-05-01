import { useState, useEffect } from "react";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

// Import icons from react-icons
import { SiTypescript, SiJavascript, SiPython, SiRuby, SiPhp } from "react-icons/si";
import { SiPostgresql, SiMongodb, SiMysql, SiSqlite } from "react-icons/si";
import { VscCode } from "react-icons/vsc";

interface Stack {
  id: string;
  name: string;
  db: string;
  language: string;
  framework: string;
  orm: string;
}

const STACKS: Stack[] = [
  {
    id: "ts-express",
    name: "Express.js",
    language: "TypeScript",
    db: "PostgreSQL",
    framework: "Express.js",
    orm: "Prisma",
  },
  {
    id: "ts-nest",
    name: "NestJS",
    language: "TypeScript",
    db: "PostgreSQL",
    framework: "NestJS",
    orm: "TypeORM",
  },
  {
    id: "js-express",
    name: "Express.js (JS)",
    language: "JavaScript",
    db: "MongoDB",
    framework: "Express.js",
    orm: "Mongoose",
  },
  {
    id: "python-django",
    name: "Django",
    language: "Python",
    db: "PostgreSQL",
    framework: "Django",
    orm: "Django ORM",
  },
  {
    id: "python-flask",
    name: "Flask",
    language: "Python",
    db: "SQLite",
    framework: "Flask",
    orm: "SQLAlchemy",
  },
  {
    id: "other",
    name: "Custom",
    language: "Other",
    db: "Custom",
    framework: "Custom",
    orm: "Custom",
  },
];

// Available options for custom selection
const LANGUAGES = ["TypeScript", "JavaScript", "Python", "Ruby", "PHP", "Go", "Java", "C#"];
const DATABASES = ["PostgreSQL", "MongoDB", "MySQL", "SQLite", "Redis", "DynamoDB", "Firestore"];
const ORMS = ["Prisma", "TypeORM", "Mongoose", "Sequelize", "SQLAlchemy", "Django ORM", "None"];

interface StackSelectorProps {
  selectedStack: Stack | null;
  onStackSelected: (stack: Stack) => void;
  onGenerateBundle: (stack: Stack) => void;
  isGenerating: boolean;
  isSchemaGenerated: boolean;
  isCodeGenerated: boolean;
}

export function StackSelector({
  selectedStack,
  onStackSelected,
  onGenerateBundle,
  isGenerating,
  isSchemaGenerated,
  isCodeGenerated,
}: StackSelectorProps) {
  // Group stacks by language
  const languageGroups = {
    TypeScript: STACKS.filter((stack) => stack.language === "TypeScript"),
    JavaScript: STACKS.filter((stack) => stack.language === "JavaScript"),
    Python: STACKS.filter((stack) => stack.language === "Python"),
    Other: STACKS.filter((stack) => stack.language === "Other"),
  };

  // Function to get icon by language
  const getLanguageIcon = (language: string) => {
    switch (language) {
      case "TypeScript":
        return <SiTypescript className="h-4 w-4" />;
      case "JavaScript":
        return <SiJavascript className="h-4 w-4" />;
      case "Python":
        return <SiPython className="h-4 w-4" />;
      case "Ruby":
        return <SiRuby className="h-4 w-4" />;
      case "PHP":
        return <SiPhp className="h-4 w-4" />;
      default:
        return <VscCode className="h-4 w-4" />;
    }
  };

  // Function to get icon by database
  const getDatabaseIcon = (db: string) => {
    switch (db) {
      case "PostgreSQL":
        return <SiPostgresql className="h-4 w-4" />;
      case "MongoDB":
        return <SiMongodb className="h-4 w-4" />;
      case "MySQL":
        return <SiMysql className="h-4 w-4" />;
      case "SQLite":
        return <SiSqlite className="h-4 w-4" />;
      default:
        return <VscCode className="h-4 w-4" />;
    }
  };

  // Selected language tab
  const [selectedLanguage, setSelectedLanguage] = useState<string>("TypeScript");
  
  // Custom stack state
  const [customStack, setCustomStack] = useState<{
    language: string;
    db: string;
    framework: string;
    orm: string;
  }>({
    language: "TypeScript",
    db: "PostgreSQL",
    framework: "Custom Framework",
    orm: "Prisma",
  });

  // Get stacks for the selected language
  const stacksForLanguage = languageGroups[selectedLanguage as keyof typeof languageGroups] || [];
  
  // Set initial custom values when "Custom" is selected
  useEffect(() => {
    if (selectedStack?.id === "other") {
      setCustomStack({
        language: customStack.language,
        db: customStack.db,
        framework: "Custom Framework",
        orm: customStack.orm,
      });
    }
  }, [selectedStack?.id]);

  // Update selected stack when custom options change
  useEffect(() => {
    if (selectedStack?.id === "other") {
      onStackSelected({
        ...selectedStack,
        language: customStack.language,
        db: customStack.db,
        framework: customStack.framework,
        orm: customStack.orm,
      });
    }
  }, [customStack, selectedStack?.id]);

  return (
    <div className="space-y-4">
      <div className="space-y-3">
        <h3 className="text-sm font-medium">Select Technology Stack</h3>
        
        <TooltipProvider>
          <Tabs
            defaultValue="TypeScript"
            value={selectedLanguage}
            onValueChange={setSelectedLanguage}
            className="w-full"
          >
            <TabsList className="w-full grid grid-cols-4">
              {Object.keys(languageGroups).map((language) => (
                <Tooltip key={language}>
                  <TooltipTrigger asChild>
                    <TabsTrigger value={language} className="flex items-center justify-center">
                      {getLanguageIcon(language)}
                      <span className="sr-only">{language}</span>
                    </TabsTrigger>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>{language}</p>
                  </TooltipContent>
                </Tooltip>
              ))}
            </TabsList>
          </Tabs>
        </TooltipProvider>

        <ToggleGroup
          type="single"
          value={selectedStack?.id || ""}
          onValueChange={(value) => {
            if (value) {
              const stack = STACKS.find((s) => s.id === value);
              if (stack) {
                onStackSelected(stack);
              }
            }
          }}
          className="justify-start flex-wrap gap-2"
        >
          {stacksForLanguage.map((stack) => (
            <ToggleGroupItem
              key={stack.id}
              value={stack.id}
              aria-label={stack.name}
              className="data-[state=on]:bg-primary data-[state=on]:text-primary-foreground px-3 py-1.5 text-xs rounded-full"
            >
              {stack.name}
            </ToggleGroupItem>
          ))}
        </ToggleGroup>
      </div>

      {selectedStack && (
        <div className="space-y-3">
          {selectedStack.id === "other" ? (
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1">
                  <p className="text-xs text-muted-foreground">Language</p>
                  <Select 
                    value={customStack.language} 
                    onValueChange={(value) => {
                      const newStack = {...customStack, language: value};
                      setCustomStack(newStack);
                      onStackSelected({
                        id: "other",
                        name: "Custom Stack",
                        language: newStack.language,
                        db: newStack.db,
                        framework: newStack.framework,
                        orm: newStack.orm
                      });
                    }}
                  >
                    <SelectTrigger className="text-xs h-8">
                      <SelectValue placeholder="Select Language" />
                    </SelectTrigger>
                    <SelectContent>
                      {LANGUAGES.map((lang) => (
                        <SelectItem key={lang} value={lang} className="text-xs">
                          <div className="flex items-center">
                            {getLanguageIcon(lang)}
                            <span className="ml-2">{lang}</span>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <p className="text-xs text-muted-foreground">Database</p>
                  <Select 
                    value={customStack.db} 
                    onValueChange={(value) => {
                      const newStack = {...customStack, db: value};
                      setCustomStack(newStack);
                      onStackSelected({
                        id: "other",
                        name: "Custom Stack",
                        language: newStack.language,
                        db: newStack.db,
                        framework: newStack.framework,
                        orm: newStack.orm
                      });
                    }}
                  >
                    <SelectTrigger className="text-xs h-8">
                      <SelectValue placeholder="Select Database" />
                    </SelectTrigger>
                    <SelectContent>
                      {DATABASES.map((db) => (
                        <SelectItem key={db} value={db} className="text-xs">
                          <div className="flex items-center">
                            {getDatabaseIcon(db)}
                            <span className="ml-2">{db}</span>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1">
                  <p className="text-xs text-muted-foreground">Framework</p>
                  <input
                    type="text"
                    value={customStack.framework}
                    onChange={(e) => {
                      const newStack = {...customStack, framework: e.target.value};
                      setCustomStack(newStack);
                      onStackSelected({
                        id: "other",
                        name: "Custom Stack",
                        language: newStack.language,
                        db: newStack.db,
                        framework: newStack.framework,
                        orm: newStack.orm
                      });
                    }}
                    className="w-full h-8 px-3 py-1 text-xs rounded-md border border-input bg-transparent focus:outline-none focus:ring-2 focus:ring-ring"
                  />
                </div>
                <div className="space-y-1">
                  <p className="text-xs text-muted-foreground">ORM</p>
                  <Select 
                    value={customStack.orm} 
                    onValueChange={(value) => {
                      const newStack = {...customStack, orm: value};
                      setCustomStack(newStack);
                      onStackSelected({
                        id: "other",
                        name: "Custom Stack",
                        language: newStack.language,
                        db: newStack.db,
                        framework: newStack.framework,
                        orm: newStack.orm
                      });
                    }}
                  >
                    <SelectTrigger className="text-xs h-8">
                      <SelectValue placeholder="Select ORM" />
                    </SelectTrigger>
                    <SelectContent>
                      {ORMS.map((orm) => (
                        <SelectItem key={orm} value={orm} className="text-xs">
                          {orm}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1">
                <p className="text-xs text-muted-foreground">Database</p>
                <p className="text-sm font-medium">{selectedStack.db}</p>
              </div>
              <div className="space-y-1">
                <p className="text-xs text-muted-foreground">ORM</p>
                <p className="text-sm font-medium">{selectedStack.orm}</p>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
