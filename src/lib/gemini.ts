import { GoogleGenAI, Modality, ThinkingLevel } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || "" });

export async function rewriteScript(script: string, instruction: string) {
  const response = await ai.models.generateContent({
    model: "gemini-3-flash-preview",
    contents: `Rewrite the following script based on this instruction: "${instruction}". 

CRITICAL: Return ONLY the rewritten script text. Do not include any introductory remarks, explanations, or conversational filler like "Here is the rewritten script".

Script:
${script}`,
    config: {
      temperature: 0.7,
    },
  });
  return response.text;
}

export async function generateInstructionTag(instruction: string) {
  const response = await ai.models.generateContent({
    model: "gemini-3-flash-preview",
    contents: `Summarize the following instruction into a one or two word "Tag" (e.g. "Professional", "Shorten", "Funny", "1950s Radio"). 

Instruction: "${instruction}"

CRITICAL: Return ONLY the one or two words. No punctuation.`,
    config: {
      temperature: 0.3,
    },
  });
  return response.text.trim();
}

export async function generateScriptImage(scriptSegment: string, config: { aspectRatio: string, tag?: string }) {
  const response = await ai.models.generateContent({
    model: 'gemini-2.5-flash-image',
    contents: {
      parts: [
        {
          text: `Create a professional, high-impact cinematic visual for a video intro. 
          
          CONTENT THEME: ${scriptSegment.slice(0, 500)}
          ${config.tag ? `TONE/STYLE: ${config.tag}` : ''}
          
          The image should be a DIRECT and LITERAL visual representation of the content theme described above. 
          If the script is about a specific object, place, or concept, feature it prominently.
          
          Style: High-end commercial cinematography. Professional lighting, shallow depth of field, sharp focus on the subject. 
          Avoid abstract patterns; prefer realistic or high-fidelity 3D rendered aesthetics that clearly communicate the subject matter.
          
          CRITICAL: No text, logos, or watermarks. The image must be high quality and fill the entire frame.`,
        },
      ],
    },
    config: {
      imageConfig: {
        aspectRatio: config.aspectRatio as any,
      },
    },
  });

  for (const part of response.candidates?.[0]?.content?.parts || []) {
    if (part.inlineData) {
      return `data:image/png;base64,${part.inlineData.data}`;
    }
  }
  return null;
}

export async function generateSpeech(text: string, voiceName: string, settings?: { speed: number, pitch: number }) {
  const response = await ai.models.generateContent({
    model: "gemini-2.5-flash-preview-tts",
    contents: [{ 
      parts: [{ 
        text: `Generate high-quality speech for the following script. 
        
        GLOBAL VOICE SETTINGS:
        - Default Speed: ${settings?.speed || 1.0}x
        - Default Pitch: ${settings?.pitch || 1.0}x
        
        CRITICAL INSTRUCTIONS FOR INLINE TAGS:
        1. <pause:Xs> - Insert EXACTLY X seconds of silence at this position.
        2. <MM:SS> - Timing marker. Adjust speech pace so this point is reached at the specified time.
        3. <speed:X> - Change speaking rate IMMEDIATELY. 1.0 is default. 1.5 is fast. 0.7 is slow. This is a multiplier. Be VERY noticeable with the speed change.
        4. <whisper> - Switch to a whispering voice for the text following this tag.
        5. <emphasis> - Add vocal emphasis/stress to the text following this tag.
        6. <emotion:X> - Change vocal emotion (e.g., happy, sad, excited, serious) for the text following this tag.
        7. <normal> - RESET all styles (speed, whisper, emphasis, emotion) back to the default neutral voice profile immediately.
        
        SCOPE RULE: Style tags are cumulative and "sticky". A tag like <whisper> or <speed:1.5> stays active until a <normal> tag is encountered or a new tag of the same type overrides it. You MUST strictly follow the scope of these tags. Do NOT apply styles to the whole script if the tag appears in the middle.
        
        Do NOT speak the tags themselves.
        
        Script:
        ${text}` 
      }] 
    }],
    config: {
      responseModalities: [Modality.AUDIO],
      speechConfig: {
        voiceConfig: {
          prebuiltVoiceConfig: { voiceName: voiceName as any },
        },
      },
    },
  });

  const base64Audio = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
  return base64Audio || null;
}
