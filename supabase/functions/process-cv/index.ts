import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { fileBase64, jobData } = await req.json()
    const apiKey = Deno.env.get('GEMINI_API_KEY')

    if (!apiKey) {
      return new Response(JSON.stringify({ error: "Missing API Key" }), { status: 200, headers: corsHeaders })
    }

    const requiredSkills = jobData.required_skills || []
    const preferredSkills = jobData.preferred_skills || []
    const experienceRequired = jobData.experience_required || 0
    const minimumEducation = jobData.minimum_education || "Bachelor's"

    const promptText = `
      You are an automated, high-precision CV Parsing and Decision Engine. Your task is to act as a high-precision CV Checker that evaluates job applications against dynamically provided job requirements (Skills, Education, and Experience thresholds) and outputs a definitive selection decision along with extracted candidate profiles.

      ADMIN_CONFIGURED_CRITERIA:
      - REQUIRED_SKILLS: ${JSON.stringify(requiredSkills)}
      - PREFERRED_SKILLS: ${JSON.stringify(preferredSkills)}
      - MINIMUM_EDUCATION: "${minimumEducation}"
      - MINIMUM_EXPERIENCE: ${experienceRequired} years

      Candidate CV is provided below as base64 PDF data.

      Core Processing Pipeline & Logic:
      1. Parse & Extract candidate details, actual years of experience (calculated accurately based on dates in CV), highest completed level of education, and skills. Do not extrapolate, assume, or hallucinate qualifications not explicitly stated.
      2. Strict Validation Gate:
         - Status: ACCEPT. If and only if the candidate meets or exceeds the MINIMUM_EDUCATION level, meets or exceeds the MINIMUM_EXPERIENCE duration, and possesses 100% of the REQUIRED_SKILLS.
         - Status: REJECT. If the candidate falls short on required experience, does not hold the mandatory education level, or is missing even one mandatory skill.

      You MUST return your evaluation strictly as a single, valid JSON object in this exact schema (no markdown formatting blocks like \`\`\`json, no introduction, no commentary):
      {
        "name": "Candidate Name or 'Unknown'",
        "skills": ["List of all identified skills from CV"],
        "experience_years": 0.0,
        "education": "Highest completed degree level and field",
        "projects": ["List of projects if any"],
        "score": 85,
        "insights": {
          "evaluation_metadata": {
            "candidate_name": "Candidate Name or 'Unknown'",
            "contact_email": "Candidate Email or 'Unknown'"
          },
          "admin_criteria_audit": {
            "education_rule_passed": true/false,
            "experience_rule_passed": true/false,
            "mandatory_skills_matched": ["List of matched required skills"],
            "mandatory_skills_missing": ["List of missing required skills"],
            "preferred_skills_matched": ["List of optional preferred skills found"]
          },
          "automation_trigger": {
            "final_decision": "ACCEPT",
            "match_confidence_score": 0.0
          },
          "system_log_justification": "A definitive, clear, one-sentence statement outlining exactly which admin criteria were met or broken to justify the final_decision."
        }
      }
    `

    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{
          parts: [
            { text: promptText },
            { inline_data: { mime_type: "application/pdf", data: fileBase64 } }
          ]
        }],
        generationConfig: {
          response_mime_type: "application/json"
        }
      })
    })

    const data = await response.json()
    
    if (!response.ok) {
      return new Response(JSON.stringify({ error: "Gemini API Error", details: data.error?.message }), { status: 200, headers: corsHeaders })
    }

    const aiText = data.candidates[0].content.parts[0].text
    const finalData = JSON.parse(aiText)

    return new Response(JSON.stringify(finalData), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    })

  } catch (error) {
    return new Response(JSON.stringify({ error: "Processing Error", details: error.message }), { status: 200, headers: corsHeaders })
  }
})
