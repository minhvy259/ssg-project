-- Create study_rooms table
CREATE TABLE public.study_rooms (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  is_public BOOLEAN NOT NULL DEFAULT true,
  max_participants INTEGER NOT NULL DEFAULT 10,
  created_by UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create study_room_participants table (junction table)
CREATE TABLE public.study_room_participants (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  room_id UUID NOT NULL REFERENCES public.study_rooms(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  status TEXT NOT NULL DEFAULT 'focusing' CHECK (status IN ('focusing', 'break')),
  joined_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(room_id, user_id)
);

-- Enable RLS
ALTER TABLE public.study_rooms ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.study_room_participants ENABLE ROW LEVEL SECURITY;

-- RLS policies for study_rooms
CREATE POLICY "Anyone can view public rooms" 
  ON public.study_rooms 
  FOR SELECT 
  USING (is_public = true);

CREATE POLICY "Authenticated users can view their own private rooms"
  ON public.study_rooms
  FOR SELECT
  USING (auth.uid() = created_by);

CREATE POLICY "Authenticated users can create rooms"
  ON public.study_rooms
  FOR INSERT
  WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Room owners can update their rooms"
  ON public.study_rooms
  FOR UPDATE
  USING (auth.uid() = created_by);

CREATE POLICY "Room owners can delete their rooms"
  ON public.study_rooms
  FOR DELETE
  USING (auth.uid() = created_by);

-- RLS policies for study_room_participants
CREATE POLICY "Anyone can view participants in public rooms"
  ON public.study_room_participants
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.study_rooms 
      WHERE id = room_id AND is_public = true
    )
  );

CREATE POLICY "Participants can view participants in their rooms"
  ON public.study_room_participants
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Authenticated users can join rooms"
  ON public.study_room_participants
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own participant status"
  ON public.study_room_participants
  FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can leave rooms"
  ON public.study_room_participants
  FOR DELETE
  USING (auth.uid() = user_id);

-- Create triggers for updated_at
CREATE TRIGGER update_study_rooms_updated_at
  BEFORE UPDATE ON public.study_rooms
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Enable realtime for study rooms
ALTER PUBLICATION supabase_realtime ADD TABLE public.study_rooms;
ALTER PUBLICATION supabase_realtime ADD TABLE public.study_room_participants;