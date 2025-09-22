-- Create call_signals table for WebRTC signaling
CREATE TABLE IF NOT EXISTS call_signals (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  from_user UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  to_user UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  signal_type TEXT NOT NULL CHECK (signal_type IN ('offer', 'answer', 'ice-candidate', 'call-request', 'call-accept', 'call-reject', 'end-call')),
  signal_data JSONB,
  conversation_id UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE call_signals ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can insert their own signals" ON call_signals
  FOR INSERT WITH CHECK (auth.uid() = from_user);

CREATE POLICY "Users can view signals sent to them" ON call_signals
  FOR SELECT USING (auth.uid() = to_user);

CREATE POLICY "Users can delete signals sent to them" ON call_signals
  FOR DELETE USING (auth.uid() = to_user);

-- Enable real-time
ALTER PUBLICATION supabase_realtime ADD TABLE call_signals;

-- Create index for performance
CREATE INDEX idx_call_signals_to_user ON call_signals(to_user);
CREATE INDEX idx_call_signals_created_at ON call_signals(created_at);
