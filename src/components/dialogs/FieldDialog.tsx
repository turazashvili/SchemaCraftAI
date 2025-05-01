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
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { SchemaEntity, SchemaField } from "@/services/aiSchemaService";

interface FieldDialogProps {
  mode: "add" | "edit";
  field: SchemaField | null;
  entity: SchemaEntity | null;
  allEntities: SchemaEntity[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (field: SchemaField, isNew: boolean) => void;
}

export function FieldDialog({
  mode,
  field,
  entity,
  allEntities,
  open,
  onOpenChange,
  onSave,
}: FieldDialogProps) {
  // Field properties
  const [fieldName, setFieldName] = useState("");
  const [fieldType, setFieldType] = useState("string");
  const [isPrimaryKey, setIsPrimaryKey] = useState(false);
  const [isUnique, setIsUnique] = useState(false);
  const [isForeignKey, setIsForeignKey] = useState(false);
  const [foreignEntity, setForeignEntity] = useState("");
  const [foreignField, setForeignField] = useState("");
  
  // Form validation
  const [isValid, setIsValid] = useState(false);
  
  // Available field types
  const fieldTypes = [
    "string", 
    "text", 
    "integer", 
    "float", 
    "decimal", 
    "boolean", 
    "date", 
    "timestamp", 
    "uuid", 
    "json"
  ];

  // Set initial values when field changes
  useEffect(() => {
    if (field && mode === "edit") {
      setFieldName(field.name);
      setFieldType(field.type);
      setIsPrimaryKey(field.primaryKey || false);
      setIsUnique(field.unique || false);
      setIsForeignKey(!!field.foreignKey);
      
      if (field.foreignKey) {
        setForeignEntity(field.foreignKey.entity);
        setForeignField(field.foreignKey.field);
      } else {
        setForeignEntity("");
        setForeignField("");
      }
    } else {
      setFieldName("");
      setFieldType("string");
      setIsPrimaryKey(false);
      setIsUnique(false);
      setIsForeignKey(false);
      setForeignEntity("");
      setForeignField("");
    }
  }, [field, mode]);

  // Validate form
  useEffect(() => {
    let valid = fieldName.trim().length > 0 && 
                /^[a-z][a-z0-9_]*$/.test(fieldName) &&
                fieldType.trim().length > 0;
    
    if (isForeignKey) {
      valid = valid && 
              foreignEntity.trim().length > 0 && 
              foreignField.trim().length > 0;
    }
    
    setIsValid(valid);
  }, [fieldName, fieldType, isForeignKey, foreignEntity, foreignField]);

  // Get available fields for the selected foreign entity
  const getAvailableFields = () => {
    const selectedEntity = allEntities.find(e => e.name === foreignEntity);
    if (!selectedEntity) return [];
    return selectedEntity.fields;
  };

  const handleSave = () => {
    if (!isValid) return;

    const newField: SchemaField = {
      name: fieldName,
      type: fieldType,
      primaryKey: isPrimaryKey,
      unique: isUnique,
    };

    if (isForeignKey) {
      newField.foreignKey = {
        entity: foreignEntity,
        field: foreignField,
      };
    }

    onSave(newField, mode === "add");
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>
            {mode === "add" ? "Add New Field" : "Edit Field"}
          </DialogTitle>
          <DialogDescription>
            {mode === "add" 
              ? `Add a field to the "${entity?.name}" entity` 
              : `Edit field in the "${entity?.name}" entity`}
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 py-4">
          {/* Field Name */}
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="name" className="text-right">
              Name
            </Label>
            <Input
              id="name"
              className="col-span-3"
              value={fieldName}
              onChange={(e) => setFieldName(e.target.value)}
              placeholder="e.g. email, name, price"
              disabled={field?.primaryKey}
            />
            {fieldName.trim().length > 0 && !/^[a-z][a-z0-9_]*$/.test(fieldName) && (
              <div className="col-span-3 col-start-2 text-xs text-destructive">
                Field name must start with a lowercase letter and contain only lowercase letters, numbers, and underscores.
              </div>
            )}
          </div>

          {/* Field Type */}
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="type" className="text-right">
              Type
            </Label>
            <Select 
              value={fieldType} 
              onValueChange={setFieldType}
              disabled={field?.primaryKey}
            >
              <SelectTrigger className="col-span-3">
                <SelectValue placeholder="Select a field type" />
              </SelectTrigger>
              <SelectContent>
                {fieldTypes.map(type => (
                  <SelectItem key={type} value={type}>{type}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Field Properties */}
          <div className="grid grid-cols-4 items-center gap-4">
            <div className="text-right text-sm">
              Properties
            </div>
            <div className="col-span-3 space-y-2">
              {/* Primary Key */}
              <div className="flex items-center space-x-2">
                <Checkbox 
                  id="primaryKey" 
                  checked={isPrimaryKey} 
                  onCheckedChange={(checked) => {
                    setIsPrimaryKey(checked === true);
                    // Primary key should also be unique
                    if (checked === true) {
                      setIsUnique(true);
                    }
                  }}
                  disabled={mode === "edit" && field?.primaryKey} // Can't change primary key for existing fields
                />
                <Label htmlFor="primaryKey">Primary Key</Label>
              </div>
              
              {/* Unique */}
              <div className="flex items-center space-x-2">
                <Checkbox 
                  id="unique" 
                  checked={isUnique} 
                  onCheckedChange={(checked) => setIsUnique(checked === true)}
                  disabled={isPrimaryKey} // Primary keys are always unique
                />
                <Label htmlFor="unique">Unique</Label>
              </div>
              
              {/* Foreign Key */}
              <div className="flex items-center space-x-2">
                <Checkbox 
                  id="foreignKey" 
                  checked={isForeignKey} 
                  onCheckedChange={(checked) => setIsForeignKey(checked === true)}
                  disabled={isPrimaryKey} // Primary keys can't be foreign keys
                />
                <Label htmlFor="foreignKey">Foreign Key</Label>
              </div>
            </div>
          </div>

          {/* Foreign Key Options - only show if foreign key is checked */}
          {isForeignKey && (
            <>
              {/* Reference Entity */}
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="foreignEntity" className="text-right">
                  Reference Entity
                </Label>
                <Select 
                  value={foreignEntity} 
                  onValueChange={(value) => {
                    setForeignEntity(value);
                    setForeignField(""); // Reset field when entity changes
                  }}
                >
                  <SelectTrigger className="col-span-3">
                    <SelectValue placeholder="Select an entity" />
                  </SelectTrigger>
                  <SelectContent>
                    {allEntities
                      .filter(e => e.name !== entity?.name) // Can't reference self
                      .map(e => (
                        <SelectItem key={e.name} value={e.name}>{e.name}</SelectItem>
                      ))
                    }
                  </SelectContent>
                </Select>
              </div>

              {/* Reference Field */}
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="foreignField" className="text-right">
                  Reference Field
                </Label>
                <Select 
                  value={foreignField} 
                  onValueChange={setForeignField}
                  disabled={!foreignEntity}
                >
                  <SelectTrigger className="col-span-3">
                    <SelectValue placeholder="Select a field" />
                  </SelectTrigger>
                  <SelectContent>
                    {getAvailableFields()
                      .filter(f => f.primaryKey) // Only reference primary keys
                      .map(f => (
                        <SelectItem key={f.name} value={f.name}>{f.name}</SelectItem>
                      ))
                    }
                  </SelectContent>
                </Select>
              </div>
            </>
          )}
        </div>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button type="button" onClick={handleSave} disabled={!isValid}>
            {mode === "add" ? "Add Field" : "Update Field"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
} 