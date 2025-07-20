"use client"

import { FileText, Settings, Database, Download, Brain, ChevronRight } from "lucide-react"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
  useSidebar,
} from "@/components/ui/sidebar"

interface AppSidebarProps {
  activeView: string
  setActiveView: (view: string) => void
}

// Menu items
const items = [
  {
    title: "Extract Fields",
    url: "extract",
    icon: FileText,
    description: "Upload and extract fields from papers",
  },
  {
    title: "Job Management",
    url: "jobs",
    icon: Settings,
    description: "Manage extraction jobs and progress",
  },
]

const tools = [
  {
    title: "PDF Download",
    icon: Download,
    description: "Download PDFs for full-text extraction",
  },
  {
    title: "AI Processing",
    icon: Brain,
    description: "OpenAI-powered field extraction",
  },
  {
    title: "Data Storage",
    icon: Database,
    description: "IndexedDB for local data persistence",
  },
]

export function AppSidebar({ activeView, setActiveView }: AppSidebarProps) {
  const { state } = useSidebar()

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader>
        <div className="flex items-center gap-2 px-2 py-1">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
            <Brain className="h-4 w-4" />
          </div>
          <div className="grid flex-1 text-left text-sm leading-tight">
            <span className="truncate font-semibold">IDEAL Tools</span>
            <span className="truncate text-xs text-muted-foreground">Field Extraction</span>
          </div>
        </div>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Navigation</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {items.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton
                    asChild
                    isActive={activeView === item.url}
                    tooltip={state === "collapsed" ? item.description : undefined}
                  >
                    <button onClick={() => setActiveView(item.url)}>
                      <item.icon />
                      <span>{item.title}</span>
                      {activeView === item.url && <ChevronRight className="ml-auto h-4 w-4" />}
                    </button>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarGroup>
          <SidebarGroupLabel>Features</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {tools.map((tool) => (
                <SidebarMenuItem key={tool.title}>
                  <SidebarMenuButton tooltip={state === "collapsed" ? tool.description : undefined}>
                    <tool.icon />
                    <span>{tool.title}</span>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter>
        <div className="p-2 text-xs text-muted-foreground">
          <div className="font-medium">Academic Paper Processing</div>
          <div>AI-powered field extraction tool</div>
        </div>
      </SidebarFooter>

      <SidebarRail />
    </Sidebar>
  )
}
