"use client"

import type React from "react"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Separator } from "@/components/ui/separator"
import { Checkbox } from "@/components/ui/checkbox"
import { useToast } from "@/hooks/use-toast"
import { useJobContext } from "@/context/job-context"
import { createJob } from "@/lib/job-manager"
import { Plus, Trash2 } from "lucide-react"

export default function ExtractFields() {
  const { toast } = useToast()
  const { startJob } = useJobContext()
  const [mode, setMode] = useState<"fulltext" | "abstract">("abstract")
  const [file, setFile] = useState<File | null>(null)
  const [extractDesign, setExtractDesign] = useState(true)
  const [extractMethod, setExtractMethod] = useState(true)
  const [customFields, setCustomFields] = useState<Array<{ name: string; instruction: string }>>([])

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const selectedFile = e.target.files[0]
      if (selectedFile.type === "text/csv" || selectedFile.name.endsWith(".csv")) {
        setFile(selectedFile)
      } else {
        toast({
          title: "Invalid file format",
          description: "Please upload a CSV file",
          variant: "destructive",
        })
      }
    }
  }

  const addCustomField = () => {
    setCustomFields([...customFields, { name: "", instruction: "" }])
  }

  const updateCustomField = (index: number, field: "name" | "instruction", value: string) => {
    const updatedFields = [...customFields]
    updatedFields[index][field] = value
    setCustomFields(updatedFields)
  }

  const removeCustomField = (index: number) => {
    setCustomFields(customFields.filter((_, i) => i !== index))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!file) {
      toast({
        title: "No file selected",
        description: "Please upload a CSV file",
        variant: "destructive",
      })
      return
    }

    try {
      // Create fields configuration
      const fields = {
        design: extractDesign,
        method: extractMethod,
        custom: customFields.map((field) => ({
          name: field.name,
          instruction: field.instruction,
        })),
      }

      // Create and start the job
      const job = await createJob({
        filename: file.name,
        mode,
        fields,
        status: "pending",
        progress: 0,
        total: 0,
        created: new Date(),
        updated: new Date(),
      })

      // Process the CSV file
      const reader = new FileReader()
      reader.onload = async (event) => {
        if (event.target?.result) {
          const csvData = event.target.result as string
          startJob(job.id, csvData)

          toast({
            title: "Job started",
            description: "Your extraction job has been started",
          })
        }
      }
      reader.readAsText(file)
    } catch (error) {
      console.error("Error starting job:", error)
      toast({
        title: "Error",
        description: "Failed to start extraction job",
        variant: "destructive",
      })
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="space-y-4">
        <div>
          <h3 className="text-lg font-medium">Extraction Mode</h3>
          <p className="text-sm text-muted-foreground">Choose how to extract information from papers</p>
        </div>

        <RadioGroup value={mode} onValueChange={(value) => setMode(value as "fulltext" | "abstract")}>
          <div className="flex items-center space-x-2">
            <RadioGroupItem value="abstract" id="abstract" />
            <Label htmlFor="abstract">Title and Abstract Only</Label>
          </div>
          <div className="flex items-center space-x-2">
            <RadioGroupItem value="fulltext" id="fulltext" />
            <Label htmlFor="fulltext">Full Text (Requires PDF download)</Label>
          </div>
        </RadioGroup>
      </div>

      <Separator />

      <div className="space-y-4">
        <div>
          <h3 className="text-lg font-medium">Upload Papers</h3>
          <p className="text-sm text-muted-foreground">
            Upload a CSV file with paper details (Title, Abstract, Keywords, Authors, DOI)
          </p>
        </div>

        <div className="grid w-full max-w-sm items-center gap-1.5">
          <Label htmlFor="csv">CSV File</Label>
          <Input id="csv" type="file" accept=".csv" onChange={handleFileChange} />
          {file && <p className="text-sm text-muted-foreground">{file.name}</p>}
        </div>
      </div>

      <Separator />

      <div className="space-y-4">
        <div>
          <h3 className="text-lg font-medium">Fields to Extract</h3>
          <p className="text-sm text-muted-foreground">Select which fields to extract from papers</p>
        </div>

        <div className="space-y-2">
          <h4 className="text-sm font-medium">Default Fields</h4>
          <div className="flex items-center space-x-2">
            <Checkbox
              id="design"
              checked={extractDesign}
              onCheckedChange={(checked) => setExtractDesign(checked === true)}
            />
            <Label htmlFor="design">Design</Label>
          </div>
          <div className="flex items-center space-x-2">
            <Checkbox
              id="method"
              checked={extractMethod}
              onCheckedChange={(checked) => setExtractMethod(checked === true)}
            />
            <Label htmlFor="method">Method</Label>
          </div>
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <h4 className="text-sm font-medium">Custom Fields (Yes/No Questions)</h4>
            <Button type="button" variant="outline" size="sm" onClick={addCustomField}>
              <Plus className="h-4 w-4 mr-1" /> Add Field
            </Button>
          </div>

          {customFields.map((field, index) => (
            <div key={index} className="grid grid-cols-[1fr_1fr_auto] gap-2 items-start">
              <div>
                <Label htmlFor={`field-name-${index}`} className="text-xs">
                  Column Title
                </Label>
                <Input
                  id={`field-name-${index}`}
                  value={field.name}
                  onChange={(e) => updateCustomField(index, "name", e.target.value)}
                  placeholder="e.g., Has Control Group"
                />
              </div>
              <div>
                <Label htmlFor={`field-instruction-${index}`} className="text-xs">
                  Instruction
                </Label>
                <Input
                  id={`field-instruction-${index}`}
                  value={field.instruction}
                  onChange={(e) => updateCustomField(index, "instruction", e.target.value)}
                  placeholder="e.g., Does the paper include a control group?"
                />
              </div>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="mt-5"
                onClick={() => removeCustomField(index)}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          ))}
        </div>
      </div>

      <Button type="submit" className="w-full">
        Start Extraction
      </Button>
    </form>
  )
}
