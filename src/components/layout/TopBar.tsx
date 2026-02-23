import { useNavigate } from "react-router";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";

export function TopBar({ children }: { children?: React.ReactNode }) {
  const navigate = useNavigate();

  return (
    <header className="h-14 border-b border-border bg-background px-6 flex items-center justify-between sticky top-0 z-10">
      <div className="flex items-center gap-4">
        {children}
      </div>
      
      <Button 
        onClick={() => navigate("/save")}
        size="sm"
        className="gap-2"
      >
        <Plus className="h-4 w-4" />
        Add Link
      </Button>
    </header>
  );
}
