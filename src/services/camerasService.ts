import{supabase}from"@/integrations/supabase/client";
export const camerasService={
  async getAll(){const{data,error}=await supabase.from("cameras").select("*").order("name");if(error)throw error;return data;},
  async getById(id:string){const{data,error}=await supabase.from("cameras").select("*").eq("id",id).single();if(error)throw error;return data;},
  async create(camera:any){const{data,error}=await supabase.from("cameras").insert(camera).select().single();if(error)throw error;return data;},
  async update(id:string,camera:any){const{data,error}=await supabase.from("cameras").update(camera).eq("id",id).select().single();if(error)throw error;return data;},
  async delete(id:string){const{error}=await supabase.from("cameras").delete().eq("id",id);if(error)throw error;},
  async getOnline(){const{data,error}=await supabase.from("cameras").select("*").eq("status","online");if(error)throw error;return data;},
  async updateStatus(id:string,status:string){return this.update(id,{status});}
};
