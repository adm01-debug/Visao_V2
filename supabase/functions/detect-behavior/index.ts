import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { getCorsHeaders } from "../_shared/cors.ts";
import { detectBehaviorSchema, validateInput } from "../_shared/validation.ts";

const BEHAVIOR_PROMPT = `You are an advanced AI behavioral analyst for workplace surveillance systems. 
Analyze the provided image(s) and detect behavioral patterns that impact productivity and compliance.

Detect the following behavioral patterns:

1. **Excessive Conversations**: Groups of 2+ people standing and talking for what appears to be non-work related interaction.
2. **Cell Phone Usage**: People looking at or holding mobile phones/devices during work hours.
3. **Prolonged Absences**: Empty workstations that should be occupied.
4. **Additional Patterns**:
   - Distracted behavior
   - Sleeping/drowsiness
   - Unauthorized break times
   - Crowding in non-work areas

Respond ONLY with valid JSON:
{
  "people_count": number,
  "behavioral_patterns": [
    {
      "pattern_type": "excessive_conversation" | "cell_phone_usage" | "prolonged_absence" | "distraction" | "drowsiness" | "unauthorized_break" | "crowding",
      "confidence": number,
      "severity": "low" | "medium" | "high" | "critical",
      "people_involved": number,
      "estimated_duration_minutes": number,
      "location": string,
      "description": string,
      "recommendation": string
    }
  ],
  "productivity_score": number,
  "zone_analysis": {
    "productive_zones_occupied": number,
    "idle_zones_occupied": number,
    "empty_workstations": number
  },
  "alerts": [
    {
      "type": "conversation" | "phone" | "absence" | "behavior",
      "severity": "low" | "medium" | "high" | "critical",
      "message": string,
      "action_required": boolean
    }
  ],
  "summary": string,
  "recommendations": [string]
}`;

serve(async (req) => {
  const corsHeaders = getCorsHeaders(req);

  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const rawBody = await req.json();
    const validation = validateInput(detectBehaviorSchema, rawBody, corsHeaders);
    if (!validation.success) return validation.response;
    const { imageUrl, imageBase64, cameraId, cameraName } = validation.data;

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      return new Response(JSON.stringify({ error: "LOVABLE_API_KEY is not configured" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const imageContent = imageBase64
      ? { type: "image_url", image_url: { url: `data:image/jpeg;base64,${imageBase64}` } }
      : { type: "image_url", image_url: { url: imageUrl } };

    console.log(`[behavior-detection] Analyzing image from camera: ${cameraName || cameraId || 'unknown'}`);

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: BEHAVIOR_PROMPT },
          {
            role: "user",
            content: [
              { type: "text", text: `Analyze this surveillance camera image for behavioral patterns. Camera: ${cameraName || 'Unknown'}. Timestamp: ${new Date().toISOString()}` },
              imageContent
            ]
          }
        ],
        response_format: { type: "json_object" }
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("[behavior-detection] AI gateway error:", response.status, errorText);

      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit exceeded. Please try again later." }), {
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "AI credits exhausted. Please add credits." }), {
          status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
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
      console.log("[behavior-detection] Raw AI response:", content);
      analysis = { summary: content, raw: true };
    }

    console.log("[behavior-detection] Analysis completed. Patterns found:", analysis.behavioral_patterns?.length || 0);

    return new Response(JSON.stringify({
      success: true,
      analysis,
      cameraId,
      cameraName,
      timestamp: new Date().toISOString()
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (error) {
    console.error("[behavior-detection] Error:", error);
    return new Response(JSON.stringify({
      success: false,
      error: error instanceof Error ? error.message : "Unknown error"
    }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
