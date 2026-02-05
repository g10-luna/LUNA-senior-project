-- Create books table for library catalog
CREATE TABLE public.books (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  author TEXT NOT NULL,
  isbn TEXT,
  location TEXT NOT NULL,
  available BOOLEAN NOT NULL DEFAULT true,
  category TEXT,
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.books ENABLE ROW LEVEL SECURITY;

-- Create policies for librarian access (authenticated users can manage books)
CREATE POLICY "Authenticated users can view all books"
ON public.books
FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Authenticated users can insert books"
ON public.books
FOR INSERT
TO authenticated
WITH CHECK (true);

CREATE POLICY "Authenticated users can update books"
ON public.books
FOR UPDATE
TO authenticated
USING (true);

CREATE POLICY "Authenticated users can delete books"
ON public.books
FOR DELETE
TO authenticated
USING (true);

-- Public read access for students requesting books
CREATE POLICY "Public can view available books"
ON public.books
FOR SELECT
TO anon
USING (true);

-- Create function to update timestamps
CREATE OR REPLACE FUNCTION public.update_books_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_books_updated_at
BEFORE UPDATE ON public.books
FOR EACH ROW
EXECUTE FUNCTION public.update_books_updated_at();

-- Insert sample books data
INSERT INTO public.books (title, author, isbn, location, available, category, description) VALUES
('To Kill a Mockingbird', 'Harper Lee', '978-0061120084', 'Section A, Shelf 3', true, 'Fiction', 'A classic novel of modern American literature'),
('1984', 'George Orwell', '978-0451524935', 'Section B, Shelf 1', true, 'Fiction', 'A dystopian social science fiction novel'),
('The Great Gatsby', 'F. Scott Fitzgerald', '978-0743273565', 'Section A, Shelf 5', false, 'Fiction', 'A story of decadence and excess'),
('Pride and Prejudice', 'Jane Austen', '978-0141439518', 'Section C, Shelf 2', true, 'Romance', 'A romantic novel of manners'),
('The Catcher in the Rye', 'J.D. Salinger', '978-0316769174', 'Section A, Shelf 7', true, 'Fiction', 'A story about teenage rebellion'),
('Harry Potter and the Sorcerer''s Stone', 'J.K. Rowling', '978-0439708180', 'Section D, Shelf 1', true, 'Fantasy', 'The first book in the Harry Potter series'),
('The Hobbit', 'J.R.R. Tolkien', '978-0547928227', 'Section D, Shelf 3', true, 'Fantasy', 'A fantasy adventure novel'),
('Brave New World', 'Aldous Huxley', '978-0060850524', 'Section B, Shelf 2', false, 'Science Fiction', 'A dystopian novel set in a futuristic World State');