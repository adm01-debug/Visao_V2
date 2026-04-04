
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

DO $$ BEGIN
  DROP TRIGGER IF EXISTS update_cameras_updated_at ON public.cameras;
  CREATE TRIGGER update_cameras_updated_at BEFORE UPDATE ON public.cameras FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

  DROP TRIGGER IF EXISTS update_arm_disarm_states_updated_at ON public.arm_disarm_states;
  CREATE TRIGGER update_arm_disarm_states_updated_at BEFORE UPDATE ON public.arm_disarm_states FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

  DROP TRIGGER IF EXISTS update_face_recognition_configs_updated_at ON public.face_recognition_configs;
  CREATE TRIGGER update_face_recognition_configs_updated_at BEFORE UPDATE ON public.face_recognition_configs FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

  DROP TRIGGER IF EXISTS update_notification_configs_updated_at ON public.notification_configs;
  CREATE TRIGGER update_notification_configs_updated_at BEFORE UPDATE ON public.notification_configs FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

  DROP TRIGGER IF EXISTS update_profiles_updated_at ON public.profiles;
  CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

  DROP TRIGGER IF EXISTS update_recording_configs_updated_at ON public.recording_configs;
  CREATE TRIGGER update_recording_configs_updated_at BEFORE UPDATE ON public.recording_configs FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

  DROP TRIGGER IF EXISTS update_registered_persons_updated_at ON public.registered_persons;
  CREATE TRIGGER update_registered_persons_updated_at BEFORE UPDATE ON public.registered_persons FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

  DROP TRIGGER IF EXISTS update_registered_plates_updated_at ON public.registered_plates;
  CREATE TRIGGER update_registered_plates_updated_at BEFORE UPDATE ON public.registered_plates FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

  DROP TRIGGER IF EXISTS update_user_roles_updated_at ON public.user_roles;
  CREATE TRIGGER update_user_roles_updated_at BEFORE UPDATE ON public.user_roles FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

  DROP TRIGGER IF EXISTS update_vehicles_updated_at ON public.vehicles;
  CREATE TRIGGER update_vehicles_updated_at BEFORE UPDATE ON public.vehicles FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

  DROP TRIGGER IF EXISTS update_zones_updated_at ON public.zones;
  CREATE TRIGGER update_zones_updated_at BEFORE UPDATE ON public.zones FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
END $$;
