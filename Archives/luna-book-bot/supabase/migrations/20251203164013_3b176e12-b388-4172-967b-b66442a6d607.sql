-- Allow users to update their own book requests
CREATE POLICY "Users can update their own book requests"
ON public.book_requests
FOR UPDATE
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);