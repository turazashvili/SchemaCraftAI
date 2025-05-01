import { useToast } from "@/hooks/use-toast";

// Define the structure for our AI-generated schema
export interface SchemaField {
  name: string;
  type: string;
  primaryKey?: boolean;
  unique?: boolean;
  foreignKey?: {
    entity: string;
    field: string;
  };
}

export interface SchemaEntity {
  name: string;
  fields: SchemaField[];
  position?: { x: number; y: number };
}

export interface SchemaRelationship {
  from: {
    entity: string;
    field: string;
  };
  to: {
    entity: string;
    field: string;
  };
}

export interface SchemaDefinition {
  entities: SchemaEntity[];
  relationships: SchemaRelationship[];
}

// System prompt to guide the AI response format
// Enhanced system prompt for PRODUCTION-GRADE schemas
const systemPrompt = `
You are an **enterprise-level database architect**.  
Your task is to design a **production-ready relational schema** from the user's description.

────────────────────────────────────────────────
OUTPUT RULES
────────────────────────────────────────────────
• Return **only** valid JSON that conforms **exactly** to this structure  
  (no extra keys, comments, or markdown wrappers):

{
  "entities": [ { "name": "", "fields": [ { "name": "", "type": "", "primaryKey": bool, "unique": bool, "foreignKey": { "entity": "", "field": "" } } ] } ],
  "relationships": [ { "from": { "entity": "", "field": "" }, "to": { "entity": "", "field": "" } } ]
}

• Allowed data types: string, text, integer, float, boolean, date, timestamp, uuid, json, decimal.  
• Use **plural, snake_case names** for entities (e.g. "users", "order_items").  
• Every entity must have a primary key named **"id"** of type **uuid**.
• Include **created_at**, **updated_at**, and **deleted_at** (nullable soft-delete) timestamps on every table unless the user description clearly says otherwise.

────────────────────────────────────────────────
DESIGN GUIDELINES – THINK LIKE A REAL-WORLD SYSTEM
────────────────────────────────────────────────
1. **Domain Coverage**  
   – Identify all core business objects **and** the supporting subsystems a production app needs:  
     • **Auth**: users, sessions / refresh_tokens, roles, permissions, user_roles, role_permissions.  
     • **Config & tenancy** (if multi-tenant hinted): organizations / projects, membership tables, settings.  
     • **Auditability & observability**: audit_logs (who/when/what), event_logs / webhooks, schema_versions.  
     • **Content & assets**: files, media, comments, tags, revisions / versioning where appropriate.  
     • **Payments & billing** (if e-commerce or SaaS): products, prices, subscriptions, invoices, payment_methods.  
     • **Notifications**: notifications, notification_preferences.  
     • **Feature flags / AB tests** where needed.

2. **Relations & Integrity**  
   – Use foreignKey objects for every reference.  
   – Add **join tables** for many-to-many relations (e.g. "project_members").  
   – Ensure uniqueness where business logic demands (email, slug, external_id, etc.).

3. **Scalability Patterns**  
   – For status / enums, prefer a string field ("status") unless a dedicated table is justified.  
   – For polymorphic references, use separate tables or clearly state the design in field names (e.g. commentable_id + commentable_type).

4. **Security & Compliance**  
   – Never store plain passwords; assume hashed_password in users.  
   – Include ip_address / user_agent on sessions and audit_logs.  
   – If sensitive data is mentioned, add a "encrypted_" prefix field.

5. **Clarity & Maintainability**  
   – Keep field names concise yet descriptive.  
   – Group related tables (prefix with the domain if helpful, e.g. "billing_invoices").  
   – Prefer consistent naming for foreign keys: singular target + "_id".

────────────────────────────────────────────────
EXAMPLE MINI-SNIPPET (illustrative only – do not output this):
{
  "entities":[
    { "name":"users", "fields":[
        {"name":"id","type":"uuid","primaryKey":true},
        {"name":"email","type":"string","unique":true},
        {"name":"hashed_password","type":"string"},
        {"name":"created_at","type":"timestamp"},
        {"name":"updated_at","type":"timestamp"},
        {"name":"deleted_at","type":"timestamp"}
    ]}
  ],
  "relationships":[
    { "from":{"entity":"sessions","field":"user_id"}, "to":{"entity":"users","field":"id"} }
  ]
}

────────────────────────────────────────────────
PROCESS
────────────────────────────────────────────────
1. Read the user prompt carefully; extract domain nouns & actions.  
2. List all entities and support tables needed for a **full-featured, secure, auditable** product.  
3. Build the JSON exactly as specified and return it.  
4. Validate your JSON before responding – it must parse without edits.
`;


// Add at the top of file
let pendingRequest = false;

/**
 * Processes a natural language prompt and returns a structured schema definition
 */
export async function generateSchema(prompt: string, apiKey?: string): Promise<SchemaDefinition> {
  // Prevent multiple simultaneous requests
  if (pendingRequest) {
    console.log("Ignoring duplicate request - already processing a schema generation request");
    throw new Error("Another request is already in progress. Please wait.");
  }
  
  try {
    pendingRequest = true;
    
    // If we have an API key, use OpenAI API
    if (apiKey) {
      return await callOpenAI(prompt, apiKey);
    }
    
    // Otherwise use our mock implementation
    console.log("Using mock implementation (no API key provided)");
    console.log("Sending prompt to AI:", prompt);
    console.log("Using system prompt:", systemPrompt);
    
    // Simulate API call delay
    await new Promise(resolve => setTimeout(resolve, 1500));
    
    // Return a mock schema based on the prompt
    return processPromptToSchema(prompt);
  } catch (error) {
    console.error("Error generating schema:", error);
    throw new Error("Failed to generate schema from prompt");
  } finally {
    // Reset the flag after processing is done
    pendingRequest = false;
  }
}

/**
 * Call OpenAI API to generate a schema based on the prompt
 */
async function callOpenAI(prompt: string, apiKey: string): Promise<SchemaDefinition> {
  try {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: "gpt-4o",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: prompt }
        ],
        temperature: 0.7,
        max_tokens: 3000
      })
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error?.message || 'Error calling OpenAI API');
    }

    const data = await response.json();
    const content = data.choices[0].message.content;
    
    // Extract JSON from the response
    try {
      // Attempt to extract JSON if it's wrapped in markdown code blocks
      const jsonMatch = content.match(/```(?:json)?([\s\S]*?)```/);
      const jsonString = jsonMatch ? jsonMatch[1].trim() : content.trim();
      const schema = JSON.parse(jsonString);
      
      // Validate the schema has the expected structure
      if (!schema.entities || !Array.isArray(schema.entities)) {
        throw new Error('Invalid schema format: entities array is missing');
      }
      
      return schema;
    } catch (parseError) {
      console.error('Failed to parse OpenAI response:', parseError);
      throw new Error('Failed to parse schema from AI response');
    }
  } catch (error) {
    console.error('OpenAI API error:', error);
    throw error;
  }
}

/**
 * Mock implementation that simulates AI processing
 * In production, this would be replaced with a call to an actual AI API
 */
function processPromptToSchema(prompt: string): SchemaDefinition {
  // Basic keyword matching for demo purposes
  const lowercasePrompt = prompt.toLowerCase();
  
  if (lowercasePrompt.includes("blog")) {
    return getBlogSchema();
  } else if (lowercasePrompt.includes("ecommerce") || lowercasePrompt.includes("e-commerce") || lowercasePrompt.includes("shop")) {
    return getEcommerceSchema();
  } else if (lowercasePrompt.includes("task") || lowercasePrompt.includes("todo")) {
    return getTaskManagerSchema();
  }
  
  // Default schema if no keywords match
  return getDefaultSchema();
}

function getBlogSchema(): SchemaDefinition {
  return {
    entities: [
      {
        name: "users",
        fields: [
          { name: "id", type: "uuid", primaryKey: true },
          { name: "email", type: "string", unique: true },
          { name: "name", type: "string" },
          { name: "created_at", type: "timestamp" }
        ]
      },
      {
        name: "posts",
        fields: [
          { name: "id", type: "uuid", primaryKey: true },
          { name: "title", type: "string" },
          { name: "content", type: "text" },
          { name: "user_id", type: "uuid", foreignKey: { entity: "users", field: "id" } },
          { name: "published", type: "boolean" },
          { name: "created_at", type: "timestamp" }
        ]
      },
      {
        name: "comments",
        fields: [
          { name: "id", type: "uuid", primaryKey: true },
          { name: "content", type: "text" },
          { name: "user_id", type: "uuid", foreignKey: { entity: "users", field: "id" } },
          { name: "post_id", type: "uuid", foreignKey: { entity: "posts", field: "id" } },
          { name: "created_at", type: "timestamp" }
        ]
      }
    ],
    relationships: [
      { from: { entity: "posts", field: "user_id" }, to: { entity: "users", field: "id" } },
      { from: { entity: "comments", field: "user_id" }, to: { entity: "users", field: "id" } },
      { from: { entity: "comments", field: "post_id" }, to: { entity: "posts", field: "id" } }
    ]
  };
}

function getEcommerceSchema(): SchemaDefinition {
  return {
    entities: [
      {
        name: "users",
        fields: [
          { name: "id", type: "uuid", primaryKey: true },
          { name: "email", type: "string", unique: true },
          { name: "name", type: "string" },
          { name: "address", type: "string" },
          { name: "created_at", type: "timestamp" }
        ]
      },
      {
        name: "products",
        fields: [
          { name: "id", type: "uuid", primaryKey: true },
          { name: "name", type: "string" },
          { name: "description", type: "text" },
          { name: "price", type: "float" },
          { name: "stock", type: "integer" },
          { name: "created_at", type: "timestamp" }
        ]
      },
      {
        name: "orders",
        fields: [
          { name: "id", type: "uuid", primaryKey: true },
          { name: "user_id", type: "uuid", foreignKey: { entity: "users", field: "id" } },
          { name: "status", type: "string" },
          { name: "total", type: "float" },
          { name: "created_at", type: "timestamp" }
        ]
      },
      {
        name: "order_items",
        fields: [
          { name: "id", type: "uuid", primaryKey: true },
          { name: "order_id", type: "uuid", foreignKey: { entity: "orders", field: "id" } },
          { name: "product_id", type: "uuid", foreignKey: { entity: "products", field: "id" } },
          { name: "quantity", type: "integer" },
          { name: "price", type: "float" }
        ]
      }
    ],
    relationships: [
      { from: { entity: "orders", field: "user_id" }, to: { entity: "users", field: "id" } },
      { from: { entity: "order_items", field: "order_id" }, to: { entity: "orders", field: "id" } },
      { from: { entity: "order_items", field: "product_id" }, to: { entity: "products", field: "id" } }
    ]
  };
}

function getTaskManagerSchema(): SchemaDefinition {
  return {
    entities: [
      {
        name: "users",
        fields: [
          { name: "id", type: "uuid", primaryKey: true },
          { name: "email", type: "string", unique: true },
          { name: "name", type: "string" },
          { name: "created_at", type: "timestamp" }
        ]
      },
      {
        name: "tasks",
        fields: [
          { name: "id", type: "uuid", primaryKey: true },
          { name: "title", type: "string" },
          { name: "description", type: "text" },
          { name: "status", type: "string" },
          { name: "due_date", type: "date" },
          { name: "user_id", type: "uuid", foreignKey: { entity: "users", field: "id" } },
          { name: "created_at", type: "timestamp" }
        ]
      },
      {
        name: "tags",
        fields: [
          { name: "id", type: "uuid", primaryKey: true },
          { name: "name", type: "string", unique: true },
          { name: "color", type: "string" }
        ]
      },
      {
        name: "task_tags",
        fields: [
          { name: "task_id", type: "uuid", foreignKey: { entity: "tasks", field: "id" }, primaryKey: true },
          { name: "tag_id", type: "uuid", foreignKey: { entity: "tags", field: "id" }, primaryKey: true }
        ]
      }
    ],
    relationships: [
      { from: { entity: "tasks", field: "user_id" }, to: { entity: "users", field: "id" } },
      { from: { entity: "task_tags", field: "task_id" }, to: { entity: "tasks", field: "id" } },
      { from: { entity: "task_tags", field: "tag_id" }, to: { entity: "tags", field: "id" } }
    ]
  };
}

function getDefaultSchema(): SchemaDefinition {
  // Simple generic schema if the prompt doesn't match known patterns
  return {
    entities: [
      {
        name: "users",
        fields: [
          { name: "id", type: "uuid", primaryKey: true },
          { name: "email", type: "string", unique: true },
          { name: "name", type: "string" },
          { name: "created_at", type: "timestamp" }
        ]
      },
      {
        name: "items",
        fields: [
          { name: "id", type: "uuid", primaryKey: true },
          { name: "name", type: "string" },
          { name: "description", type: "text" },
          { name: "user_id", type: "uuid", foreignKey: { entity: "users", field: "id" } },
          { name: "created_at", type: "timestamp" }
        ]
      }
    ],
    relationships: [
      { from: { entity: "items", field: "user_id" }, to: { entity: "users", field: "id" } }
    ]
  };
}
