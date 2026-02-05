-- Create books table for library catalog
CREATE TABLE public.books (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  author text NOT NULL,
  isbn text,
  call_number text,
  shelf_location text NOT NULL,
  category text,
  available boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);

-- Create robot task queue table
CREATE TABLE public.robot_tasks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  task_type text NOT NULL, -- 'navigation_assist', 'book_delivery', etc.
  book_id uuid REFERENCES public.books(id) ON DELETE CASCADE,
  student_name text,
  status text DEFAULT 'pending', -- 'pending', 'in_progress', 'completed', 'cancelled'
  priority integer DEFAULT 1,
  requested_at timestamptz DEFAULT now(),
  started_at timestamptz,
  completed_at timestamptz,
  notes text
);

-- Create book requests table for tracking student requests
CREATE TABLE public.book_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  book_id uuid REFERENCES public.books(id) ON DELETE CASCADE NOT NULL,
  student_name text NOT NULL,
  request_type text NOT NULL, -- 'navigation_assist', 'pickup_delivery'
  status text DEFAULT 'pending', -- 'pending', 'robot_navigating', 'completed'
  pickup_location text DEFAULT 'Front Desk',
  robot_task_id uuid REFERENCES public.robot_tasks(id),
  requested_at timestamptz DEFAULT now(),
  completed_at timestamptz
);

-- Enable RLS
ALTER TABLE public.books ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.robot_tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.book_requests ENABLE ROW LEVEL SECURITY;

-- RLS Policies for books (public read access for students)
CREATE POLICY "Anyone can view books"
  ON public.books FOR SELECT
  USING (true);

-- RLS Policies for robot_tasks (students can view their related tasks)
CREATE POLICY "Anyone can view robot tasks"
  ON public.robot_tasks FOR SELECT
  USING (true);

CREATE POLICY "Anyone can create robot tasks"
  ON public.robot_tasks FOR INSERT
  WITH CHECK (true);

-- RLS Policies for book_requests (students can view all requests)
CREATE POLICY "Anyone can view book requests"
  ON public.book_requests FOR SELECT
  USING (true);

CREATE POLICY "Anyone can create book requests"
  ON public.book_requests FOR INSERT
  WITH CHECK (true);

-- Create indexes for performance
CREATE INDEX idx_books_title ON public.books(title);
CREATE INDEX idx_books_author ON public.books(author);
CREATE INDEX idx_robot_tasks_status ON public.robot_tasks(status);
CREATE INDEX idx_book_requests_status ON public.book_requests(status);

-- Enable realtime for robot tasks and book requests
ALTER PUBLICATION supabase_realtime ADD TABLE public.robot_tasks;
ALTER PUBLICATION supabase_realtime ADD TABLE public.book_requests;