-- Create records table
CREATE TABLE IF NOT EXISTS public.records (
    id SERIAL PRIMARY KEY,
    uid TEXT NOT NULL,
    name TEXT NOT NULL,
    intro TEXT,
    category_name TEXT,
    expires_months INTEGER,
    created TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    creator TEXT NOT NULL,
    updated TIMESTAMP WITH TIME ZONE,
    updator TEXT,
    parent_uid TEXT,
    reference TEXT,
    status INTEGER DEFAULT 1
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_records_uid ON public.records(uid);
CREATE INDEX IF NOT EXISTS idx_records_creator ON public.records(creator);
CREATE INDEX IF NOT EXISTS idx_records_status ON public.records(status);

-- Set up Row Level Security (RLS)
ALTER TABLE public.records ENABLE ROW LEVEL SECURITY;

-- Create policy to allow all operations (you can restrict this later)
CREATE POLICY "Allow all operations" ON public.records
    FOR ALL
    USING (true)
    WITH CHECK (true); 