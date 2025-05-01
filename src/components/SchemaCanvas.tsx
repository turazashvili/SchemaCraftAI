import { useCallback, useEffect, useState, useRef } from "react";
import ReactFlow, {
  Background,
  Controls,
  MiniMap,
  Node,
  Edge,
  useNodesState,
  useEdgesState,
  addEdge,
  Connection,
  NodeTypes,
  EdgeTypes,
  Panel,
  NodeMouseHandler,
  ReactFlowProvider,
  applyNodeChanges
} from "reactflow";
import "reactflow/dist/style.css";

import { Button } from "@/components/ui/button";
import { EntityNode } from "@/components/nodes/EntityNode";
import { SchemaDefinition, SchemaEntity, SchemaField, SchemaRelationship } from "@/services/aiSchemaService";
import { PlusCircle, Save, Loader2 } from "lucide-react";
import { EntityDialog } from "@/components/dialogs/EntityDialog";
import { FieldDialog } from "@/components/dialogs/FieldDialog";
import { toast } from "@/hooks/use-toast";
import { 
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface SchemaCanvasProps {
  schema: SchemaDefinition | null;
  onSave: (updatedSchema: SchemaDefinition) => void;
}

const nodeTypes: NodeTypes = {
  entity: EntityNode,
};

// Dialog modes
type DialogMode = "add" | "edit";
type DialogType = "entity" | "field";

// Create the inner component that uses the ReactFlow hooks
function SchemaCanvasContent({ schema, onSave }: SchemaCanvasProps) {
  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);
  
  // State for tracking the current working schema
  const [workingSchema, setWorkingSchema] = useState<SchemaDefinition | null>(schema);
  
  // Track if schema was modified by user actions
  const [schemaModified, setSchemaModified] = useState(false);
  
  // Track when autosaving is in progress
  const [isAutosaving, setIsAutosaving] = useState(false);
  
  // Ref to check if schema update is from initialization
  const isInitialLoad = useRef(true);
  
  // Debounce time for autosave (in milliseconds)
  const AUTOSAVE_DELAY = 1000;
  
  // Dialog state
  const [dialogOpen, setDialogOpen] = useState(false);
  const [dialogMode, setDialogMode] = useState<DialogMode>("add");
  const [dialogType, setDialogType] = useState<DialogType>("entity");
  const [selectedEntity, setSelectedEntity] = useState<SchemaEntity | null>(null);
  const [selectedField, setSelectedField] = useState<SchemaField | null>(null);
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);

  const onConnect = useCallback(
    (params: Connection) => {
      if (!params.source || !params.target || !workingSchema) return;

      // Add the edge to the UI immediately
      const newEdge = {
        id: `edge-${Date.now()}`,
        source: params.source,
        target: params.target,
        animated: true,
        label: "connecting...",
        style: { stroke: '#2563eb' }
      };
      
      setEdges(eds => [...eds, newEdge]);
      
      // Get the source and target entity names
      const sourceEntityName = params.source;
      const targetEntityName = params.target;
      
      // Find the entities
      const sourceEntity = workingSchema.entities.find(e => e.name === sourceEntityName);
      const targetEntity = workingSchema.entities.find(e => e.name === targetEntityName);
      
      if (!sourceEntity || !targetEntity) {
        console.error("Unable to find source or target entity for connection");
        return;
      }
      
      // Find or create a primary key in the target entity to reference
      const targetPrimaryKey = targetEntity.fields.find(f => f.primaryKey) || { 
        name: "id", 
        type: "uuid" 
      };
      
      // Create a new field in the source entity that references the target
      const newFieldName = `${targetEntityName.replace(/s$/, '')}_id`; // e.g., "user_id" from "users"
      let fieldExists = sourceEntity.fields.some(f => f.name === newFieldName);
      let fieldCounter = 1;
      let finalFieldName = newFieldName;
      
      // If the field already exists, add a number suffix
      while (fieldExists) {
        finalFieldName = `${newFieldName}_${fieldCounter}`;
        fieldExists = sourceEntity.fields.some(f => f.name === finalFieldName);
        fieldCounter++;
      }
      
      // Create the new field to add to the source entity
      const newField: SchemaField = {
        name: finalFieldName,
        type: targetPrimaryKey.type || "uuid",
        foreignKey: {
          entity: targetEntityName,
          field: targetPrimaryKey.name
        }
      };
      
      // Create a new relationship
      const newRelationship: SchemaRelationship = {
        from: {
          entity: sourceEntityName,
          field: finalFieldName
        },
        to: {
          entity: targetEntityName,
          field: targetPrimaryKey.name
        }
      };
      
      // Update the source entity with the new field
      const updatedEntities = workingSchema.entities.map(entity => {
        if (entity.name === sourceEntityName) {
          return {
            ...entity,
            fields: [...entity.fields, newField]
          };
        }
        return entity;
      });
      
      // Update the schema with the new relationship
      const updatedSchema = {
        entities: updatedEntities,
        relationships: [...workingSchema.relationships, newRelationship]
      };
      
      // Update the working schema
      setWorkingSchema(updatedSchema);
      
      // Update the edge label with the proper field name
      setEdges(eds => 
        eds.map(edge => 
          edge.id === newEdge.id 
            ? {
                ...edge,
                id: `edge-${updatedSchema.relationships.length - 1}`,
                label: `${finalFieldName} → ${targetPrimaryKey.name}`
              }
            : edge
        )
      );
      
      // Mark schema as modified
      setSchemaModified(true);
    },
    [workingSchema, setEdges]
  );

  // Autosave functionality
  useEffect(() => {
    // Skip initial schema load
    if (isInitialLoad.current) {
      isInitialLoad.current = false;
      return;
    }
    
    // Skip if no schema or no modifications
    if (!workingSchema || !schemaModified) return;
    
    // Create a debounce timeout for autosave
    const timeout = setTimeout(() => {
      // Set autosaving indicator
      setIsAutosaving(true);
      
      // Get current node positions from the nodes state and preserve them
      const updatedEntities = workingSchema.entities.map(entity => {
        const node = nodes.find(n => n.id === entity.name);
        // Only update position if node exists in the current view and has a position
        if (node && node.position) {
          return {
            ...entity,
            position: node.position
          };
        }
        // Preserve the entity's existing position if no node position is available
        return entity;
      });
      
      // Save schema with updated/preserved positions
      const schemaToSave = {
        entities: updatedEntities,
        relationships: workingSchema.relationships || []
      };
      
      onSave(schemaToSave);
      setSchemaModified(false);
      
      // Clear autosaving indicator after a short delay
      setTimeout(() => {
        setIsAutosaving(false);
      }, 500);
    }, AUTOSAVE_DELAY);
    
    // Clear timeout on cleanup
    return () => clearTimeout(timeout);
  }, [workingSchema, nodes, schemaModified, onSave]);

  // Update working schema when the original schema changes
  useEffect(() => {
    setWorkingSchema(schema);
    isInitialLoad.current = true;
  }, [schema]);

  // Convert schema to ReactFlow nodes and edges
  const initializeFlow = useCallback(() => {
    if (!workingSchema || !workingSchema.entities) return;

    const initialNodes: Node[] = [];
    const initialEdges: Edge[] = [];

    // Create nodes for entities
    workingSchema.entities.forEach((entity, index) => {
      initialNodes.push({
        id: entity.name,
        type: "entity",
        // Use saved position if available, or use default layout
        position: entity.position || { x: 100 + index * 300, y: 100 },
        data: { 
          ...entity,
          onEditEntity: () => handleEditEntity(entity),
          onDeleteEntity: () => handleDeleteEntity(entity.name),
          onAddField: () => handleAddField(entity),
          onEditField: (field: SchemaField) => handleEditField(entity, field),
          onDeleteField: (fieldName: string) => handleDeleteField(entity.name, fieldName)
        }
      });
    });

    // Create edges for relationships
    if (workingSchema.relationships) {
      workingSchema.relationships.forEach((rel, index) => {
        initialEdges.push({
          id: `edge-${index}`,
          source: rel.from.entity,
          target: rel.to.entity,
          animated: true,
          label: `${rel.from.field} → ${rel.to.field}`,
          style: { stroke: '#2563eb' },
        });
      });
    }

    setNodes(initialNodes);
    setEdges(initialEdges);
  }, [workingSchema, setNodes, setEdges]);

  // Initialize the canvas when the schema changes
  useEffect(() => {
    initializeFlow();
  }, [workingSchema, initializeFlow]);

  // Handle node selection
  const onNodeClick: NodeMouseHandler = useCallback((event, node) => {
    setSelectedNodeId(node.id);
  }, []);

  // Handle adding a new entity
  const handleAddEntity = () => {
    setDialogMode("add");
    setDialogType("entity");
    setSelectedEntity(null);
    setDialogOpen(true);
  };

  // Handle editing an existing entity
  const handleEditEntity = (entity: SchemaEntity) => {
    setDialogMode("edit");
    setDialogType("entity");
    setSelectedEntity(entity);
    setDialogOpen(true);
  };

  // Handle deleting an entity
  const handleDeleteEntity = (entityName: string) => {
    if (!workingSchema) return;
    
    // Remove the entity from the schema
    const updatedEntities = workingSchema.entities.filter(e => e.name !== entityName);
    
    // Remove any relationships involving this entity
    const updatedRelationships = workingSchema.relationships.filter(
      r => r.from.entity !== entityName && r.to.entity !== entityName
    );
    
    // Update working schema
    const updatedSchema = {
      ...workingSchema,
      entities: updatedEntities,
      relationships: updatedRelationships
    };
    
    setWorkingSchema(updatedSchema);
    toast({
      title: "Entity deleted",
      description: `Entity "${entityName}" has been removed from the schema.`,
    });
    
    // Mark schema as modified
    setSchemaModified(true);
  };

  // Handle adding a field to an entity
  const handleAddField = (entity: SchemaEntity) => {
    setDialogMode("add");
    setDialogType("field");
    setSelectedEntity(entity);
    setSelectedField(null);
    setDialogOpen(true);
  };

  // Handle editing a field
  const handleEditField = (entity: SchemaEntity, field: SchemaField) => {
    setDialogMode("edit");
    setDialogType("field");
    setSelectedEntity(entity);
    setSelectedField(field);
    setDialogOpen(true);
  };

  // Handle deleting a field
  const handleDeleteField = (entityName: string, fieldName: string) => {
    if (!workingSchema) return;
    
    // Find the entity
    const entityIndex = workingSchema.entities.findIndex(e => e.name === entityName);
    if (entityIndex === -1) return;
    
    // Get the field being deleted to check if it's a foreign key
    const fieldToDelete = workingSchema.entities[entityIndex].fields.find(f => f.name === fieldName);
    
    // Clone the entity and filter out the field
    const updatedEntity = {
      ...workingSchema.entities[entityIndex],
      fields: workingSchema.entities[entityIndex].fields.filter(f => f.name !== fieldName)
    };
    
    // Update the entities array
    const updatedEntities = [...workingSchema.entities];
    updatedEntities[entityIndex] = updatedEntity;
    
    // Remove any relationships involving this field
    const updatedRelationships = workingSchema.relationships.filter(
      r => !(r.from.entity === entityName && r.from.field === fieldName) && 
           !(r.to.entity === entityName && r.to.field === fieldName)
    );
    
    // Update working schema
    const updatedSchema = {
      ...workingSchema,
      entities: updatedEntities,
      relationships: updatedRelationships
    };
    
    setWorkingSchema(updatedSchema);
    toast({
      title: "Field deleted",
      description: `Field "${fieldName}" has been removed from entity "${entityName}".`,
    });
    
    // Mark schema as modified
    setSchemaModified(true);
  };

  // Handle saving a field from dialog
  const handleSaveField = (field: SchemaField, isNew: boolean) => {
    if (!workingSchema || !selectedEntity) return;
    
    // Find the entity
    const entityIndex = workingSchema.entities.findIndex(e => e.name === selectedEntity.name);
    if (entityIndex === -1) return;
    
    let updatedFields: SchemaField[];
    let updatedRelationships = [...workingSchema.relationships];
    
    if (isNew) {
      // Check for duplicate field name
      if (workingSchema.entities[entityIndex].fields.some(f => f.name === field.name)) {
        toast({
          title: "Error",
          description: `A field with the name "${field.name}" already exists in this entity.`,
          variant: "destructive"
        });
        return;
      }
      
      // Add new field
      updatedFields = [...workingSchema.entities[entityIndex].fields, field];
      
      // Add relationship if it's a foreign key
      if (field.foreignKey) {
        updatedRelationships.push({
          from: {
            entity: selectedEntity.name,
            field: field.name
          },
          to: {
            entity: field.foreignKey.entity,
            field: field.foreignKey.field
          }
        });
      }
    } else {
      // Edit existing field
      const oldName = selectedField?.name || "";
      
      // Update the field
      updatedFields = workingSchema.entities[entityIndex].fields.map(f => 
        f.name === oldName ? field : f
      );
      
      // Handle relationship changes
      // First, remove any existing relationships involving this field
      updatedRelationships = updatedRelationships.filter(
        rel => !(rel.from.entity === selectedEntity.name && rel.from.field === oldName)
      );
      
      // Then add the new relationship if it's a foreign key
      if (field.foreignKey) {
        updatedRelationships.push({
          from: {
            entity: selectedEntity.name,
            field: field.name
          },
          to: {
            entity: field.foreignKey.entity,
            field: field.foreignKey.field
          }
        });
      }
      
      // Update any other relationships if the field name changed
      if (oldName !== field.name) {
        updatedRelationships = updatedRelationships.map(rel => {
          const updatedRel = { ...rel };
          
          if (rel.from.entity === selectedEntity.name && rel.from.field === oldName) {
            updatedRel.from = { ...rel.from, field: field.name };
          }
          
          if (rel.to.entity === selectedEntity.name && rel.to.field === oldName) {
            updatedRel.to = { ...rel.to, field: field.name };
          }
          
          return updatedRel;
        });
      }
    }
    
    const updatedEntities = [...workingSchema.entities];
    updatedEntities[entityIndex] = {
      ...selectedEntity,
      fields: updatedFields
    };
    
    // Update the working schema with both entity and relationship changes
    setWorkingSchema({
      entities: updatedEntities,
      relationships: updatedRelationships
    });
    
    setDialogOpen(false);
    initializeFlow();
    
    // Mark schema as modified
    setSchemaModified(true);
  };

  // Handle saving the entity from dialog
  const handleSaveEntity = (entity: SchemaEntity, isNew: boolean) => {
    if (!workingSchema) return;
    
    let updatedEntities: SchemaEntity[];
    
    if (isNew) {
      // Position the new entity in the UI
      const newNodePosition = { 
        x: Math.random() * 500 + 100, 
        y: Math.random() * 300 + 100 
      };
      
      // Add the position to the entity when creating it
      const entityWithPosition = {
        ...entity,
        position: newNodePosition
      };
      
      // Check for duplicate entity name
      if (workingSchema.entities.some(e => e.name === entity.name)) {
        toast({
          title: "Error",
          description: `An entity with the name "${entity.name}" already exists.`,
          variant: "destructive"
        });
        return;
      }
      
      // Add new entity with position
      updatedEntities = [...workingSchema.entities, entityWithPosition];
      
      setDialogOpen(false);
      setWorkingSchema({
        ...workingSchema,
        entities: updatedEntities
      });
      
      setTimeout(() => {
        // Allow time for nodes to update
        const newNode: Node = {
          id: entity.name,
          type: "entity",
          position: newNodePosition,
          data: { 
            ...entity,
            onEditEntity: () => handleEditEntity(entityWithPosition),
            onDeleteEntity: () => handleDeleteEntity(entity.name),
            onAddField: () => handleAddField(entityWithPosition),
            onEditField: (field: SchemaField) => handleEditField(entityWithPosition, field),
            onDeleteField: (fieldName: string) => handleDeleteField(entity.name, fieldName)
          }
        };
        
        setNodes(nodes => [...nodes, newNode]);
      }, 0);
    } else {
      // Edit existing entity
      const oldName = selectedEntity?.name || "";
      
      // Preserve the position when updating
      const existingEntity = workingSchema.entities.find(e => e.name === oldName);
      const updatedEntity = {
        ...entity,
        position: existingEntity?.position || { x: 0, y: 0 }
      };
      
      // Update the entity
      updatedEntities = workingSchema.entities.map(e => 
        e.name === oldName ? updatedEntity : e
      );
      
      // Update any relationships if the entity name changed
      if (oldName !== entity.name) {
        const updatedRelationships = workingSchema.relationships.map(rel => {
          const updatedRel = { ...rel };
          
          if (rel.from.entity === oldName) {
            updatedRel.from = { ...rel.from, entity: entity.name };
          }
          
          if (rel.to.entity === oldName) {
            updatedRel.to = { ...rel.to, entity: entity.name };
          }
          
          return updatedRel;
        });
        
        setWorkingSchema({
          entities: updatedEntities,
          relationships: updatedRelationships
        });
      } else {
        setWorkingSchema({
          ...workingSchema,
          entities: updatedEntities
        });
      }
      
      setDialogOpen(false);
      initializeFlow();
    }
    
    // Mark schema as modified
    setSchemaModified(true);
  };

  // Handle node position changes - store positions when nodes are moved
  const handleNodesChange = useCallback((changes) => {
    // Apply changes to the nodes in the UI
    setNodes((nds) => applyNodeChanges(changes, nds));
    
    // If we don't have a schema, don't try to save positions
    if (!workingSchema) return;
    
    // Find position changes
    const positionChanges = changes.filter(
      change => change.type === 'position' && change.position
    );
    
    if (positionChanges.length > 0) {
      // Update the schema with the new positions
      const updatedEntities = workingSchema.entities.map(entity => {
        const change = positionChanges.find(c => c.id === entity.name);
        if (change && change.position) {
          return {
            ...entity,
            position: change.position
          };
        }
        return entity;
      });
      
      setWorkingSchema({
        ...workingSchema,
        entities: updatedEntities
      });
      
      // Mark schema as modified
      setSchemaModified(true);
    }
  }, [workingSchema, setNodes]);

  // Handle saving the entire schema
  const handleSaveSchema = () => {
    if (!workingSchema) return;
    
    // Get current node positions from the nodes state
    const updatedEntities = workingSchema.entities.map(entity => {
      const node = nodes.find(n => n.id === entity.name);
      if (node) {
        return {
          ...entity,
          position: node.position
        };
      }
      return entity;
    });
    
    // Save schema with updated positions
    const schemaToSave = {
      entities: updatedEntities,
      relationships: workingSchema.relationships || []
    };
    
    onSave(schemaToSave);

  };

  // If we don't have a schema yet, show a clean empty state
  if (!schema || !schema.entities) {
    return (
      <div className="flex h-full w-full flex-col items-center justify-center">
        <div className="text-center space-y-2">
          <h3 className="text-lg font-medium">No Schema Generated</h3>
          <p className="text-sm text-muted-foreground">Use the sidebar to generate your database schema</p>
        </div>
      </div>
    );
  }

  return (
    <>
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={handleNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        onNodeClick={onNodeClick}
        nodeTypes={nodeTypes}
        fitView
        attributionPosition="bottom-right"
        className="h-full w-full"
      >
        <Controls position="bottom-right" />
        <MiniMap 
          nodeStrokeWidth={3}
          zoomable
          pannable
          className="bg-card/80 backdrop-blur-sm"
        />
        <Background gap={12} size={1} color="currentColor" className="opacity-10" />
        
        {/* Autosave indicator */}
        {isAutosaving && (
          <Panel position="top-left" className="p-2 rounded-full bg-background/80 shadow-sm backdrop-blur-sm">
            <Loader2 className="h-4 w-4 animate-spin text-blue-600" />
          </Panel>
        )}
        
        {/* Schema Editor Panel */}
        <Panel position="top-right" className="flex gap-2 bg-background/50 p-2 rounded-lg shadow-sm backdrop-blur-sm">
          <Button 
            variant="default" 
            size="sm"
            onClick={handleAddEntity}
            className="flex items-center gap-1.5 w-32"
          >
            <PlusCircle className="h-4 w-4" />
            Add Entity
          </Button>
          
          <Button 
            variant="default" 
            size="sm"
            onClick={handleSaveSchema}
            className="flex items-center gap-1.5 w-32 bg-blue-600 hover:bg-blue-700"
          >
            <Save className="h-4 w-4" />
            Save Schema
          </Button>
        </Panel>
      </ReactFlow>
      
      {/* Entity Dialog */}
      {dialogOpen && dialogType === "entity" && (
        <EntityDialog
          mode={dialogMode}
          entity={selectedEntity}
          open={dialogOpen}
          onOpenChange={setDialogOpen}
          onSave={handleSaveEntity}
        />
      )}
      
      {/* Field Dialog */}
      {dialogOpen && dialogType === "field" && (
        <FieldDialog
          mode={dialogMode}
          field={selectedField}
          entity={selectedEntity}
          allEntities={workingSchema?.entities || []}
          open={dialogOpen}
          onOpenChange={setDialogOpen}
          onSave={handleSaveField}
        />
      )}
    </>
  );
}

// Wrapper component that provides the ReactFlow context
export function SchemaCanvas(props: SchemaCanvasProps) {
  return (
    <ReactFlowProvider>
      <SchemaCanvasContent {...props} />
    </ReactFlowProvider>
  );
}
