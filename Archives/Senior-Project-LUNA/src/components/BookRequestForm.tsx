import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Search, BookOpen, Send } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

interface Book {
  id: string;
  title: string;
  author: string;
  location: string;
  available: boolean;
  category: string | null;
}

export const BookRequestForm = () => {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedBook, setSelectedBook] = useState<Book | null>(null);
  const [studentName, setStudentName] = useState("");
  const [books, setBooks] = useState<Book[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (searchQuery.length > 2) {
      searchBooks();
    } else {
      setBooks([]);
    }
  }, [searchQuery]);

  const searchBooks = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("books")
      .select("id, title, author, location, available, category")
      .or(`title.ilike.%${searchQuery}%,author.ilike.%${searchQuery}%`)
      .limit(10);

    if (error) {
      toast.error("Failed to search books", { description: error.message });
      setBooks([]);
    } else {
      setBooks(data || []);
    }
    setLoading(false);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedBook || !studentName) {
      toast.error("Please select a book and enter your name");
      return;
    }

    if (!selectedBook.available) {
      toast.error("This book is currently unavailable");
      return;
    }

    toast.success(`Request submitted for "${selectedBook.title}"`, {
      description: "The robot will deliver your book shortly!",
    });

    setSelectedBook(null);
    setStudentName("");
    setSearchQuery("");
  };

  return (
    <Card className="p-6 bg-gradient-card shadow-card">
      <h2 className="text-2xl font-bold text-card-foreground mb-6 flex items-center gap-2">
        <BookOpen className="w-6 h-6 text-primary" />
        Request a Book
      </h2>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="space-y-2">
          <Label htmlFor="search" className="text-card-foreground">Search Books</Label>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              id="search"
              placeholder="Search by title or author..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>

        {searchQuery && searchQuery.length > 2 && (
          <div className="space-y-2 max-h-60 overflow-y-auto">
            {loading ? (
              <p className="text-center text-muted-foreground py-4">Searching...</p>
            ) : books.length > 0 ? (
              books.map((book) => (
                <div
                  key={book.id}
                  onClick={() => book.available && setSelectedBook(book)}
                  className={`p-4 rounded-lg border cursor-pointer transition-all ${
                    selectedBook?.id === book.id
                      ? "border-primary bg-primary/5 shadow-card"
                      : book.available
                      ? "border-border hover:border-primary/50 hover:shadow-card"
                      : "border-border opacity-50 cursor-not-allowed"
                  }`}
                >
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="font-semibold text-card-foreground">{book.title}</p>
                      <p className="text-sm text-muted-foreground">{book.author}</p>
                      <p className="text-xs text-muted-foreground mt-1">📍 {book.location}</p>
                    </div>
                    <span
                      className={`text-xs px-2 py-1 rounded-full ${
                        book.available
                          ? "bg-success/10 text-success"
                          : "bg-muted text-muted-foreground"
                      }`}
                    >
                      {book.available ? "Available" : "Checked Out"}
                    </span>
                  </div>
                </div>
              ))
            ) : (
              <p className="text-center text-muted-foreground py-4">
                {searchQuery.length <= 2 ? "Type at least 3 characters to search" : "No books found"}
              </p>
            )}
          </div>
        )}

        {selectedBook && (
          <div className="space-y-4 p-4 bg-primary/5 rounded-lg border border-primary/20">
            <div>
              <p className="text-sm font-medium text-card-foreground">Selected Book:</p>
              <p className="text-lg font-semibold text-primary">{selectedBook.title}</p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="studentName" className="text-card-foreground">Your Name</Label>
              <Input
                id="studentName"
                placeholder="Enter your name"
                value={studentName}
                onChange={(e) => setStudentName(e.target.value)}
                required
              />
            </div>

            <Button type="submit" className="w-full shadow-elevated">
              <Send className="w-4 h-4 mr-2" />
              Submit Request
            </Button>
          </div>
        )}
      </form>
    </Card>
  );
};
