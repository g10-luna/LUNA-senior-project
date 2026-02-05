-- Add user_id column to book_requests to link requests to authenticated users
ALTER TABLE public.book_requests ADD COLUMN user_id uuid REFERENCES auth.users(id);

-- Drop existing overly permissive policies
DROP POLICY IF EXISTS "Anyone can view book requests" ON public.book_requests;
DROP POLICY IF EXISTS "Anyone can create book requests" ON public.book_requests;

-- Create new secure policies
-- Users can only view their own book requests
CREATE POLICY "Users can view their own book requests"
ON public.book_requests
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

-- Users can only create requests for themselves
CREATE POLICY "Users can create their own book requests"
ON public.book_requests
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

-- Also update robot_tasks to link to users and secure it
ALTER TABLE public.robot_tasks ADD COLUMN user_id uuid REFERENCES auth.users(id);

-- Drop existing overly permissive policies on robot_tasks
DROP POLICY IF EXISTS "Anyone can view robot tasks" ON public.robot_tasks;
DROP POLICY IF EXISTS "Anyone can create robot tasks" ON public.robot_tasks;

-- Users can view their own robot tasks
CREATE POLICY "Users can view their own robot tasks"
ON public.robot_tasks
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

-- Service role (edge functions) can manage all robot tasks
-- Note: Service role bypasses RLS, so no explicit policy needed for it