import { memo } from "react";
import { Handle, Position } from "reactflow";
import "@/styles/EntityNode.css";
import { Edit, Trash, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";

interface EntityField {
  name: string;
  type: string;
  primaryKey?: boolean;
  unique?: boolean;
  foreignKey?: {
    entity: string;
    field: string;
  };
}

interface EntityNodeData {
  name: string;
  fields: EntityField[];
  onEditEntity?: () => void;
  onDeleteEntity?: () => void;
  onAddField?: () => void;
  onEditField?: (field: EntityField) => void;
  onDeleteField?: (fieldName: string) => void;
}

function EntityNode({ data }: { data: EntityNodeData }) {
  return (
    <div className="entity-node">
      <div className="entity-node-header bg-primary/10 text-primary flex justify-between items-center">
        <span>{data.name}</span>
        <div className="flex gap-1">
          {data.onAddField && (
            <Button 
              variant="ghost" 
              size="icon" 
              className="h-5 w-5" 
              onClick={(e) => {
                e.stopPropagation();
                data.onAddField?.();
              }}
            >
              <Plus className="h-3 w-3" />
            </Button>
          )}
          {data.onEditEntity && (
            <Button 
              variant="ghost" 
              size="icon" 
              className="h-5 w-5" 
              onClick={(e) => {
                e.stopPropagation();
                data.onEditEntity?.();
              }}
            >
              <Edit className="h-3 w-3" />
            </Button>
          )}
          {data.onDeleteEntity && (
            <Button 
              variant="ghost" 
              size="icon" 
              className="h-5 w-5 text-destructive" 
              onClick={(e) => {
                e.stopPropagation();
                if (confirm(`Are you sure you want to delete the ${data.name} entity?`)) {
                  data.onDeleteEntity?.();
                }
              }}
            >
              <Trash className="h-3 w-3" />
            </Button>
          )}
        </div>
      </div>
      <div className="entity-node-content">
        {data.fields.map((field) => (
          <div 
            key={field.name} 
            className={`entity-node-field ${field.primaryKey ? 'field-primary-key' : ''} 
                       ${field.unique ? 'field-unique' : ''} 
                       ${field.foreignKey ? 'field-foreign-key' : ''} 
                       flex justify-between`}
          >
            <div className="flex items-center gap-2">
              {field.primaryKey && (
                <span className="text-xs text-amber-500">🔑</span>
              )}
              <span>{field.name}</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="text-muted-foreground text-xs mr-2">{field.type}</div>
              
              {data.onEditField && (
                <Button 
                  variant="ghost" 
                  size="icon" 
                  className="h-5 w-5" 
                  onClick={(e) => {
                    e.stopPropagation();
                    data.onEditField?.(field);
                  }}
                >
                  <Edit className="h-3 w-3" />
                </Button>
              )}
              
              {data.onDeleteField && !field.primaryKey && (
                <Button 
                  variant="ghost" 
                  size="icon" 
                  className="h-5 w-5 text-destructive" 
                  onClick={(e) => {
                    e.stopPropagation();
                    if (confirm(`Are you sure you want to delete the ${field.name} field?`)) {
                      data.onDeleteField?.(field.name);
                    }
                  }}
                >
                  <Trash className="h-3 w-3" />
                </Button>
              )}
            </div>
            
            {field.foreignKey && (
              <Handle
                type="source"
                position={Position.Right}
                id={`${field.name}-source`}
                style={{ background: "#2563eb" }}
              />
            )}
          </div>
        ))}
      </div>
      
      {/* Generic handles for connections */}
      <Handle
        type="target"
        position={Position.Left}
        style={{ background: "#2563eb" }}
      />
      <Handle
        type="source"
        position={Position.Right}
        style={{ background: "#2563eb" }}
      />
    </div>
  );
}

export default memo(EntityNode);

export { EntityNode };
