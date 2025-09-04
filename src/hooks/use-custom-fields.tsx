import { nameToKey } from "@/lib/openai-service";
import { downloadFile } from "@/lib/utils";
import { CustomField } from "@/types";
import { useState } from "react";
import { toast } from "sonner";


export function downloadCustomFields(customFields: CustomField[]) {
  if (customFields.length === 0) {
    toast.error("No custom fields to download");
    return;
  }

  const fieldsData = {
    customFields: customFields,
  };

  downloadFile(
    "custom-fields.json",
    JSON.stringify(fieldsData, null, 2),
    "application/json"
  );
  toast.success("Custom fields downloaded successfully");
};
export function useCustomFields() {
  const [customFields, setCustomFields] = useState<CustomField[]>([]);

  const addCustomField = () => {
    setCustomFields([...customFields, { 
      name: "", 
      instruction: "",
      recheck_yes: false,
      recheck_no: false,
      force_recheck: false
    }]);
  };

  const removeCustomField = (index: number) => {
    setCustomFields(customFields.filter((_, i) => i !== index));
  };

  const updateCustomField = (
    index: number,
    field: "name" | "instruction" | "recheck_yes" | "recheck_no" | "force_recheck",
    value: string | boolean
  ) => {
    const updatedFields = [...customFields];
    if (field === "name" || field === "instruction") {
      (updatedFields[index] as any)[field] = value as string;
    } else {
      // Handle mutual exclusivity for the three options
      if (value === true) {
        // If setting one option to true, set the others to false
        updatedFields[index].recheck_yes = field === "recheck_yes";
        updatedFields[index].recheck_no = field === "recheck_no";
        updatedFields[index].force_recheck = field === "force_recheck";
      } else {
        // If setting to false, just update the specific field
        (updatedFields[index] as any)[field] = false;
      }
    }
    setCustomFields(updatedFields);
  };


  const handleUploadCustomFields = (e: React.ChangeEvent<HTMLInputElement>) => {
    console.log(e.target.files)
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.name.endsWith('.json')) {
      toast.error("Please select a JSON file");
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const jsonData = JSON.parse(event.target?.result as string);

        // Validate the JSON structure
        if (!jsonData.customFields || !Array.isArray(jsonData.customFields)) {
          toast.error("Invalid JSON format. Expected customFields array.");
          return;
        }

        // Validate each custom field has required properties
        const validFields = jsonData.customFields.every((field: any) =>
          typeof field.name === 'string' && 
          typeof field.instruction === 'string' &&
          (field.recheck_yes === undefined || typeof field.recheck_yes === 'boolean') &&
          (field.recheck_no === undefined || typeof field.recheck_no === 'boolean') &&
          (field.force_recheck === undefined || typeof field.force_recheck === 'boolean')
        );

        if (!validFields) {
          toast.error("Invalid custom fields format. Each field must have 'name' and 'instruction' properties, with optional boolean flags.");
          return;
        }

        setCustomFields(jsonData.customFields);
        toast.success(`Successfully imported ${jsonData.customFields.length} custom fields`);
      } catch (error) {
        toast.error("Invalid JSON file format");
        console.error("Error parsing JSON:", error);
      }
    };
    reader.readAsText(file);

    // Reset the input value so the same file can be selected again
    e.target.value = '';
  };
  return {
    customFields,
    addCustomField,
    removeCustomField,
    updateCustomField,
    downloadCustomFields: () => downloadCustomFields(customFields),
    handleUploadCustomFields
  };
}