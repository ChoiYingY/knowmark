import { AppShell } from "@/components/layout/AppShell";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { BookOpen } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router";

export default function Library() {
  const navigate = useNavigate();

  return (
    <AppShell>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">Library</h1>
          <p className="text-sm text-muted-foreground mt-1">All your saved links, organized.</p>
        </div>

        <Tabs defaultValue="library" className="w-full">
          <TabsList>
            <TabsTrigger value="library">Library</TabsTrigger>
            <TabsTrigger value="reading-queue" onClick={() => navigate("/reading-queue")}>
              Reading Queue
            </TabsTrigger>
          </TabsList>
        </Tabs>
        
        <hr className="border-t border-border -mt-6 mb-6" />

        <div className="flex flex-col items-center justify-center text-center py-16 gap-3">
          <BookOpen className="h-12 w-12 text-muted-foreground/50" />
          <h3 className="text-lg font-medium text-foreground">Your library is empty.</h3>
          <p className="text-sm text-muted-foreground">Start by adding your first link.</p>
          <Button onClick={() => navigate("/save")} className="mt-4">
            Add your first link
          </Button>
        </div>
      </div>
    </AppShell>
  );
}
