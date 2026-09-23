
CREATE POLICY "cab docs read" ON storage.objects FOR SELECT TO authenticated USING (bucket_id = 'cab-documents');
CREATE POLICY "cab docs insert" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'cab-documents');
CREATE POLICY "cab docs update" ON storage.objects FOR UPDATE TO authenticated USING (bucket_id = 'cab-documents');
CREATE POLICY "cab docs delete" ON storage.objects FOR DELETE TO authenticated USING (bucket_id = 'cab-documents');
