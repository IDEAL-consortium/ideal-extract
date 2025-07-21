import { useState } from "react"
import { SidebarProvider, SidebarInset, SidebarTrigger } from "@/components/ui/sidebar"
import { AppSidebar } from "@/components/app-sidebar"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import ExtractFields from "@/components/extract-fields"
import JobManagement from "@/components/job-management"
import { JobProvider } from "@/context/job-context"

export default function Home() {
  const [activeView, setActiveView] = useState("extract")

  const getPageTitle = () => {
    switch (activeView) {
      case "extract":
        return "Extract Fields"
      case "jobs":
        return "Job Management"
      default:
        return "IDEAL Extraction Tools"
    }
  }

  const getPageDescription = () => {
    switch (activeView) {
      case "extract":
        return "Upload a CSV with paper details or PDFs to extract fields using AI"
      case "jobs":
        return "Manage extraction jobs and download results"
      default:
        return "Academic paper field extraction tool"
    }
  }

  return (
    <JobProvider>
      <SidebarProvider>
        <AppSidebar activeView={activeView} setActiveView={setActiveView} />
        <SidebarInset>
          {/* Header with sidebar trigger */}
          <header className="flex h-16 shrink-0 items-center gap-2 border-b px-4">
            <SidebarTrigger className="-ml-1" />
            <Separator orientation="vertical" className="mr-2 h-4" />
            <div className="flex flex-col">
              <h1 className="text-lg font-semibold">{getPageTitle()}</h1>
              <p className="text-sm text-muted-foreground">{getPageDescription()}</p>
            </div>
          </header>

          {/* Main content */}
          <main className="flex-1 p-6">
            {activeView === "extract" && (
              <Card>
                <CardHeader>
                  <CardTitle>Extract Fields</CardTitle>
                  <CardDescription>Upload a CSV with paper details or PDFs to extract fields using AI</CardDescription>
                </CardHeader>
                <CardContent>
                  <ExtractFields />
                </CardContent>
              </Card>
            )}

            {activeView === "jobs" && (
              <Card>
                <CardHeader>
                  <CardTitle>Job Management</CardTitle>
                  <CardDescription>Manage extraction jobs and download results</CardDescription>
                </CardHeader>
                <CardContent>
                  <JobManagement />
                </CardContent>
              </Card>
            )}
          </main>
        </SidebarInset>
      </SidebarProvider>
    </JobProvider>
  )
}