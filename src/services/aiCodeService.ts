import { SchemaDefinition } from "@/services/aiSchemaService";

export interface CodeBundle {
  model: string;
  router: string;
  schema: string;
  [key: string]: string; // Allow for additional code files
}

export interface TechStack {
  id: string;
  name: string;
  db: string;
  language: string;
  framework: string;
  orm: string;
}

// System prompt to guide the AI response format for code generation
const systemPrompt = `
You are a code generator assistant. Generate code for a backend application based on the provided database schema and technology stack.

IMPORTANT: Format your response as a single valid JSON object with the following structure:
{
  "model": "// Your actual model code here",
  "router": "// Your actual router code here",
  "schema": "// Your actual schema definition code here"
}

DO NOT include any markdown code blocks, explanations, or additional text outside of this JSON structure.
DO NOT repeat or nest the JSON structure.
Provide complete and functional code for each section, not placeholders.

Follow these guidelines:
1. Use proper syntax for the specified language and framework
2. Include appropriate imports and dependencies
3. Implement standard CRUD operations
4. Use proper error handling and best practices
5. Add helpful comments to explain complex logic
6. Format code with proper indentation
`;

/**
 * Processes a schema definition and tech stack and returns a code bundle
 */
export async function generateCode(
  schema: SchemaDefinition,
  stack: TechStack,
  apiKey?: string
): Promise<CodeBundle> {
  try {
    // If we have an API key, use OpenAI API
    if (apiKey) {
      return await callOpenAI(schema, stack, apiKey);
    }
    
    console.log("Using mock implementation (no API key provided)");
    console.log("Generating code for stack:", stack);
    
    // Simulate API call delay
    await new Promise(resolve => setTimeout(resolve, 1500));
    
    // Return mock code based on the schema and stack
    return getMockCodeForStack(schema, stack);
  } catch (error) {
    console.error("Error generating code:", error);
    throw new Error("Failed to generate code from schema and stack");
  }
}

/**
 * Call OpenAI API to generate code based on the schema and tech stack
 */
async function callOpenAI(
  schema: SchemaDefinition,
  stack: TechStack,
  apiKey: string
): Promise<CodeBundle> {
  try {
    const prompt = `
Generate code for a ${stack.framework} application using ${stack.language} and ${stack.orm} that implements the following database schema:

${JSON.stringify(schema, null, 2)}

The application should connect to a ${stack.db} database.
Please include model definitions, router/controller implementations, and database schema code.
`;

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
        temperature: 0.2,
        max_tokens: 4000
      })
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error?.message || 'Error calling OpenAI API');
    }

    const data = await response.json();
    const content = data.choices[0].message.content;
    
    console.log("OpenAI raw response:", content);
    
    // Improved JSON parsing strategy
    try {
      // First, try direct JSON parsing
      try {
        const parsedResponse = JSON.parse(content.trim());
        console.log("Successfully parsed JSON response directly", parsedResponse);
        return parsedResponse;
      } catch (directError) {
        console.log("Direct JSON parsing failed, trying alternative approaches");
        
        // Extract JSON from markdown code blocks if present
        const jsonMatch = content.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
        if (jsonMatch) {
          const jsonContent = jsonMatch[1].trim();
          try {
            const parsedFromCodeBlock = JSON.parse(jsonContent);
            console.log("Successfully parsed JSON from code block", parsedFromCodeBlock);
            return parsedFromCodeBlock;
          } catch (blockError) {
            console.error("Failed to parse JSON from code block:", blockError);
          }
        }
        
        // Try to extract JSON object pattern from the text
        const jsonObjectMatch = content.match(/\{\s*"model"\s*:\s*"([\s\S]*?)"\s*,\s*"router"\s*:\s*"([\s\S]*?)"\s*,\s*"schema"\s*:\s*"([\s\S]*?)"\s*\}/);
        if (jsonObjectMatch) {
          const extractedJson = {
            model: jsonObjectMatch[1].replace(/\\"/g, '"').replace(/\\n/g, '\n'),
            router: jsonObjectMatch[2].replace(/\\"/g, '"').replace(/\\n/g, '\n'),
            schema: jsonObjectMatch[3].replace(/\\"/g, '"').replace(/\\n/g, '\n')
          };
          console.log("Extracted JSON object from text pattern", extractedJson);
          return extractedJson;
        }
        
        // If nothing works, try a regex pattern to extract each section
        const modelMatch = content.match(/["']model["']\s*:\s*["']([\s\S]*?)["']/);
        const routerMatch = content.match(/["']router["']\s*:\s*["']([\s\S]*?)["']/);
        const schemaMatch = content.match(/["']schema["']\s*:\s*["']([\s\S]*?)["']/);
        
        if (modelMatch && routerMatch && schemaMatch) {
          const fallbackExtraction = {
            model: modelMatch[1].replace(/\\"/g, '"').replace(/\\n/g, '\n'),
            router: routerMatch[1].replace(/\\"/g, '"').replace(/\\n/g, '\n'),
            schema: schemaMatch[1].replace(/\\"/g, '"').replace(/\\n/g, '\n')
          };
          console.log("Used fallback regex extraction for each section", fallbackExtraction);
          return fallbackExtraction;
        }
        
        // Last resort - check if the format is Python triple-quoted strings
        const tripleQuoteMatch = content.match(/\{\s*"model"\s*:\s*"""\s*([\s\S]*?)\s*"""\s*,\s*"router"\s*:\s*"""\s*([\s\S]*?)\s*"""\s*,\s*"schema"\s*:\s*"""\s*([\s\S]*?)\s*"""\s*\}/);
        if (tripleQuoteMatch) {
          const pythonStyleExtraction = {
            model: tripleQuoteMatch[1],
            router: tripleQuoteMatch[2],
            schema: tripleQuoteMatch[3]
          };
          console.log("Extracted Python-style triple-quoted strings", pythonStyleExtraction);
          return pythonStyleExtraction;
        }
      }
      
      // If all parsing attempts fail
      console.error("All parsing attempts failed, returning fallback code");
      return {
        model: "// Failed to parse model code from AI response",
        router: "// Failed to parse router code from AI response",
        schema: "// Failed to parse schema code from AI response"
      };
    } catch (parseError) {
      console.error('Failed to parse OpenAI response:', parseError);
      console.error('Raw content:', content);
      throw new Error('Failed to parse code from AI response');
    }
  } catch (error) {
    console.error('OpenAI API error:', error);
    throw error;
  }
}

/**
 * Generate mock code based on the schema and tech stack
 */
function getMockCodeForStack(schema: SchemaDefinition, stack: TechStack): CodeBundle {
  const entityNames = schema.entities.map(e => e.name);
  
  // TypeScript + Node.js (Express, NestJS, Fastify) with Prisma
  if (stack.language === "TypeScript" && stack.orm === "Prisma v5") {
    return generateTypescriptPrismaCode(schema, stack);
  }
  
  // JavaScript + Node.js with Mongoose
  if (stack.language === "JavaScript" && stack.orm === "Mongoose 8") {
    return generateJavascriptMongooseCode(schema, stack);
  }
  
  // Python (FastAPI, Flask) with SQLModel
  if (stack.language === "Python 3.12" && stack.orm === "SQLModel") {
    return generatePythonSQLModelCode(schema, stack);
  }
  
  // PHP Laravel with Eloquent
  if (stack.language === "PHP 8.3" && stack.orm === "Eloquent") {
    return generatePHPLaravelCode(schema, stack);
  }
  
  // Default fallback - basic TypeScript code
  return generateTypescriptPrismaCode(schema, stack);
}

function generateTypescriptPrismaCode(schema: SchemaDefinition, stack: TechStack): CodeBundle {
  // Get the first entity in the schema for the example code
  const mainEntity = schema.entities[0];
  const entityName = mainEntity?.name || "users";
  const singularName = entityName.endsWith('s') 
    ? entityName.slice(0, -1) 
    : entityName;
  const capitalizedName = singularName.charAt(0).toUpperCase() + singularName.slice(1);
  
  const schemaCode = generatePrismaSchema(schema);
  
  // Generate model code
  const modelCode = `// src/models/${singularName}.model.ts
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export interface ${capitalizedName} {
${mainEntity?.fields.map(field => `  ${field.name}: ${getPrismaTypeMapping(field.type)};`).join('\n')}
}

export const ${capitalizedName}Model = {
  findAll: async (): Promise<${capitalizedName}[]> => {
    return prisma.${singularName}.findMany();
  },
  
  findById: async (id: string): Promise<${capitalizedName} | null> => {
    return prisma.${singularName}.findUnique({
      where: { id },
    });
  },
  
  create: async (data: Omit<${capitalizedName}, 'id' | 'createdAt'>): Promise<${capitalizedName}> => {
    return prisma.${singularName}.create({
      data,
    });
  },
  
  update: async (id: string, data: Partial<${capitalizedName}>): Promise<${capitalizedName}> => {
    return prisma.${singularName}.update({
      where: { id },
      data,
    });
  },
  
  delete: async (id: string): Promise<${capitalizedName}> => {
    return prisma.${singularName}.delete({
      where: { id },
    });
  }
};`;

  // Generate router code based on the framework
  let routerCode = '';
  
  if (stack.framework === "Express") {
    routerCode = `// src/routes/${singularName}.routes.ts
import express, { Request, Response } from 'express';
import { ${capitalizedName}Model } from '../models/${singularName}.model';

const router = express.Router();

// Get all ${entityName}
router.get('/${entityName}', async (req: Request, res: Response) => {
  try {
    const items = await ${capitalizedName}Model.findAll();
    res.json(items);
  } catch (error) {
    console.error(\`Error fetching ${entityName}:\`, error);
    res.status(500).json({ error: \`Failed to fetch ${entityName}\` });
  }
});

// Get ${singularName} by id
router.get('/${entityName}/:id', async (req: Request, res: Response) => {
  try {
    const item = await ${capitalizedName}Model.findById(req.params.id);
    if (!item) {
      return res.status(404).json({ error: \`${capitalizedName} not found\` });
    }
    res.json(item);
  } catch (error) {
    console.error(\`Error fetching ${singularName}:\`, error);
    res.status(500).json({ error: \`Failed to fetch ${singularName}\` });
  }
});

// Create ${singularName}
router.post('/${entityName}', async (req: Request, res: Response) => {
  try {
    const item = await ${capitalizedName}Model.create(req.body);
    res.status(201).json(item);
  } catch (error) {
    console.error(\`Error creating ${singularName}:\`, error);
    res.status(500).json({ error: \`Failed to create ${singularName}\` });
  }
});

// Update ${singularName}
router.put('/${entityName}/:id', async (req: Request, res: Response) => {
  try {
    const item = await ${capitalizedName}Model.update(req.params.id, req.body);
    res.json(item);
  } catch (error) {
    console.error(\`Error updating ${singularName}:\`, error);
    res.status(500).json({ error: \`Failed to update ${singularName}\` });
  }
});

// Delete ${singularName}
router.delete('/${entityName}/:id', async (req: Request, res: Response) => {
  try {
    const item = await ${capitalizedName}Model.delete(req.params.id);
    res.json(item);
  } catch (error) {
    console.error(\`Error deleting ${singularName}:\`, error);
    res.status(500).json({ error: \`Failed to delete ${singularName}\` });
  }
});

export default router;`;
  } else if (stack.framework === "NestJS") {
    routerCode = `// src/controllers/${singularName}.controller.ts
import { Controller, Get, Post, Put, Delete, Param, Body, HttpException, HttpStatus } from '@nestjs/common';
import { ${capitalizedName}Service } from '../services/${singularName}.service';

@Controller('${entityName}')
export class ${capitalizedName}Controller {
  constructor(private readonly ${singularName}Service: ${capitalizedName}Service) {}

  @Get()
  async findAll() {
    try {
      return await this.${singularName}Service.findAll();
    } catch (error) {
      throw new HttpException(\`Failed to fetch ${entityName}\`, HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  @Get(':id')
  async findOne(@Param('id') id: string) {
    try {
      const item = await this.${singularName}Service.findById(id);
      if (!item) {
        throw new HttpException(\`${capitalizedName} not found\`, HttpStatus.NOT_FOUND);
      }
      return item;
    } catch (error) {
      if (error.status === 404) throw error;
      throw new HttpException(\`Failed to fetch ${singularName}\`, HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  @Post()
  async create(@Body() data: any) {
    try {
      return await this.${singularName}Service.create(data);
    } catch (error) {
      throw new HttpException(\`Failed to create ${singularName}\`, HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  @Put(':id')
  async update(@Param('id') id: string, @Body() data: any) {
    try {
      return await this.${singularName}Service.update(id, data);
    } catch (error) {
      throw new HttpException(\`Failed to update ${singularName}\`, HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  @Delete(':id')
  async remove(@Param('id') id: string) {
    try {
      return await this.${singularName}Service.delete(id);
    } catch (error) {
      throw new HttpException(\`Failed to delete ${singularName}\`, HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }
}`;
  } else if (stack.framework === "Fastify") {
    routerCode = `// src/routes/${singularName}.routes.ts
import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { ${capitalizedName}Model } from '../models/${singularName}.model';

interface IdParams {
  id: string;
}

export default async function ${singularName}Routes(fastify: FastifyInstance) {
  // Get all ${entityName}
  fastify.get('/${entityName}', async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const items = await ${capitalizedName}Model.findAll();
      return items;
    } catch (error) {
      console.error(\`Error fetching ${entityName}:\`, error);
      reply.code(500).send({ error: \`Failed to fetch ${entityName}\` });
    }
  });

  // Get ${singularName} by id
  fastify.get<{ Params: IdParams }>('/${entityName}/:id', async (request, reply) => {
    try {
      const { id } = request.params;
      const item = await ${capitalizedName}Model.findById(id);
      
      if (!item) {
        return reply.code(404).send({ error: \`${capitalizedName} not found\` });
      }
      
      return item;
    } catch (error) {
      console.error(\`Error fetching ${singularName}:\`, error);
      reply.code(500).send({ error: \`Failed to fetch ${singularName}\` });
    }
  });

  // Create ${singularName}
  fastify.post('/${entityName}', async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const item = await ${capitalizedName}Model.create(request.body as any);
      return reply.code(201).send(item);
    } catch (error) {
      console.error(\`Error creating ${singularName}:\`, error);
      reply.code(500).send({ error: \`Failed to create ${singularName}\` });
    }
  });

  // Additional routes...
}`;
  }
  
  return {
    model: modelCode,
    router: routerCode,
    schema: schemaCode
  };
}

function generateJavascriptMongooseCode(schema: SchemaDefinition, stack: TechStack): CodeBundle {
  // Get the first entity in the schema for the example code
  const mainEntity = schema.entities[0];
  const entityName = mainEntity?.name || "users";
  const singularName = entityName.endsWith('s') 
    ? entityName.slice(0, -1) 
    : entityName;
  const capitalizedName = singularName.charAt(0).toUpperCase() + singularName.slice(1);
  
  // Generate model code
  const modelCode = `// src/models/${singularName}.model.js
const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const ${singularName}Schema = new Schema({
${mainEntity?.fields.map(field => `  ${field.name}: {
    type: ${getMongooseTypeMapping(field.type)},
    ${field.primaryKey ? 'required: true,' : ''}
    ${field.unique ? 'unique: true,' : ''}
  }`).join(',\n')}
}, { timestamps: true });

const ${capitalizedName} = mongoose.model('${capitalizedName}', ${singularName}Schema);

module.exports = ${capitalizedName};`;

  // Generate router code based on the framework
  let routerCode = '';
  
  if (stack.framework === "Express") {
    routerCode = `// src/routes/${singularName}.routes.js
const express = require('express');
const router = express.Router();
const ${capitalizedName} = require('../models/${singularName}.model');

// Get all ${entityName}
router.get('/${entityName}', async (req, res) => {
  try {
    const items = await ${capitalizedName}.find();
    res.json(items);
  } catch (error) {
    console.error(\`Error fetching ${entityName}:\`, error);
    res.status(500).json({ error: \`Failed to fetch ${entityName}\` });
  }
});

// Get ${singularName} by id
router.get('/${entityName}/:id', async (req, res) => {
  try {
    const item = await ${capitalizedName}.findById(req.params.id);
    if (!item) {
      return res.status(404).json({ error: \`${capitalizedName} not found\` });
    }
    res.json(item);
  } catch (error) {
    console.error(\`Error fetching ${singularName}:\`, error);
    res.status(500).json({ error: \`Failed to fetch ${singularName}\` });
  }
});

// Create ${singularName}
router.post('/${entityName}', async (req, res) => {
  try {
    const item = new ${capitalizedName}(req.body);
    await item.save();
    res.status(201).json(item);
  } catch (error) {
    console.error(\`Error creating ${singularName}:\`, error);
    res.status(500).json({ error: \`Failed to create ${singularName}\` });
  }
});

// Update ${singularName}
router.put('/${entityName}/:id', async (req, res) => {
  try {
    const item = await ${capitalizedName}.findByIdAndUpdate(
      req.params.id, 
      req.body, 
      { new: true }
    );
    if (!item) {
      return res.status(404).json({ error: \`${capitalizedName} not found\` });
    }
    res.json(item);
  } catch (error) {
    console.error(\`Error updating ${singularName}:\`, error);
    res.status(500).json({ error: \`Failed to update ${singularName}\` });
  }
});

// Delete ${singularName}
router.delete('/${entityName}/:id', async (req, res) => {
  try {
    const item = await ${capitalizedName}.findByIdAndDelete(req.params.id);
    if (!item) {
      return res.status(404).json({ error: \`${capitalizedName} not found\` });
    }
    res.json({ message: \`${capitalizedName} deleted successfully\` });
  } catch (error) {
    console.error(\`Error deleting ${singularName}:\`, error);
    res.status(500).json({ error: \`Failed to delete ${singularName}\` });
  }
});

module.exports = router;`;
  } else if (stack.framework === "Koa") {
    routerCode = `// src/routes/${singularName}.routes.js
const Router = require('@koa/router');
const ${capitalizedName} = require('../models/${singularName}.model');

const router = new Router({
  prefix: '/${entityName}'
});

// Get all ${entityName}
router.get('/', async (ctx) => {
  try {
    const items = await ${capitalizedName}.find();
    ctx.body = items;
  } catch (error) {
    console.error(\`Error fetching ${entityName}:\`, error);
    ctx.status = 500;
    ctx.body = { error: \`Failed to fetch ${entityName}\` };
  }
});

// Get ${singularName} by id
router.get('/:id', async (ctx) => {
  try {
    const item = await ${capitalizedName}.findById(ctx.params.id);
    if (!item) {
      ctx.status = 404;
      ctx.body = { error: \`${capitalizedName} not found\` };
      return;
    }
    ctx.body = item;
  } catch (error) {
    console.error(\`Error fetching ${singularName}:\`, error);
    ctx.status = 500;
    ctx.body = { error: \`Failed to fetch ${singularName}\` };
  }
});

// Additional routes...

module.exports = router;`;
  }
  
  // Mock schema code (MongoDB connection setup)
  const schemaCode = `// src/config/database.js
const mongoose = require('mongoose');

const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log('MongoDB connected successfully');
  } catch (error) {
    console.error('MongoDB connection error:', error);
    process.exit(1);
  }
};

module.exports = connectDB;`;

  return {
    model: modelCode,
    router: routerCode,
    schema: schemaCode
  };
}

function generatePythonSQLModelCode(schema: SchemaDefinition, stack: TechStack): CodeBundle {
  // Get the first entity in the schema
  const mainEntity = schema.entities[0];
  const entityName = mainEntity?.name || "users";
  const singularName = entityName.endsWith('s') 
    ? entityName.slice(0, -1) 
    : entityName;
  const capitalizedName = singularName.charAt(0).toUpperCase() + singularName.slice(1);
  
  // Generate model code
  const modelCode = `# models.py
from sqlmodel import Field, SQLModel, Relationship
from typing import Optional, List
from datetime import datetime
from uuid import UUID, uuid4

class ${capitalizedName}(SQLModel, table=True):
    __tablename__ = "${entityName}"
    
    ${mainEntity?.fields.map(field => {
      const fieldType = getPythonTypeMapping(field.type);
      const fieldAttrs = [];
      
      if (field.primaryKey) {
        if (field.type === 'uuid') {
          return `${field.name}: UUID = Field(default_factory=uuid4, primary_key=True)`;
        } else {
          return `${field.name}: ${fieldType} = Field(primary_key=True)`;
        }
      } else if (field.unique) {
        return `${field.name}: ${fieldType} = Field(unique=True)`;
      } else if (field.type === 'timestamp') {
        return `${field.name}: datetime = Field(default_factory=datetime.now)`;
      } else {
        return `${field.name}: ${fieldType}`;
      }
    }).join('\n    ')}
    
    ${schema.relationships
      .filter(r => r.from.entity === entityName)
      .map(r => {
        const targetEntityName = r.to.entity;
        const targetSingular = targetEntityName.endsWith('s') ? targetEntityName.slice(0, -1) : targetEntityName;
        const targetCapitalized = targetSingular.charAt(0).toUpperCase() + targetSingular.slice(1);
        return `${targetEntityName}: List["${targetCapitalized}"] = Relationship(back_populates="${singularName}")`;
      })
      .join('\n    ')}`;

  // Generate router code based on the framework
  let routerCode = '';
  
  if (stack.framework === "FastAPI") {
    routerCode = `# routes.py
from fastapi import APIRouter, HTTPException, Depends, status
from sqlmodel import Session, select
from database import get_session
from models import ${capitalizedName}
from schemas import ${capitalizedName}Create, ${capitalizedName}Read, ${capitalizedName}Update
from typing import List

router = APIRouter()

@router.get("/${entityName}", response_model=List[${capitalizedName}Read])
def read_${entityName}(session: Session = Depends(get_session)):
    ${entityName} = session.exec(select(${capitalizedName})).all()
    return ${entityName}

@router.get("/${entityName}/{item_id}", response_model=${capitalizedName}Read)
def read_${singularName}(item_id: str, session: Session = Depends(get_session)):
    ${singularName} = session.get(${capitalizedName}, item_id)
    if not ${singularName}:
        raise HTTPException(status_code=404, detail="${capitalizedName} not found")
    return ${singularName}

@router.post("/${entityName}", response_model=${capitalizedName}Read, status_code=status.HTTP_201_CREATED)
def create_${singularName}(item: ${capitalizedName}Create, session: Session = Depends(get_session)):
    db_item = ${capitalizedName}(**item.dict())
    session.add(db_item)
    session.commit()
    session.refresh(db_item)
    return db_item

@router.patch("/${entityName}/{item_id}", response_model=${capitalizedName}Read)
def update_${singularName}(item_id: str, item: ${capitalizedName}Update, session: Session = Depends(get_session)):
    db_item = session.get(${capitalizedName}, item_id)
    if not db_item:
        raise HTTPException(status_code=404, detail="${capitalizedName} not found")
    
    item_data = item.dict(exclude_unset=True)
    for key, value in item_data.items():
        setattr(db_item, key, value)
    
    session.add(db_item)
    session.commit()
    session.refresh(db_item)
    return db_item

@router.delete("/${entityName}/{item_id}", response_model=None, status_code=status.HTTP_204_NO_CONTENT)
def delete_${singularName}(item_id: str, session: Session = Depends(get_session)):
    ${singularName} = session.get(${capitalizedName}, item_id)
    if not ${singularName}:
        raise HTTPException(status_code=404, detail="${capitalizedName} not found")
    
    session.delete(${singularName})
    session.commit()
    return None`;
  } else if (stack.framework === "Flask") {
    routerCode = `# routes.py
from flask import Blueprint, request, jsonify
from models import ${capitalizedName}
from database import db_session

${singularName}_bp = Blueprint('${singularName}', __name__)

@${singularName}_bp.route('/${entityName}', methods=['GET'])
def get_all_${entityName}():
    ${entityName} = db_session.query(${capitalizedName}).all()
    result = []
    for item in ${entityName}:
        item_data = {
            'id': str(item.id),
            ${mainEntity?.fields
              .filter(f => !f.primaryKey)
              .map(field => {
                if (field.type === 'timestamp') {
                  return `'${field.name}': item.${field.name}.isoformat()`;
                } else {
                  return `'${field.name}': item.${field.name}`;
                }
              })
              .join(',\n            ')}
        }
        result.append(item_data)
    return jsonify(result)

@${singularName}_bp.route('/${entityName}/<item_id>', methods=['GET'])
def get_${singularName}(item_id):
    item = db_session.query(${capitalizedName}).filter(${capitalizedName}.id == item_id).first()
    if not item:
        return jsonify({'error': '${capitalizedName} not found'}), 404

    item_data = {
        'id': str(item.id),
        ${mainEntity?.fields
          .filter(f => !f.primaryKey)
          .map(field => {
            if (field.type === 'timestamp') {
              return `'${field.name}': item.${field.name}.isoformat()`;
            } else {
              return `'${field.name}': item.${field.name}`;
            }
          })
          .join(',\n        ')}
    }
    
    return jsonify(item_data)

# Additional routes...`;
  }
  
  // Schema file with Pydantic models
  const schemaCode = `# schemas.py
from pydantic import BaseModel
from typing import Optional
from datetime import datetime
from uuid import UUID

class ${capitalizedName}Base(BaseModel):
    ${mainEntity?.fields
      .filter(f => !f.primaryKey && f.name !== 'created_at' && f.name !== 'updated_at')
      .map(field => `${field.name}: ${getPythonTypeMapping(field.type)}`)
      .join('\n    ')}

class ${capitalizedName}Create(${capitalizedName}Base):
    pass

class ${capitalizedName}Update(BaseModel):
    ${mainEntity?.fields
      .filter(f => !f.primaryKey && f.name !== 'created_at' && f.name !== 'updated_at')
      .map(field => `${field.name}: Optional[${getPythonTypeMapping(field.type)}] = None`)
      .join('\n    ')}

class ${capitalizedName}Read(${capitalizedName}Base):
    id: UUID
    ${mainEntity?.fields
      .filter(f => f.name === 'created_at' || f.name === 'updated_at')
      .map(field => `${field.name}: datetime`)
      .join('\n    ')}

    class Config:
        orm_mode = True`;

  return {
    model: modelCode,
    router: routerCode,
    schema: schemaCode
  };
}

function generatePHPLaravelCode(schema: SchemaDefinition, stack: TechStack): CodeBundle {
  // Get the first entity in the schema
  const mainEntity = schema.entities[0];
  const entityName = mainEntity?.name || "users";
  const singularName = entityName.endsWith('s') 
    ? entityName.slice(0, -1) 
    : entityName;
  const capitalizedName = singularName.charAt(0).toUpperCase() + singularName.slice(1);
  
  // Generate model code
  const modelCode = `<?php

namespace App\\Models;

use Illuminate\\Database\\Eloquent\\Factories\\HasFactory;
use Illuminate\\Database\\Eloquent\\Model;

class ${capitalizedName} extends Model
{
    use HasFactory;

    protected $table = '${entityName}';
    
    protected $fillable = [
        ${mainEntity?.fields
          .filter(f => !f.primaryKey && f.name !== 'created_at' && f.name !== 'updated_at')
          .map(field => `'${field.name}'`)
          .join(',\n        ')}
    ];
    
    ${schema.relationships
      .filter(r => r.from.entity === entityName)
      .map(r => {
        const targetEntity = schema.entities.find(e => e.name === r.to.entity);
        if (!targetEntity) return '';
        
        const singularTargetName = r.to.entity.endsWith('s') 
          ? r.to.entity.slice(0, -1) 
          : r.to.entity;
        
        return `  ${singularTargetName} ${capitalizeFirstLetter(singularTargetName)} @relation(fields: [${r.from.field}], references: [${r.to.field}])`;
      })
      .filter(rel => rel !== '')
      .join('\n')}
}`;

  // Generate controller code
  const routerCode = `<?php

namespace App\\Http\\Controllers;

use App\\Models\\${capitalizedName};
use Illuminate\\Http\\Request;

class ${capitalizedName}Controller extends Controller
{
    /**
     * Display a listing of the resource.
     *
     * @return \\Illuminate\\Http\\Response
     */
    public function index()
    {
        return ${capitalizedName}::all();
    }

    /**
     * Store a newly created resource in storage.
     *
     * @param  \\Illuminate\\Http\\Request  $request
     * @return \\Illuminate\\Http\\Response
     */
    public function store(Request $request)
    {
        $validated = $request->validate([
            ${mainEntity?.fields
              .filter(f => !f.primaryKey && f.name !== 'created_at' && f.name !== 'updated_at')
              .map(field => {
                let validation = "'";
                if (field.type === 'string' || field.type === 'text') {
                  validation += `${field.name}' => 'string`;
                } else if (field.type === 'integer' || field.type === 'number') {
                  validation += `${field.name}' => 'numeric`;
                } else if (field.type === 'boolean') {
                  validation += `${field.name}' => 'boolean`;
                } else if (field.type === 'date' || field.type === 'timestamp') {
                  validation += `${field.name}' => 'date`;
                } else {
                  validation += `${field.name}' => 'required`;
                }
                
                if (field.unique) {
                  validation += "|unique:${entityName}";
                }
                
                validation += "'";
                return validation;
              })
              .join(',\n            ')}
        ]);

        return ${capitalizedName}::create($validated);
    }

    /**
     * Display the specified resource.
     *
     * @param  int  $id
     * @return \\Illuminate\\Http\\Response
     */
    public function show($id)
    {
        return ${capitalizedName}::findOrFail($id);
    }

    /**
     * Update the specified resource in storage.
     *
     * @param  \\Illuminate\\Http\\Request  $request
     * @param  int  $id
     * @return \\Illuminate\\Http\\Response
     */
    public function update(Request $request, $id)
    {
        $${singularName} = ${capitalizedName}::findOrFail($id);
        $${singularName}->update($request->all());
        return $${singularName};
    }

    /**
     * Remove the specified resource from storage.
     *
     * @param  int  $id
     * @return \\Illuminate\\Http\\Response
     */
    public function destroy($id)
    {
        $${singularName} = ${capitalizedName}::findOrFail($id);
        $${singularName}->delete();
        return response()->json(['message' => '${capitalizedName} deleted successfully']);
    }
}`;

  // Generate migration file
  const schemaCode = `<?php

use Illuminate\\Database\\Migrations\\Migration;
use Illuminate\\Database\\Schema\\Blueprint;
use Illuminate\\Support\\Facades\\Schema;

class Create${capitalizedName}sTable extends Migration
{
    /**
     * Run the migrations.
     *
     * @return void
     */
    public function up()
    {
        Schema::create('${entityName}', function (Blueprint $table) {
            ${mainEntity?.fields.map(field => {
              if (field.primaryKey) {
                if (field.type === 'uuid') {
                  return `$table->uuid('${field.name}')->primary();`;
                } else {
                  return `$table->id('${field.name}');`;
                }
              } else if (field.type === 'string') {
                return `$table->string('${field.name}')${field.unique ? '->unique()' : ''};`;
              } else if (field.type === 'text') {
                return `$table->text('${field.name}');`;
              } else if (field.type === 'integer') {
                return `$table->integer('${field.name}');`;
              } else if (field.type === 'float') {
                return `$table->float('${field.name}');`;
              } else if (field.type === 'boolean') {
                return `$table->boolean('${field.name}')->default(false);`;
              } else if (field.type === 'date') {
                return `$table->date('${field.name}');`;
              } else if (field.type === 'timestamp') {
                return `$table->timestamp('${field.name}');`;
              } else {
                return `$table->string('${field.name}');`;
              }
            }).join('\n            ')}
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     *
     * @return void
     */
    public function down()
    {
        Schema::dropIfExists('${entityName}');
    }
}`;

  return {
    model: modelCode,
    router: routerCode,
    schema: schemaCode
  };
}

// Helper function to generate Prisma schema
function generatePrismaSchema(schema: SchemaDefinition): string {
  const prismaEntities = schema.entities.map(entity => {
    const fields = entity.fields.map(field => {
      let fieldDef = `  ${field.name} ${getPrismaType(field.type)}`;
      
      if (field.primaryKey) {
        fieldDef += " @id";
        if (field.type === 'uuid') {
          fieldDef += " @default(uuid())";
        }
      }
      
      if (field.unique) {
        fieldDef += " @unique";
      }
      
      if (field.name === 'created_at' || field.name === 'updated_at') {
        fieldDef += " @default(now())";
      }
      
      if (field.foreignKey) {
        fieldDef += ` @map("${field.name}")`;
      }
      
      return fieldDef;
    }).join('\n');
    
    const relations = schema.relationships
      .filter(rel => rel.from.entity === entity.name)
      .map(rel => {
        const targetEntity = schema.entities.find(e => e.name === rel.to.entity);
        if (!targetEntity) return '';
        
        const singularTargetName = rel.to.entity.endsWith('s') 
          ? rel.to.entity.slice(0, -1) 
          : rel.to.entity;
        
        return `  ${singularTargetName} ${capitalizeFirstLetter(singularTargetName)} @relation(fields: [${rel.from.field}], references: [${rel.to.field}])`;
      })
      .filter(rel => rel !== '')
      .join('\n');
    
    return `model ${capitalizeFirstLetter(entity.name.endsWith('s') ? entity.name.slice(0, -1) : entity.name)} {
${fields}
${relations ? '\n' + relations : ''}

  @@map("${entity.name}")
}`;
  }).join('\n\n');
  
  return `// This is your Prisma schema file,
// learn more about it in the docs: https://pris.ly/d/prisma-schema

generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

${prismaEntities}`;
}

// Helper functions for type mapping
function getPrismaType(type: string): string {
  switch (type) {
    case 'string':
      return 'String';
    case 'text':
      return 'String';
    case 'integer':
      return 'Int';
    case 'float':
      return 'Float';
    case 'boolean':
      return 'Boolean';
    case 'date':
      return 'DateTime';
    case 'timestamp':
      return 'DateTime';
    case 'uuid':
      return 'String';
    default:
      return 'String';
  }
}

function getPrismaTypeMapping(type: string): string {
  switch (type) {
    case 'string':
      return 'string';
    case 'text':
      return 'string';
    case 'integer':
      return 'number';
    case 'float':
      return 'number';
    case 'boolean':
      return 'boolean';
    case 'date':
      return 'Date';
    case 'timestamp':
      return 'Date';
    case 'uuid':
      return 'string';
    default:
      return 'any';
  }
}

function getMongooseTypeMapping(type: string): string {
  switch (type) {
    case 'string':
      return 'String';
    case 'text':
      return 'String';
    case 'integer':
      return 'Number';
    case 'float':
      return 'Number';
    case 'boolean':
      return 'Boolean';
    case 'date':
      return 'Date';
    case 'timestamp':
      return 'Date';
    case 'uuid':
      return 'String';
    default:
      return 'String';
  }
}

function getPythonTypeMapping(type: string): string {
  switch (type) {
    case 'string':
      return 'str';
    case 'text':
      return 'str';
    case 'integer':
      return 'int';
    case 'float':
      return 'float';
    case 'boolean':
      return 'bool';
    case 'date':
      return 'datetime';
    case 'timestamp':
      return 'datetime';
    case 'uuid':
      return 'UUID';
    default:
      return 'str';
  }
}

function capitalizeFirstLetter(string: string): string {
  return string.charAt(0).toUpperCase() + string.slice(1);
}

/**
 * Gets appropriate file extension for the technology stack
 */
export function getFileExtension(fileType: string, stack: TechStack): string {
  if (stack.language === "TypeScript") {
    return fileType === "schema" ? "prisma" : "ts";
  } else if (stack.language === "JavaScript") {
    return "js";
  } else if (stack.language.includes("Python")) {
    return "py";
  } else if (stack.language.includes("PHP")) {
    return "php";
  } else if (stack.language.includes("Java")) {
    return "java";
  } else if (stack.language.includes("C#")) {
    return "cs";
  } else if (stack.language.includes("Go")) {
    return "go";
  }
  return "txt"; // Default fallback
}

/**
 * Gets appropriate file name for the code file
 */
export function getFileName(fileType: string, stack: TechStack): string {
  const ext = getFileExtension(fileType, stack);
  
  switch (fileType) {
    case "model":
      return stack.language === "TypeScript" || stack.language === "JavaScript" 
        ? `models.${ext}` 
        : `models.${ext}`;
    case "router":
      return stack.language === "TypeScript" || stack.language === "JavaScript"
        ? `routes.${ext}`
        : `routes.${ext}`;
    case "schema":
      if (stack.orm === "Prisma v5") {
        return "schema.prisma";
      } else if (stack.language.includes("Python")) {
        return `database.${ext}`;
      } else if (stack.language.includes("PHP")) {
        return `migration.${ext}`;
      } else {
        return `schema.${ext}`;
      }
    default:
      return `${fileType}.${ext}`;
  }
}
