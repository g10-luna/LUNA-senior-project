import { LibraryCatalog } from "@/components/LibraryCatalog";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { ArrowLeft } from "lucide-react";

const Catalog = () => {
  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-card/50 backdrop-blur-sm sticky top-0 z-10">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center gap-4">
            <Link to="/">
              <Button variant="ghost" size="sm">
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back to Dashboard
              </Button>
            </Link>
            <h1 className="text-2xl font-bold text-foreground">Library Catalog</h1>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        <LibraryCatalog />
      </main>
    </div>
  );
};

export default Catalog;
