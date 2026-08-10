-- Seed data for development
INSERT INTO cameras (id, name, url, location, status) VALUES
  ('00000000-0000-0000-0000-000000000001', 'Câmera Entrada', 'rtsp://demo/stream1', 'Entrada Principal', 'online'),
  ('00000000-0000-0000-0000-000000000002', 'Câmera Estacionamento', 'rtsp://demo/stream2', 'Estacionamento', 'online')
ON CONFLICT (id) DO NOTHING;
