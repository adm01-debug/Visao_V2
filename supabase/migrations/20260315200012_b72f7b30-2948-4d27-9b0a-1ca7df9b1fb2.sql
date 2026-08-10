
INSERT INTO storage.buckets (id, name, public) 
VALUES ('heatmap-snapshots', 'heatmap-snapshots', true)
ON CONFLICT (id) DO NOTHING;

INSERT INTO storage.buckets (id, name, public) 
VALUES ('recordings', 'recordings', true)
ON CONFLICT (id) DO NOTHING;

-- Storage policies for heatmap-snapshots
CREATE POLICY "Authenticated users can upload heatmap snapshots" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'heatmap-snapshots');
CREATE POLICY "Anyone can view heatmap snapshots" ON storage.objects FOR SELECT USING (bucket_id = 'heatmap-snapshots');
CREATE POLICY "Users can delete own heatmap snapshots" ON storage.objects FOR DELETE TO authenticated USING (bucket_id = 'heatmap-snapshots');

-- Storage policies for recordings
CREATE POLICY "Authenticated users can upload recordings" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'recordings');
CREATE POLICY "Anyone can view recordings" ON storage.objects FOR SELECT USING (bucket_id = 'recordings');
CREATE POLICY "Users can delete own recordings" ON storage.objects FOR DELETE TO authenticated USING (bucket_id = 'recordings');
