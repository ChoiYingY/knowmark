import { AppShell } from "@/components/layout/AppShell";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router";

export default function ReadingQueue() {
  const navigate = useNavigate();

  return (
    <AppShell>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">Reading Queue</h1>
          <p className="text-sm text-muted-foreground mt-1">Links you want to read later.</p>
        </div>

        <Tabs defaultValue="reading-queue" className="w-full">
          <TabsList>
            <TabsTrigger value="library" onClick={() => navigate("/library")}>
              Library
            </TabsTrigger>
            <TabsTrigger value="reading-queue">Reading Queue</TabsTrigger>
          </TabsList>
        </Tabs>
        
        <hr className="border-t border-border -mt-6 mb-6" />

        <div className="flex flex-col items-center justify-center text-center py-16 gap-3">
          <Clock className="h-12 w-12 text-muted-foreground/50" />
          <h3 className="text-lg font-medium text-foreground">Your reading queue is empty.</h3>
          <p className="text-sm text-muted-foreground">Set a reminder on any saved link to add it here.</p>
          <div className="flex gap-4 mt-4">
            <Button onClick={() => navigate("/save")}>
              Add Item
            </Button>
            <Button variant="outline" onClick={() => navigate("/library")}>
              Browse Library
            </Button>
          </div>
        </div>
      </div>
    </AppShell>
  );
}
