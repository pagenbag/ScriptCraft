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

export async function generateProjectTitle(content: string) {
  const response = await ai.models.generateContent({
    model: "gemini-3-flash-preview",
    contents: `Generate a short, catchy 3-5 word title for a video project based on this script: "${content.slice(0, 1000)}". Output ONLY the title.`,
    config: {
      temperature: 0.7,
    },
  });
  return response.text.trim().replace(/^["']|["']$/g, '');
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
  // Split text into chunks of roughly 1000 characters, trying to break at sentence boundaries
  const chunks: string[] = [];
  let currentChunk = "";
  const sentences = text.match(/[^.!?]+[.!?]+|\s*[^.!?]+$/g) || [text];

  for (const sentence of sentences) {
    if ((currentChunk + sentence).length > 1000 && currentChunk.length > 0) {
      chunks.push(currentChunk.trim());
      currentChunk = sentence;
    } else {
      currentChunk += sentence;
    }
  }
  if (currentChunk.trim()) {
    chunks.push(currentChunk.trim());
  }

  const audioChunks: string[] = [];

  for (const chunk of chunks) {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash-preview-tts",
      contents: [{ 
        parts: [{ 
          text: chunk 
        }] 
      }],
      config: {
        systemInstruction: `You are a professional high-fidelity text-to-speech engine.
        
        GLOBAL VOICE PARAMETERS:
        - Speed: ${settings?.speed || 1.0}x (1.0 is normal, 1.5 is fast, 0.7 is slow)
        - Pitch: ${settings?.pitch || 1.0}x (1.0 is normal, 1.2 is high, 0.8 is low)
        
        CRITICAL: You MUST maintain these parameters consistently. 
        
        INLINE TAG INSTRUCTIONS:
        1. <pause:Xs> - Insert X seconds of silence.
        2. <speed:X> - Change speed to X multiplier immediately.
        3. <whisper> - Switch to whisper.
        4. <emphasis> - Add vocal emphasis.
        5. <emotion:X> - Change emotion to X.
        6. <normal> - Reset all styles to the GLOBAL VOICE PARAMETERS.
        
        Do NOT speak the tags.`,
        responseModalities: [Modality.AUDIO],
        speechConfig: {
          voiceConfig: {
            prebuiltVoiceConfig: { voiceName: voiceName as any },
          },
        },
      },
    });

    const base64Audio = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
    if (base64Audio) {
      audioChunks.push(base64Audio);
    }
  }

  if (audioChunks.length === 0) return null;
  if (audioChunks.length === 1) return audioChunks[0];

  // Concatenate base64 PCM data
  // 1. Decode each chunk
  // 2. Combine into one Uint8Array
  // 3. Re-encode to base64
  const decodedChunks = audioChunks.map(chunk => {
    const binary = atob(chunk);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
      bytes[i] = binary.charCodeAt(i);
    }
    return bytes;
  });

  const totalLength = decodedChunks.reduce((acc, chunk) => acc + chunk.length, 0);
  const combinedBytes = new Uint8Array(totalLength);
  let offset = 0;
  for (const chunk of decodedChunks) {
    combinedBytes.set(chunk, offset);
    offset += chunk.length;
  }

  // Convert back to base64 efficiently using FileReader
  const blob = new Blob([combinedBytes], { type: 'application/octet-stream' });
  return new Promise<string | null>((resolve) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const result = reader.result as string;
      const base64 = result.split(',')[1];
      resolve(base64 || null);
    };
    reader.onerror = () => resolve(null);
    reader.readAsDataURL(blob);
  });
}
