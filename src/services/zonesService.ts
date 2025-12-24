import{supabase}from"@/integrations/supabase/client";
export const zonesService={
  async getAll(){const{data,error}=await supabase.from("zones").select("*").order("name");if(error)throw error;return data;},
  async getById(id:string){const{data,error}=await supabase.from("zones").select("*").eq("id",id).single();if(error)throw error;return data;},
  async create(zone:any){const{data,error}=await supabase.from("zones").insert(zone).select().single();if(error)throw error;return data;},
  async update(id:string,zone:any){const{data,error}=await supabase.from("zones").update(zone).eq("id",id).select().single();if(error)throw error;return data;},
  async delete(id:string){const{error}=await supabase.from("zones").delete().eq("id",id);if(error)throw error;},
  async getByCamera(cameraId:string){const{data,error}=await supabase.from("zones").select("*").eq("camera_id",cameraId);if(error)throw error;return data;}
};
