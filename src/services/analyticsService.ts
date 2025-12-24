import{supabase}from"@/integrations/supabase/client";
export const analyticsService={
  async getAlertsByType(){const{data,error}=await supabase.from("alerts").select("type");if(error)throw error;const grouped:Record<string,number>={};data?.forEach(a=>{grouped[a.type]=(grouped[a.type]||0)+1;});return grouped;},
  async getAlertsByCamera(){const{data,error}=await supabase.from("alerts").select("camera_id,cameras(name)");if(error)throw error;return data;},
  async getAlertsTrend(days:number=7){const startDate=new Date();startDate.setDate(startDate.getDate()-days);const{data,error}=await supabase.from("alerts").select("created_at").gte("created_at",startDate.toISOString());if(error)throw error;return data;},
  async getRecognitionRate(){const{data,error}=await supabase.from("recognition_logs").select("confidence");if(error)throw error;return data;}
};
