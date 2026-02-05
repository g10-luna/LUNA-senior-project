import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { BookRequestForm } from "@/components/BookRequestForm";
import { ArrowLeft } from "lucide-react";

const BookRequest = () => {
  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-card shadow-card">
        <div className="container mx-auto px-4 py-4">
          <Link to="/">
            <Button variant="ghost" size="sm">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Home
            </Button>
          </Link>
        </div>
      </header>

      <main className="container mx-auto px-4 py-12">
        <div className="max-w-2xl mx-auto">
          <div className="text-center mb-8">
            <h1 className="text-4xl font-bold text-foreground mb-3">Book Request</h1>
            <p className="text-lg text-muted-foreground">
              Search for a book and our robot will deliver it to the front desk
            </p>
          </div>

          <BookRequestForm />

          <div className="mt-8 p-6 bg-muted/50 rounded-xl border border-border">
            <h3 className="font-semibold text-foreground mb-3">How it works:</h3>
            <ol className="space-y-2 text-sm text-muted-foreground">
              <li className="flex gap-2">
                <span className="font-semibold text-primary">1.</span>
                Search for your desired book using the title or author
              </li>
              <li className="flex gap-2">
                <span className="font-semibold text-primary">2.</span>
                Select the book from the search results
              </li>
              <li className="flex gap-2">
                <span className="font-semibold text-primary">3.</span>
                Enter your name and submit the request
              </li>
              <li className="flex gap-2">
                <span className="font-semibold text-primary">4.</span>
                Our robot will collect and deliver the book to the front desk
              </li>
              <li className="flex gap-2">
                <span className="font-semibold text-primary">5.</span>
                Pick up your book at the front desk within 15 minutes
              </li>
            </ol>
          </div>
        </div>
      </main>
    </div>
  );
};

export default BookRequest;
