export interface ScriptVersion {
  id: string;
  content: string;
  timestamp: number;
  label: string;
  tag?: string;
}

export interface Project {
  id: string;
  name: string;
  content: string;
  history: ScriptVersion[];
  currentTag: string;
  ttsSettings: { speed: number; pitch: number };
  selectedVoice: string;
  imageConfig: { aspectRatio: string };
  generatedImage: string | null;
  generatedAudio: string | null;
  updatedAt: number;
}

export interface ProjectMetadata {
  id: string;
  name: string;
  updatedAt: number;
  previewText: string;
}

export type TonePreset = {
  name: string;
  instruction: string;
  icon: string;
};

export const TONE_PRESETS: TonePreset[] = [
  { name: "Professional", instruction: "Make it sound professional, corporate, and authoritative.", icon: "Briefcase" },
  { name: "Funny", instruction: "Add humor, wit, and a lighthearted tone.", icon: "Laugh" },
  { name: "Dramatic", instruction: "Make it intense, emotional, and cinematic.", icon: "Clapperboard" },
  { name: "Shorten", instruction: "Condense the script to be more concise while keeping key points.", icon: "Scissors" },
  { name: "Expand", instruction: "Add more detail and depth to the script.", icon: "Maximize" },
  { name: "Infomercial", instruction: "Rewrite as a high-energy, persuasive infomercial script with strong calls to action.", icon: "Zap" },
  { name: "1950s Radio", instruction: "Rewrite as a classic 1950s radio advertisement with vintage vocabulary and mid-century charm.", icon: "Mic2" },
];

export const VOICES = [
  { name: "Kore", description: "Clear and balanced" },
  { name: "Puck", description: "Energetic and bright" },
  { name: "Charon", description: "Deep and authoritative" },
  { name: "Fenrir", description: "Rugged and textured" },
  { name: "Zephyr", description: "Soft and airy" },
];
