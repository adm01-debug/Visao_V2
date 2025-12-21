import { validateRequest, validateImageBase64, corsHeaders, errorResponse } from '../_shared/validation.ts';
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { imageUrl, imageBase64, analysisType = 'security' } = await req.json();
    
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    if (!imageUrl && !imageBase64) {
      throw new Error("Either imageUrl or imageBase64 is required");
    }

    const imageContent = imageBase64 
      ? { type: "image_url", image_url: { url: `data:image/jpeg;base64,${imageBase64}` } }
      : { type: "image_url", image_url: { url: imageUrl } };

    const systemPrompts: Record<string, string> = {
      security: `You are an AI security analyst for surveillance systems. Analyze the image and detect:
- People count and their positions
- Suspicious behaviors (loitering, running, fighting)
- Unauthorized access or restricted area violations
- Safety hazards (no PPE, dangerous situations)
- Objects of interest (bags left unattended, vehicles, weapons)

Respond in JSON format:
{
  "people_count": number,
  "detections": [
    {
      "type": "person" | "vehicle" | "object" | "behavior",
      "label": string,
      "confidence": number (0-1),
      "severity": "low" | "medium" | "high" | "critical",
      "description": string,
      "position": { "area": string }
    }
  ],
  "alerts": [
    {
      "type": "security" | "safety" | "operations" | "access",
      "severity": "low" | "medium" | "high" | "critical", 
      "message": string,
      "recommendation": string
    }
  ],
  "summary": string
}`,
      
      productivity: `You are an AI workplace analyst. Analyze the image for productivity metrics:
- Number of people working/idle
- Workstation occupancy
- Movement patterns
- Equipment usage

Respond in JSON format:
{
  "people_count": number,
  "working_count": number,
  "idle_count": number,
  "occupancy_rate": number (0-100),
  "observations": [string],
  "summary": string
}`,
      
      safety: `You are an AI safety inspector. Analyze the image for safety compliance:
- PPE compliance (helmets, vests, gloves, goggles)
- Hazardous conditions
- Emergency exit accessibility
- Equipment safety

Respond in JSON format:
{
  "people_count": number,
  "ppe_compliance": {
    "compliant": number,
    "non_compliant": number,
    "missing_items": [string]
  },
  "hazards": [
    {
      "type": string,
      "severity": "low" | "medium" | "high" | "critical",
      "description": string,
      "location": string
    }
  ],
  "summary": string
}`
    };

    const systemPrompt = systemPrompts[analysisType] || systemPrompts.security;

    console.log(`Analyzing image with type: ${analysisType}`);

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: systemPrompt },
          { 
            role: "user", 
            content: [
              { type: "text", text: "Analyze this surveillance camera image:" },
              imageContent
            ]
          }
        ],
        response_format: { type: "json_object" }
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("AI gateway error:", response.status, errorText);
      
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit exceeded. Please try again later." }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "AI credits exhausted. Please add credits to continue." }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      
      throw new Error(`AI gateway error: ${response.status}`);
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content;
    
    let analysis;
    try {
      analysis = JSON.parse(content);
    } catch {
      console.log("Raw AI response:", content);
      analysis = { summary: content, raw: true };
    }

    console.log("Analysis completed:", JSON.stringify(analysis).substring(0, 200));

    return new Response(JSON.stringify({ 
      success: true, 
      analysisType,
      analysis,
      timestamp: new Date().toISOString()
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (error) {
    console.error("Error in analyze-image function:", error);
    return new Response(JSON.stringify({ 
      success: false, 
      error: error instanceof Error ? error.message : "Unknown error" 
    }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
