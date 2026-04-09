/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import { 
  History, 
  Sparkles, 
  Download, 
  Volume2, 
  Image as ImageIcon, 
  RotateCcw, 
  Save, 
  FileText, 
  FileCode, 
  Play, 
  Pause,
  Trash2,
  Copy,
  Check,
  ChevronRight,
  Settings2,
  Mic2,
  Type,
  Briefcase,
  Laugh,
  Clapperboard,
  Scissors,
  Maximize,
  Zap,
  Clock,
  Timer,
  Gauge,
  Ear,
  Smile,
  Info,
  ExternalLink
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { jsPDF } from 'jspdf';
import { toast, Toaster } from 'sonner';

import { Button } from '../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../components/ui/card';
import { Textarea } from '../components/ui/textarea';
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '../components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { ScrollArea } from '../components/ui/scroll-area';
import { Separator } from '../components/ui/separator';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '../components/ui/tooltip';
import { Badge } from '../components/ui/badge';
import { Label } from '../components/ui/label';
import { Slider } from '../components/ui/slider';

import { rewriteScript, generateScriptImage, generateSpeech, generateInstructionTag, generateProjectTitle } from './lib/gemini';
import { pcmToWav } from './lib/wavHelper';
import { ScriptVersion, TONE_PRESETS, VOICES, Project } from './types';
import { LandingPage } from './components/LandingPage';
import { projectStorage } from './lib/storage';

export default function App() {
  const [view, setView] = useState<'landing' | 'editor'>('landing');
  const [currentProject, setCurrentProject] = useState<Project | null>(null);
  
  const [content, setContent] = useState('');
  const [history, setHistory] = useState<ScriptVersion[]>([]);
  const [currentTag, setCurrentTag] = useState<string>('');
  const [isRewriting, setIsRewriting] = useState(false);
  const [isGeneratingImage, setIsGeneratingImage] = useState(false);
  const [isGeneratingAudio, setIsGeneratingAudio] = useState(false);
  const [generatedImage, setGeneratedImage] = useState<string | null>(null);
  const [generatedAudio, setGeneratedAudio] = useState<string | null>(null);
  const [selectedVoice, setSelectedVoice] = useState(VOICES[0].name);
  const [ttsSettings, setTtsSettings] = useState({ speed: 1.0, pitch: 1.0 });
  const [customInstruction, setCustomInstruction] = useState('');
  const [imageConfig, setImageConfig] = useState({ aspectRatio: '16:9' });
  const [isPlaying, setIsPlaying] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const ICON_MAP: Record<string, any> = {
    Briefcase,
    Laugh,
    Clapperboard,
    Scissors,
    Maximize,
    Zap,
    Mic2
  };

  // Sync state with currentProject
  useEffect(() => {
    if (currentProject) {
      setContent(currentProject.content);
      setHistory(currentProject.history);
      setCurrentTag(currentProject.currentTag);
      setSelectedVoice(currentProject.selectedVoice);
      setTtsSettings(currentProject.ttsSettings);
      setImageConfig(currentProject.imageConfig);
      setGeneratedImage(currentProject.generatedImage);
      setGeneratedAudio(currentProject.generatedAudio);
    }
  }, [currentProject]);

  // Auto-save project whenever relevant state changes
  useEffect(() => {
    if (currentProject && view === 'editor') {
      const timer = setTimeout(() => {
        const updatedProject: Project = {
          ...currentProject,
          content,
          history,
          currentTag,
          selectedVoice,
          ttsSettings,
          imageConfig,
          generatedImage,
          generatedAudio,
          updatedAt: Date.now()
        };
        projectStorage.saveProject(updatedProject);
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, [content, history, currentTag, selectedVoice, ttsSettings, imageConfig, generatedImage, generatedAudio, currentProject, view]);

  const handleNewProject = () => {
    const newProject: Project = {
      id: Math.random().toString(36).substr(2, 9),
      name: 'Untitled Project',
      content: '',
      history: [],
      currentTag: '',
      ttsSettings: { speed: 1.0, pitch: 1.0 },
      selectedVoice: VOICES[0].name,
      imageConfig: { aspectRatio: '16:9' },
      generatedImage: null,
      generatedAudio: null,
      updatedAt: Date.now()
    };
    setCurrentProject(newProject);
    setView('editor');
  };

  const handleLoadProject = (id: string) => {
    const project = projectStorage.getProject(id);
    if (project) {
      setCurrentProject(project);
      setView('editor');
    }
  };

  const handleImportProject = (project: Project) => {
    projectStorage.saveProject(project);
    setCurrentProject(project);
    setView('editor');
    toast.success('Project imported successfully');
  };

  const handleSaveProject = async () => {
    if (!currentProject) return;
    setIsSaving(true);
    try {
      let projectName = currentProject.name;
      if (projectName === 'Untitled Project' && content.trim()) {
        projectName = await generateProjectTitle(content);
      }
      
      const updatedProject: Project = {
        ...currentProject,
        name: projectName,
        content,
        history,
        currentTag,
        selectedVoice,
        ttsSettings,
        imageConfig,
        generatedImage,
        generatedAudio,
        updatedAt: Date.now()
      };
      
      projectStorage.saveProject(updatedProject);
      setCurrentProject(updatedProject);
      toast.success(`Project saved: ${projectName}`);
    } catch (error) {
      toast.error('Failed to save project');
    } finally {
      setIsSaving(false);
    }
  };

  const addToHistory = (newContent: string, label: string, tag?: string) => {
    const newVersion: ScriptVersion = {
      id: Math.random().toString(36).substr(2, 9),
      content: newContent,
      timestamp: Date.now(),
      label,
      tag,
    };
    setHistory(prev => [newVersion, ...prev].slice(0, 50)); // Keep last 50
    setContent(newContent);
    setCurrentTag(tag || '');
  };

  const handleRewrite = async (instruction: string, presetName?: string) => {
    if (!content.trim()) {
      toast.error('Please enter some script text first.');
      return;
    }

    // Push original if history is empty
    if (history.length === 0) {
      const originalVersion: ScriptVersion = {
        id: 'original-' + Date.now(),
        content: content,
        timestamp: Date.now(),
        label: 'Original Script',
        tag: 'Original'
      };
      setHistory([originalVersion]);
    }

    setIsRewriting(true);
    try {
      let tag = presetName;
      if (!tag) {
        // It's a custom instruction, generate a tag
        tag = await generateInstructionTag(instruction);
      }

      const result = await rewriteScript(content, instruction);
      if (result) {
        addToHistory(result, `Rewrite: ${tag}`, tag);
        toast.success('Script rewritten successfully!');
        
        // Auto-title if unnamed
        if (currentProject?.name === 'Untitled Project') {
          const newTitle = await generateProjectTitle(result);
          setCurrentProject(prev => prev ? { ...prev, name: newTitle } : null);
        }
      }
    } catch (error) {
      console.error(error);
      toast.error('Failed to rewrite script.');
    } finally {
      setIsRewriting(false);
    }
  };

  const handleReset = () => {
    setView('landing');
    setCurrentProject(null);
    setContent('');
    setHistory([]);
    setCurrentTag('');
    setGeneratedImage(null);
    setGeneratedAudio(null);
    setCustomInstruction('');
    toast.info('Returned to dashboard');
  };

  const handleGenerateImage = async () => {
    if (!content.trim()) {
      toast.error('Please enter some script text first.');
      return;
    }
    setIsGeneratingImage(true);
    try {
      const result = await generateScriptImage(content.slice(0, 500), {
        ...imageConfig,
        tag: currentTag
      });
      if (result) {
        setGeneratedImage(result);
        toast.success('Visual generated!');
      }
    } catch (error) {
      console.error(error);
      toast.error('Failed to generate visual.');
    } finally {
      setIsGeneratingImage(false);
    }
  };

  const handleGenerateAudio = async () => {
    if (!content.trim()) {
      toast.error('Please enter some script text first.');
      return;
    }
    setIsGeneratingAudio(true);
    try {
      const result = await generateSpeech(content, selectedVoice, ttsSettings);
      if (result) {
        const wavUrl = pcmToWav(result);
        setGeneratedAudio(wavUrl);
        toast.success('Audio generated!');
      }
    } catch (error) {
      console.error(error);
      toast.error('Failed to generate audio.');
    } finally {
      setIsGeneratingAudio(false);
    }
  };

  const exportAsTxt = () => {
    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `script-${Date.now()}.txt`;
    a.click();
    toast.success('Exported as TXT');
  };

  const exportAsPdf = () => {
    const doc = new jsPDF();
    const splitText = doc.splitTextToSize(content, 180);
    doc.text(splitText, 15, 20);
    doc.save(`script-${Date.now()}.pdf`);
    toast.success('Exported as PDF');
  };

  const copyToClipboard = () => {
    navigator.clipboard.writeText(content);
    toast.success('Copied to clipboard');
  };

  const revertToVersion = (version: ScriptVersion) => {
    setContent(version.content);
    setCurrentTag(version.tag || '');
    toast.info(`Reverted to: ${version.label}`);
  };

  const getEstimatedLength = () => {
    const words = content.replace(/<[^>]+>/g, '').split(/\s+/).filter(Boolean).length;
    let seconds = (words / 150) * 60;
    
    // Add time for pauses
    const pauseMatches = content.matchAll(/<pause:([\d.]+)s?>/g);
    for (const match of pauseMatches) {
      seconds += parseFloat(match[1]);
    }
    
    const totalSeconds = Math.ceil(seconds);
    const mins = Math.floor(totalSeconds / 60);
    const secs = totalSeconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const playVoiceSample = async (voice: string) => {
    try {
      const sampleText = `Hello, I am ${voice}. This is a sample of my voice.`;
      const result = await generateSpeech(sampleText, voice, ttsSettings);
      if (result) {
        const wavUrl = pcmToWav(result);
        const audio = new Audio(wavUrl);
        audio.play();
      }
    } catch (error) {
      toast.error('Failed to play sample');
    }
  };

  const insertTag = (tag: string) => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const text = textarea.value;
    const before = text.substring(0, start);
    const after = text.substring(end);
    
    const newContent = before + tag + after;
    setContent(newContent);
    
    // Set focus back and move cursor
    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(start + tag.length, start + tag.length);
    }, 0);
  };

  const getAspectRatioClass = () => {
    switch (imageConfig.aspectRatio) {
      case '1:1': return 'aspect-square';
      case '16:9': return 'aspect-video';
      case '9:16': return 'aspect-[9/16]';
      case '4:3': return 'aspect-[4/3]';
      default: return 'aspect-video';
    }
  };

  if (view === 'landing') {
    return <LandingPage onNewProject={handleNewProject} onLoadProject={handleLoadProject} onImportProject={handleImportProject} />;
  }

  return (
    <TooltipProvider>
      <motion.div 
        initial={{ opacity: 0, x: 20 }}
        animate={{ opacity: 1, x: 0 }}
        exit={{ opacity: 0, x: -20 }}
        className="min-h-screen bg-background text-foreground font-sans hardware-grid"
      >
        <Toaster position="top-right" theme="dark" />
        
        {/* Header */}
        <header className="border-b border-border bg-card/50 backdrop-blur-md sticky top-0 z-50">
          <div className="container mx-auto px-4 h-16 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div 
                className="w-10 h-10 bg-primary rounded-lg flex items-center justify-center glow-primary cursor-pointer"
                onClick={() => setView('landing')}
              >
                <FileCode className="text-white w-6 h-6" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h1 className="font-bold text-xl tracking-tight">{currentProject?.name || 'ScriptCraft AI'}</h1>
                  <Button variant="ghost" size="icon" className="h-6 w-6" onClick={handleSaveProject} disabled={isSaving}>
                    <Save className={`w-3 h-3 ${isSaving ? 'animate-pulse' : ''}`} />
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground font-mono uppercase tracking-widest">Project ID: {currentProject?.id}</p>
              </div>
            </div>
            
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={() => projectStorage.exportProject(currentProject!)} className="gap-2">
                <Download className="w-4 h-4" /> Export Project
              </Button>
              <div className="h-4 w-[1px] bg-border mx-2" />
              <Button variant="outline" size="sm" onClick={handleReset} className="gap-2 text-muted-foreground">
                <RotateCcw className="w-4 h-4" /> Dashboard
              </Button>
              <div className="h-4 w-[1px] bg-border mx-2" />
              <Button variant="outline" size="sm" onClick={copyToClipboard} className="gap-2">
                <Copy className="w-4 h-4" /> Copy
              </Button>
            </div>
          </div>
        </header>

        <main className="container mx-auto px-4 py-8 grid grid-cols-1 lg:grid-cols-12 gap-8">
          
          {/* Left Column: Editor */}
          <div className="lg:col-span-8 space-y-6">
            <Card className="border-border bg-card/30 backdrop-blur-sm overflow-hidden">
              <CardHeader className="flex flex-row items-center justify-between border-b border-border py-3">
                <div className="flex items-center gap-2">
                  <Type className="w-4 h-4 text-primary" />
                  <CardTitle className="text-sm font-mono uppercase tracking-wider">Script Editor</CardTitle>
                </div>
                <div className="flex items-center gap-4">
                  {currentTag && (
                    <Badge variant="secondary" className="font-mono text-[10px] bg-primary/10 text-primary border-primary/20">
                      TAG: {currentTag}
                    </Badge>
                  )}
                  <Badge variant="outline" className="font-mono text-[10px] gap-2">
                    <Volume2 className="w-3 h-3" /> Est. {getEstimatedLength()}
                  </Badge>
                  <Badge variant="outline" className="font-mono text-[10px]">
                    {content.length} characters // {content.split(/\s+/).filter(Boolean).length} words
                  </Badge>
                </div>
              </CardHeader>
              <div className="bg-muted/30 border-b border-border p-2 flex flex-wrap gap-1 items-center">
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button variant="ghost" size="sm" className="h-8 px-2 gap-1 text-[10px] font-mono uppercase" onClick={() => insertTag('<pause:1s>')}>
                      <Timer className="w-3 h-3" /> Pause
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Insert 1s pause</TooltipContent>
                </Tooltip>

                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button variant="ghost" size="sm" className="h-8 px-2 gap-1 text-[10px] font-mono uppercase" onClick={() => insertTag('<00:00>')}>
                      <Clock className="w-3 h-3" /> Time
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Insert timing marker</TooltipContent>
                </Tooltip>

                <Separator orientation="vertical" className="h-4 mx-1" />

                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button variant="ghost" size="sm" className="h-8 px-2 gap-1 text-[10px] font-mono uppercase" onClick={() => insertTag('<emphasis>')}>
                      <Sparkles className="w-3 h-3" /> Emphasis
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Add emphasis</TooltipContent>
                </Tooltip>

                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button variant="ghost" size="sm" className="h-8 px-2 gap-1 text-[10px] font-mono uppercase" onClick={() => insertTag('<whisper>')}>
                      <Ear className="w-3 h-3" /> Whisper
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Add whisper effect</TooltipContent>
                </Tooltip>

                <Separator orientation="vertical" className="h-4 mx-1" />

                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button variant="ghost" size="sm" className="h-8 px-2 gap-1 text-[10px] font-mono uppercase" onClick={() => insertTag('<speed:1.2>')}>
                      <Gauge className="w-3 h-3" /> Speed
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Adjust speaking rate</TooltipContent>
                </Tooltip>

                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button variant="ghost" size="sm" className="h-8 px-2 gap-1 text-[10px] font-mono uppercase" onClick={() => insertTag('<emotion:happy>')}>
                      <Smile className="w-3 h-3" /> Emotion
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Add emotional tone</TooltipContent>
                </Tooltip>

                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button variant="ghost" size="sm" className="h-8 px-2 gap-1 text-[10px] font-mono uppercase text-primary" onClick={() => insertTag('<normal>')}>
                      <RotateCcw className="w-3 h-3" /> Normal
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Reset all styles to normal</TooltipContent>
                </Tooltip>
              </div>
              <CardContent className="p-0 relative">
                <Textarea
                  ref={textareaRef}
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  placeholder="Type or paste your script here..."
                  className="min-h-[500px] w-full bg-transparent border-none focus-visible:ring-0 resize-none p-6 font-mono text-lg leading-relaxed placeholder:text-muted-foreground/30"
                />
                <AnimatePresence>
                  {isRewriting && (
                    <motion.div 
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      className="absolute inset-0 bg-background/60 backdrop-blur-[2px] flex items-center justify-center z-10"
                    >
                      <div className="flex flex-col items-center gap-4">
                        <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin" />
                        <p className="font-mono text-sm animate-pulse">AI is crafting your script...</p>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </CardContent>
            </Card>

            {/* AI Tools Bar */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Card className="border-border bg-card/30">
                <CardHeader className="py-3">
                  <CardTitle className="text-xs font-mono uppercase tracking-wider flex items-center gap-2">
                    <Sparkles className="w-3 h-3" /> Quick Rewrite
                  </CardTitle>
                </CardHeader>
                <CardContent className="flex flex-wrap gap-2 p-4 pt-0">
                  {TONE_PRESETS.map((preset) => {
                    const Icon = ICON_MAP[preset.icon];
                    return (
                      <Button
                        key={preset.name}
                        variant="secondary"
                        size="sm"
                        className="text-xs h-8 gap-2"
                        onClick={() => handleRewrite(preset.instruction, preset.name)}
                        disabled={isRewriting}
                      >
                        {Icon && <Icon className="w-3 h-3" />}
                        {preset.name}
                      </Button>
                    );
                  })}
                </CardContent>
              </Card>

              <Card className="border-border bg-card/30">
                <CardHeader className="py-3">
                  <CardTitle className="text-xs font-mono uppercase tracking-wider flex items-center gap-2">
                    <Settings2 className="w-3 h-3" /> Custom Instruction
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-4 pt-0 flex gap-2">
                  <Textarea
                    placeholder="e.g. Make it more like a 1950s radio ad..."
                    className="h-24 min-h-[96px] py-2 text-xs resize-none"
                    value={customInstruction}
                    onChange={(e) => setCustomInstruction(e.target.value)}
                  />
                  <Button 
                    size="sm" 
                    className="h-24"
                    onClick={() => handleRewrite(customInstruction)}
                    disabled={isRewriting || !customInstruction.trim()}
                  >
                    Apply
                  </Button>
                </CardContent>
              </Card>
            </div>
          </div>

          {/* Right Column: Sidebar */}
          <div className="lg:col-span-4 space-y-6">
            
            {/* Visualizer */}
            <Card className="border-border bg-card/30">
              <CardHeader className="py-3 border-b border-border">
                <CardTitle className="text-xs font-mono uppercase tracking-wider flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <ImageIcon className="w-3 h-3" /> Visualizer
                  </div>
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    className="h-6 w-6" 
                    onClick={handleGenerateImage}
                    disabled={isGeneratingImage}
                  >
                    <RotateCcw className={`w-3 h-3 ${isGeneratingImage ? 'animate-spin' : ''}`} />
                  </Button>
                </CardTitle>
              </CardHeader>
              <CardContent className="p-4">
                <div className={`${getAspectRatioClass()} bg-muted rounded-lg overflow-hidden relative group`}>
                  {generatedImage ? (
                    <>
                      <img src={generatedImage} alt="Generated visual" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                      <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                        <Button variant="secondary" size="sm" className="h-8 gap-2" asChild>
                          <a href={generatedImage} download={`script-visual-${Date.now()}.png`}>
                            <Download className="w-3 h-3" /> Download
                          </a>
                        </Button>
                        <Button variant="secondary" size="sm" className="h-8 gap-2" asChild>
                          <a href={generatedImage} target="_blank" rel="noopener noreferrer">
                            <ExternalLink className="w-3 h-3" /> Open
                          </a>
                        </Button>
                      </div>
                    </>
                  ) : (
                    <div className="w-full h-full flex flex-col items-center justify-center text-muted-foreground/40 gap-2">
                      <ImageIcon className="w-8 h-8" />
                      <p className="text-[10px] uppercase font-mono">No visual generated</p>
                    </div>
                  )}
                  {isGeneratingImage && (
                    <div className="absolute inset-0 bg-background/80 flex items-center justify-center">
                      <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                    </div>
                  )}
                </div>
                <div className="mt-4 grid grid-cols-1 gap-4">
                  <div className="space-y-1.5">
                    <Label className="text-[10px] uppercase text-muted-foreground">Aspect Ratio</Label>
                    <Select 
                      value={imageConfig.aspectRatio} 
                      onValueChange={(v) => setImageConfig(prev => ({ ...prev, aspectRatio: v }))}
                    >
                      <SelectTrigger className="h-8 text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="1:1">1:1 Square</SelectItem>
                        <SelectItem value="16:9">16:9 Wide</SelectItem>
                        <SelectItem value="9:16">9:16 Vertical</SelectItem>
                        <SelectItem value="4:3">4:3 Classic</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* TTS Panel */}
            <Card className="border-border bg-card/30">
              <CardHeader className="py-3 border-b border-border">
                <CardTitle className="text-xs font-mono uppercase tracking-wider flex items-center gap-2">
                  <Volume2 className="w-3 h-3" /> Voice Synthesis
                </CardTitle>
              </CardHeader>
              <CardContent className="p-4 space-y-4">
                <div className="space-y-2">
                  <Label className="text-[10px] uppercase text-muted-foreground">Select Voice</Label>
                  <div className="grid grid-cols-1 gap-2">
                    {VOICES.map((voice) => (
                      <div 
                        key={voice.name}
                        className={`flex flex-col p-2 rounded-md border cursor-pointer transition-all duration-300 ${
                          selectedVoice === voice.name ? 'bg-primary/10 border-primary' : 'bg-muted/50 border-transparent hover:border-border'
                        }`}
                        onClick={() => setSelectedVoice(voice.name)}
                      >
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-xs font-medium">{voice.name}</p>
                            <p className="text-[10px] text-muted-foreground">{voice.description}</p>
                          </div>
                          <div className="flex items-center gap-1">
                            <Button 
                              variant="ghost" 
                              size="icon" 
                              className="h-6 w-6"
                              onClick={(e) => {
                                e.stopPropagation();
                                playVoiceSample(voice.name);
                              }}
                            >
                              <Play className="w-3 h-3" />
                            </Button>
                            <ChevronRight className={`w-3 h-3 transition-transform duration-300 ${selectedVoice === voice.name ? 'rotate-90' : ''}`} />
                          </div>
                        </div>

                        <AnimatePresence>
                          {selectedVoice === voice.name && (
                            <motion.div
                              initial={{ height: 0, opacity: 0, marginTop: 0 }}
                              animate={{ height: 'auto', opacity: 1, marginTop: 12 }}
                              exit={{ height: 0, opacity: 0, marginTop: 0 }}
                              className="overflow-hidden space-y-4 pt-2 border-t border-primary/20"
                              onClick={(e) => e.stopPropagation()}
                            >
                              <div className="space-y-2">
                                <div className="flex justify-between items-center">
                                  <Label className="text-[10px] uppercase text-muted-foreground">Speed</Label>
                                  <span className="text-[10px] font-mono text-primary">{ttsSettings.speed.toFixed(1)}x</span>
                                </div>
                                <Slider
                                  value={[ttsSettings.speed]}
                                  min={0.5}
                                  max={2.0}
                                  step={0.1}
                                  onValueChange={(v) => {
                                    const val = Array.isArray(v) ? v[0] : v;
                                    setTtsSettings(prev => ({ ...prev, speed: val }));
                                  }}
                                  className="py-2"
                                />
                              </div>

                              <div className="space-y-2">
                                <div className="flex justify-between items-center">
                                  <Label className="text-[10px] uppercase text-muted-foreground">Pitch</Label>
                                  <span className="text-[10px] font-mono text-primary">{ttsSettings.pitch.toFixed(1)}x</span>
                                </div>
                                <Slider
                                  value={[ttsSettings.pitch]}
                                  min={0.5}
                                  max={1.5}
                                  step={0.1}
                                  onValueChange={(v) => {
                                    const val = Array.isArray(v) ? v[0] : v;
                                    setTtsSettings(prev => ({ ...prev, pitch: val }));
                                  }}
                                  className="py-2"
                                />
                              </div>
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </div>
                    ))}
                  </div>
                </div>

                <Button 
                  className="w-full gap-2" 
                  onClick={handleGenerateAudio}
                  disabled={isGeneratingAudio}
                >
                  {isGeneratingAudio ? (
                    <RotateCcw className="w-4 h-4 animate-spin" />
                  ) : (
                    <Mic2 className="w-4 h-4" />
                  )}
                  Generate Audio
                </Button>

                {generatedAudio && (
                  <div className="p-3 bg-muted/50 rounded-lg flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Button 
                        variant="secondary" 
                        size="icon" 
                        className="h-8 w-8 rounded-full"
                        onClick={() => {
                          if (audioRef.current) {
                            if (isPlaying) audioRef.current.pause();
                            else audioRef.current.play();
                            setIsPlaying(!isPlaying);
                          }
                        }}
                      >
                        {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                      </Button>
                      <span className="text-[10px] font-mono uppercase">Generated Audio</span>
                    </div>
                    <Button variant="ghost" size="icon" className="h-8 w-8" asChild>
                      <a href={generatedAudio} download={`script-audio-${Date.now()}.wav`}>
                        <Download className="w-4 h-4" />
                      </a>
                    </Button>
                    <audio 
                      ref={audioRef} 
                      src={generatedAudio} 
                      onEnded={() => setIsPlaying(false)}
                      className="hidden"
                    />
                  </div>
                )}
              </CardContent>
            </Card>

            {/* History Stack */}
            <Card className="border-border bg-card/30">
              <CardHeader className="py-3 border-b border-border">
                <CardTitle className="text-xs font-mono uppercase tracking-wider flex items-center gap-2">
                  <History className="w-3 h-3" /> History Stack
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <ScrollArea className="h-[300px]">
                  <div className="p-2 space-y-1">
                    {history.length === 0 ? (
                      <div className="py-8 text-center text-muted-foreground/40">
                        <History className="w-8 h-8 mx-auto mb-2 opacity-20" />
                        <p className="text-[10px] uppercase font-mono">No history yet</p>
                      </div>
                    ) : (
                      history.map((version) => (
                        <div 
                          key={version.id}
                          className="group flex items-center justify-between p-3 rounded-md hover:bg-muted/50 transition-colors border border-transparent hover:border-border cursor-pointer"
                          onClick={() => revertToVersion(version)}
                        >
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2">
                              <p className="text-xs font-medium truncate">{version.label}</p>
                              {version.tag && (
                                <Badge variant="outline" className="text-[8px] h-3 px-1 font-mono uppercase border-primary/30 text-primary/70">
                                  {version.tag}
                                </Badge>
                              )}
                            </div>
                            <p className="text-[10px] text-muted-foreground font-mono">
                              {new Date(version.timestamp).toLocaleTimeString()}
                            </p>
                          </div>
                          <ChevronRight className="w-4 h-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                        </div>
                      ))
                    )}
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>

          </div>
        </main>

        {/* Footer */}
        <footer className="border-t border-border py-6 mt-12 bg-card/30">
          <div className="container mx-auto px-4 flex flex-col md:flex-row items-center justify-between gap-4">
            <p className="text-xs text-muted-foreground font-mono">
              &copy; 2026 SCRIPT-CRAFT AI // ALL SYSTEMS OPERATIONAL
            </p>
            <div className="flex items-center gap-6">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                <span className="text-[10px] font-mono uppercase text-muted-foreground">Gemini 3.1 Pro</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                <span className="text-[10px] font-mono uppercase text-muted-foreground">TTS Engine v2.5</span>
              </div>
            </div>
          </div>
        </footer>
      </motion.div>
    </TooltipProvider>
  );
}
