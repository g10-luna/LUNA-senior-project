import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { BookOpen, Plus, Search, Edit, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

interface Book {
  id: string;
  title: string;
  author: string;
  isbn: string | null;
  location: string;
  available: boolean;
  category: string | null;
  description: string | null;
}

export const LibraryCatalog = () => {
  const [books, setBooks] = useState<Book[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  
  const [newBook, setNewBook] = useState({
    title: "",
    author: "",
    isbn: "",
    location: "",
    category: "",
    description: "",
    available: true,
  });

  useEffect(() => {
    fetchBooks();
  }, []);

  const fetchBooks = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("books")
      .select("*")
      .order("title");

    if (error) {
      toast.error("Failed to load books", { description: error.message });
    } else {
      setBooks(data || []);
    }
    setLoading(false);
  };

  const handleAddBook = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!newBook.title || !newBook.author || !newBook.location) {
      toast.error("Please fill in all required fields");
      return;
    }

    const { error } = await supabase.from("books").insert([
      {
        title: newBook.title,
        author: newBook.author,
        isbn: newBook.isbn || null,
        location: newBook.location,
        category: newBook.category || null,
        description: newBook.description || null,
        available: newBook.available,
      },
    ]);

    if (error) {
      toast.error("Failed to add book", { description: error.message });
    } else {
      toast.success("Book added successfully");
      setIsAddDialogOpen(false);
      setNewBook({
        title: "",
        author: "",
        isbn: "",
        location: "",
        category: "",
        description: "",
        available: true,
      });
      fetchBooks();
    }
  };

  const handleToggleAvailability = async (bookId: string, currentStatus: boolean) => {
    const { error } = await supabase
      .from("books")
      .update({ available: !currentStatus })
      .eq("id", bookId);

    if (error) {
      toast.error("Failed to update book status", { description: error.message });
    } else {
      toast.success(`Book marked as ${!currentStatus ? "available" : "unavailable"}`);
      fetchBooks();
    }
  };

  const handleDeleteBook = async (bookId: string) => {
    const { error } = await supabase.from("books").delete().eq("id", bookId);

    if (error) {
      toast.error("Failed to delete book", { description: error.message });
    } else {
      toast.success("Book deleted successfully");
      fetchBooks();
    }
  };

  const filteredBooks = books.filter(
    (book) =>
      book.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      book.author.toLowerCase().includes(searchQuery.toLowerCase()) ||
      book.location.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <Card className="p-6 bg-gradient-card shadow-card">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-xl font-semibold text-card-foreground flex items-center gap-2">
          <BookOpen className="w-5 h-5 text-primary" />
          Library Catalog
          <Badge variant="secondary" className="ml-2">
            {books.length} Books
          </Badge>
        </h3>
        <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
          <DialogTrigger asChild>
            <Button size="sm" className="shadow-elevated">
              <Plus className="w-4 h-4 mr-2" />
              Add Book
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Add New Book</DialogTitle>
              <DialogDescription>
                Enter the details of the book to add to the library catalog
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleAddBook} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="title">Title *</Label>
                  <Input
                    id="title"
                    value={newBook.title}
                    onChange={(e) => setNewBook({ ...newBook, title: e.target.value })}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="author">Author *</Label>
                  <Input
                    id="author"
                    value={newBook.author}
                    onChange={(e) => setNewBook({ ...newBook, author: e.target.value })}
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="isbn">ISBN</Label>
                  <Input
                    id="isbn"
                    value={newBook.isbn}
                    onChange={(e) => setNewBook({ ...newBook, isbn: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="location">Location *</Label>
                  <Input
                    id="location"
                    placeholder="e.g., Section A, Shelf 3"
                    value={newBook.location}
                    onChange={(e) => setNewBook({ ...newBook, location: e.target.value })}
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="category">Category</Label>
                  <Input
                    id="category"
                    placeholder="e.g., Fiction, Science"
                    value={newBook.category}
                    onChange={(e) => setNewBook({ ...newBook, category: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="available">Availability</Label>
                  <Select
                    value={newBook.available.toString()}
                    onValueChange={(value) =>
                      setNewBook({ ...newBook, available: value === "true" })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="true">Available</SelectItem>
                      <SelectItem value="false">Checked Out</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  placeholder="Brief description of the book"
                  value={newBook.description}
                  onChange={(e) => setNewBook({ ...newBook, description: e.target.value })}
                  rows={3}
                />
              </div>

              <div className="flex justify-end gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsAddDialogOpen(false)}
                >
                  Cancel
                </Button>
                <Button type="submit">Add Book</Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="mb-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search by title, author, or location..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
      </div>

      <ScrollArea className="h-[600px] pr-4">
        {loading ? (
          <div className="text-center py-8 text-muted-foreground">Loading books...</div>
        ) : filteredBooks.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <BookOpen className="w-12 h-12 mx-auto mb-2 opacity-50" />
            <p>No books found</p>
          </div>
        ) : (
          <div className="space-y-3">
            {filteredBooks.map((book) => (
              <div
                key={book.id}
                className="p-4 rounded-lg border border-border bg-card hover:shadow-card transition-shadow"
              >
                <div className="flex justify-between items-start mb-2">
                  <div className="flex-1">
                    <div className="flex items-start justify-between mb-1">
                      <h4 className="font-semibold text-card-foreground">{book.title}</h4>
                      <Badge
                        className={
                          book.available
                            ? "bg-success text-success-foreground"
                            : "bg-muted text-muted-foreground"
                        }
                      >
                        {book.available ? "Available" : "Checked Out"}
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground">by {book.author}</p>
                    {book.category && (
                      <Badge variant="secondary" className="mt-2">
                        {book.category}
                      </Badge>
                    )}
                  </div>
                </div>

                <div className="mt-3 space-y-1 text-sm">
                  <p className="text-muted-foreground">
                    <span className="font-medium">Location:</span> {book.location}
                  </p>
                  {book.isbn && (
                    <p className="text-muted-foreground">
                      <span className="font-medium">ISBN:</span> {book.isbn}
                    </p>
                  )}
                  {book.description && (
                    <p className="text-muted-foreground mt-2">{book.description}</p>
                  )}
                </div>

                <div className="flex gap-2 mt-4">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleToggleAvailability(book.id, book.available)}
                  >
                    Mark as {book.available ? "Unavailable" : "Available"}
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleDeleteBook(book.id)}
                    className="text-destructive hover:bg-destructive hover:text-destructive-foreground"
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </ScrollArea>
    </Card>
  );
};
