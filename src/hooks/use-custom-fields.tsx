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
    setCustomFields([...customFields, { name: "", instruction: "" }]);
  };

  const removeCustomField = (index: number) => {
    setCustomFields(customFields.filter((_, i) => i !== index));
  };

  const updateCustomField = (
    index: number,
    field: "name" | "instruction",
    value: string
  ) => {
    const updatedFields = [...customFields];
    updatedFields[index][field] = value;
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
          typeof field.name === 'string' && typeof field.instruction === 'string'
        );

        if (!validFields) {
          toast.error("Invalid custom fields format. Each field must have 'name' and 'instruction' properties.");
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