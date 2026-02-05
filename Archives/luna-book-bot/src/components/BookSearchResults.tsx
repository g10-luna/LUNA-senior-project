import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { BookOpen, MapPin, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface Book {
  id: string;
  title: string;
  author: string;
  isbn?: string;
  call_number?: string;
  shelf_location: string;
  category?: string;
  available: boolean;
}

interface BookSearchResultsProps {
  books: Book[];
  userName: string;
  onRequestSuccess?: () => void;
}

export const BookSearchResults = ({ books, userName, onRequestSuccess }: BookSearchResultsProps) => {
  const [requestingBook, setRequestingBook] = useState<string | null>(null);
  const { toast } = useToast();

  const handleShowMeWhere = async (book: Book) => {
    setRequestingBook(book.id);

    try {
      const { data, error } = await supabase.functions.invoke('request-robot-navigation', {
        body: { bookId: book.id, studentName: userName }
      });

      if (error) throw error;

      toast({
        title: "Navigation Request Sent!",
        description: `LUNA will guide you to ${book.shelf_location}. Check the Active Requests section for updates.`,
      });

      onRequestSuccess?.();
    } catch (error) {
      console.error('Error requesting navigation:', error);
      toast({
        title: "Request Failed",
        description: "Unable to send navigation request. Please try again.",
        variant: "destructive"
      });
    } finally {
      setRequestingBook(null);
    }
  };

  if (books.length === 0) {
    return (
      <Card>
        <CardContent className="p-8 text-center">
          <BookOpen className="h-12 w-12 mx-auto mb-3 text-muted-foreground" />
          <p className="text-muted-foreground">No books found</p>
          <p className="text-sm text-muted-foreground mt-1">Try a different search term</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {books.map((book) => (
        <Card key={book.id} className="overflow-hidden hover:shadow-md transition-shadow">
          <CardHeader className="pb-3">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <CardTitle className="text-lg mb-1">{book.title}</CardTitle>
                <CardDescription className="text-sm">{book.author}</CardDescription>
                {book.category && (
                  <Badge variant="secondary" className="mt-2">
                    {book.category}
                  </Badge>
                )}
              </div>
              <Badge className={book.available ? "bg-success text-success-foreground" : "bg-muted"}>
                {book.available ? "Available" : "Checked Out"}
              </Badge>
            </div>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2 text-sm text-muted-foreground mb-4">
              <MapPin className="h-4 w-4" />
              <span className="font-medium">{book.shelf_location}</span>
              {book.call_number && (
                <span className="text-muted-foreground ml-2">• {book.call_number}</span>
              )}
            </div>
            {book.available && (
              <Button
                onClick={() => handleShowMeWhere(book)}
                disabled={requestingBook === book.id}
                className="w-full"
              >
                {requestingBook === book.id ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    Requesting...
                  </>
                ) : (
                  <>
                    <MapPin className="h-4 w-4 mr-2" />
                    Show Me Where
                  </>
                )}
              </Button>
            )}
          </CardContent>
        </Card>
      ))}
    </div>
  );
};