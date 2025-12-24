import{supabase}from"@/integrations/supabase/client";
export const recognitionService={
  async detectFaces(imageBase64:string){const{data,error}=await supabase.functions.invoke("detect-faces",{body:{image:imageBase64}});if(error)throw error;return data;},
  async compareFaces(face1:string,face2:string){const{data,error}=await supabase.functions.invoke("compare-faces",{body:{face1,face2}});if(error)throw error;return data;},
  async generateEncoding(imageBase64:string){const{data,error}=await supabase.functions.invoke("generate-face-encoding",{body:{image:imageBase64}});if(error)throw error;return data;},
  async getLogs(){const{data,error}=await supabase.from("recognition_logs").select("*").order("created_at",{ascending:false});if(error)throw error;return data;},
  async getPeople(){const{data,error}=await supabase.from("people").select("*").order("name");if(error)throw error;return data;}
};
