import React, { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SchemaEntity } from "@/services/aiSchemaService";

interface EntityDialogProps {
  mode: "add" | "edit";
  entity: SchemaEntity | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (entity: SchemaEntity, isNew: boolean) => void;
}

export function EntityDialog({
  mode,
  entity,
  open,
  onOpenChange,
  onSave,
}: EntityDialogProps) {
  // Initialize form state
  const [entityName, setEntityName] = useState("");
  const [isValid, setIsValid] = useState(false);

  // Set initial values when entity changes
  useEffect(() => {
    if (entity && mode === "edit") {
      setEntityName(entity.name);
    } else {
      setEntityName("");
    }
  }, [entity, mode]);

  // Validate form
  useEffect(() => {
    const valid = entityName.trim().length > 0 && 
                  /^[a-z][a-z0-9_]*$/.test(entityName);
    setIsValid(valid);
  }, [entityName]);

  const handleSave = () => {
    if (!isValid) return;

    const isNew = mode === "add";
    const newEntity: SchemaEntity = {
      name: entityName,
      // When creating a new entity, add the default primary key field
      fields: isNew 
        ? [
            {
              name: "id",
              type: "uuid",
              primaryKey: true,
            },
            {
              name: "created_at",
              type: "timestamp",
            },
            {
              name: "updated_at",
              type: "timestamp",
            }
          ] 
        : (entity?.fields || [])
    };

    onSave(newEntity, isNew);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>
            {mode === "add" ? "Add New Entity" : "Edit Entity"}
          </DialogTitle>
          <DialogDescription>
            {mode === "add" 
              ? "Create a new database entity with a unique name." 
              : "Update the entity details."}
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 py-4">
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="name" className="text-right">
              Name
            </Label>
            <Input
              id="name"
              className="col-span-3"
              value={entityName}
              onChange={(e) => setEntityName(e.target.value)}
              placeholder="e.g. users, products, orders"
            />
            {entityName.trim().length > 0 && !/^[a-z][a-z0-9_]*$/.test(entityName) && (
              <div className="col-span-3 col-start-2 text-xs text-destructive">
                Entity name must start with a lowercase letter and contain only lowercase letters, numbers, and underscores.
              </div>
            )}
          </div>
        </div>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button type="button" onClick={handleSave} disabled={!isValid}>
            {mode === "add" ? "Create Entity" : "Update Entity"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
} 