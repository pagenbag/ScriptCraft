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
  ExternalLink,
  Plus,
  GraduationCap,
  Presentation,
  Layout,
  Loader2,
  Eye,
  Monitor,
  X
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

import { rewriteScript, generateSceneImage, generateSpeech, generateInstructionTag, generateProjectTitle, splitScriptIntoScenes } from './lib/gemini';
import { pcmToWav } from './lib/wavHelper';
import { ScriptVersion, TONE_PRESETS, VOICES, Project, Slide } from './types';
import { LandingPage } from './components/LandingPage';
import { SlideshowEditor } from './components/SlideshowEditor';
import { ProjectBrowser } from './components/ProjectBrowser';
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
  const [isGeneratingSlideshow, setIsGeneratingSlideshow] = useState(false);
  const [generatedSlideshow, setGeneratedSlideshow] = useState<string | null>(null);
  const [showSlideshowPreview, setShowSlideshowPreview] = useState(false);
  const [generatedImage, setGeneratedImage] = useState<string | null>(null);
  const [generatedAudio, setGeneratedAudio] = useState<string | null>(null);
  const [slideshowDraft, setSlideshowDraft] = useState<Slide[]>([]);
  const [isEditingSlideshow, setIsEditingSlideshow] = useState(false);
  const [showProjectBrowser, setShowProjectBrowser] = useState(false);
  const [selectedVoice, setSelectedVoice] = useState(VOICES[0].name);
  const [ttsSettings, setTtsSettings] = useState({ speed: 1.0, pitch: 1.0 });
  const [customInstruction, setCustomInstruction] = useState('');
  const [imageConfig, setImageConfig] = useState({ aspectRatio: '16:9' });
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const ICON_MAP: Record<string, any> = {
    Briefcase,
    Laugh,
    Clapperboard,
    Scissors,
    Maximize,
    Zap,
    Mic2,
    GraduationCap
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
      setSlideshowDraft(currentProject.slideshowDraft || []);
    }
  }, [currentProject?.id]);

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
          slideshowDraft,
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
      const result = await generateSceneImage(content.slice(0, 500), {
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

  const handleOpenImage = () => {
    if (!generatedImage) return;
    
    const newWindow = window.open();
    if (newWindow) {
      newWindow.document.write(`
        <html>
          <head>
            <title>EchoFlow - Generated Visual</title>
            <style>
              body { margin: 0; background: #0a0a0a; display: flex; align-items: center; justify-content: center; min-height: 100vh; }
              img { max-width: 100%; max-height: 100vh; object-fit: contain; }
            </style>
          </head>
          <body>
            <img src="${generatedImage}" alt="Generated Visual" />
          </body>
        </html>
      `);
      newWindow.document.close();
    } else {
      toast.error('Pop-up blocked. Please allow pop-ups to open the image.');
    }
  };

  const formatTime = (time: number) => {
    const mins = Math.floor(time / 60);
    const secs = Math.floor(time % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const handleGenerateAudio = async () => {
    if (!content.trim()) {
      toast.error('Please enter some script text first.');
      return;
    }
    setIsGeneratingAudio(true);
    try {
      const voice = VOICES.find(v => v.name === selectedVoice);
      const voiceId = voice ? voice.voiceId : selectedVoice;
      
      const result = await generateSpeech(content, voiceId, ttsSettings);
      if (result) {
        const wavUrl = pcmToWav(result);
        setGeneratedAudio(wavUrl);
        setCurrentTime(0);
        setIsPlaying(false);
        toast.success('Audio generated!');
      }
    } catch (error) {
      console.error(error);
      toast.error('Failed to generate audio.');
    } finally {
      setIsGeneratingAudio(false);
    }
  };

  const handleGenerateSlideshow = async (customSlides?: Slide[]) => {
    if (!content.trim() && !customSlides) {
      toast.error('Please enter some script text first.');
      return;
    }
    setIsGeneratingSlideshow(true);
    try {
      let slidesToUse: Slide[] = [];

      if (customSlides) {
        slidesToUse = customSlides;
      } else if (slideshowDraft.length > 0) {
        slidesToUse = slideshowDraft;
      } else {
        toast.info('Analyzing script and splitting into slides...');
        const scenes = await splitScriptIntoScenes(content);
        if (!scenes || scenes.length === 0) {
          throw new Error('Failed to split script into scenes');
        }
        
        slidesToUse = scenes.map(scene => ({
          id: crypto.randomUUID(),
          text: scene.slideText,
          visualPrompt: scene.visualPrompt,
          image: null,
          transition: 'fade'
        }));
      }

      toast.info(`Generating ${slidesToUse.length} slides with images...`);
      
      const titleImage = generatedImage || await generateSceneImage(`A professional cinematic title background for a project named "${currentProject?.name || 'EchoFlow'}"`, { aspectRatio: '16:9', tag: currentTag });
      
      let slidesHtml = `
        <section data-background-image="${titleImage || ''}" data-background-size="cover">
          <div style="background: rgba(0,0,0,0.4); padding: 40px; border-radius: 12px; display: inline-block;">
            <h1 style="color: white; margin: 0; font-size: 3.5em; text-shadow: 2px 2px 4px rgba(0,0,0,0.5);">${currentProject?.name || 'EchoFlow'}</h1>
          </div>
        </section>
      `;

      for (let i = 0; i < slidesToUse.length; i++) {
        const slide = slidesToUse[i];
        let imageUrl = slide.image;

        if (!imageUrl) {
          imageUrl = await generateSceneImage(slide.visualPrompt, {
            aspectRatio: '16:9',
            tag: currentTag
          });
        }

        slidesHtml += `
          <section data-background-image="${imageUrl || ''}" data-background-size="cover" data-transition="${slide.transition}">
            <div style="position: absolute; bottom: 10%; left: 50%; transform: translateX(-50%); width: 80%; background: rgba(0,0,0,0.6); padding: 30px; border-radius: 12px; box-sizing: border-box;">
              <p style="color: white; margin: 0; font-size: 1.2em; line-height: 1.4; font-weight: 600;">${slide.text}</p>
            </div>
          </section>
        `;
        
        toast.info(`Slide ${i + 1}/${slidesToUse.length} complete`);
      }

      const fullHtml = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>${currentProject?.name || 'EchoFlow'} - Presentation</title>
  <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/reveal.js@4.5.0/dist/reveal.css">
  <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/reveal.js@4.5.0/dist/theme/black.css">
  <style>
    .reveal section img { max-width: 100%; max-height: 100%; }
    body { background: #000; }
  </style>
</head>
<body>
  <div class="reveal">
    <div class="slides">
      ${slidesHtml}
    </div>
  </div>
  <script src="https://cdn.jsdelivr.net/npm/reveal.js@4.5.0/dist/reveal.js"></script>
  <script>
    Reveal.initialize({
      hash: true,
      center: true,
      transition: 'slide',
      backgroundTransition: 'fade'
    });
  </script>
</body>
</html>`;

      setGeneratedSlideshow(fullHtml);
      setShowSlideshowPreview(true);
      toast.success('Slideshow generated! You can now preview it.');
    } catch (error) {
      console.error(error);
      toast.error('Failed to generate slideshow.');
    } finally {
      setIsGeneratingSlideshow(false);
    }
  };

  const handleDraftSlideshow = async () => {
    if (slideshowDraft.length > 0) {
      setIsEditingSlideshow(true);
      return;
    }

    if (!content.trim()) {
      toast.error('Please write some content first.');
      return;
    }

    setIsGeneratingSlideshow(true);
    try {
      toast.info('Analyzing script and splitting into slides...');
      const scenes = await splitScriptIntoScenes(content);
      if (!scenes || scenes.length === 0) {
        throw new Error('Failed to split script into scenes');
      }
      
      const draft = scenes.map(scene => ({
        id: crypto.randomUUID(),
        text: scene.slideText,
        visualPrompt: scene.visualPrompt,
        image: null,
        transition: 'fade' as const
      }));

      setSlideshowDraft(draft);
      setIsEditingSlideshow(true);
      toast.success('Slideshow draft created! You can now edit individual slides.');
    } catch (error) {
      console.error(error);
      toast.error('Failed to create slideshow draft.');
    } finally {
      setIsGeneratingSlideshow(false);
    }
  };

  const handleDownloadSlideshow = () => {
    if (!generatedSlideshow) return;
    const blob = new Blob([generatedSlideshow], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${currentProject?.name || 'EchoFlow'}-Presentation.html`;
    a.click();
    toast.success('Slideshow downloaded!');
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

  const playVoiceSample = async (voiceName: string) => {
    try {
      const voice = VOICES.find(v => v.name === voiceName);
      const voiceId = voice ? voice.voiceId : voiceName;
      
      const sampleText = `Hello, I am ${voiceName}. This is a sample of my voice.`;
      const result = await generateSpeech(sampleText, voiceId, ttsSettings);
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
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <input 
                    value={currentProject?.name || ''} 
                    onChange={(e) => setCurrentProject(prev => prev ? { ...prev, name: e.target.value } : null)}
                    className="bg-transparent border-none font-bold text-xl tracking-tight focus:ring-0 p-0 w-full focus:outline-none hover:bg-muted/30 rounded px-1 transition-colors"
                    placeholder="Project Name"
                  />
                </div>
                <p className="text-xs text-muted-foreground font-mono uppercase tracking-widest truncate">Project ID: {currentProject?.id}</p>
              </div>
            </div>
            
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={() => setShowProjectBrowser(true)} className="gap-2">
                <Clock className="w-4 h-4" /> All Projects
              </Button>
              <Button variant="outline" size="sm" onClick={handleNewProject} className="gap-2 text-primary border-primary/20 hover:bg-primary/10">
                <Plus className="w-4 h-4" /> New Project
              </Button>
              <div className="h-4 w-[1px] bg-border mx-2" />
              <Button variant="outline" size="sm" onClick={() => projectStorage.exportProject(currentProject!)} className="gap-2">
                <Download className="w-4 h-4" /> Export Project
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
                        <Button variant="secondary" size="sm" className="h-8 gap-2" asChild nativeButton={false}>
                          <a href={generatedImage} download={`script-visual-${Date.now()}.png`}>
                            <Download className="w-3 h-3" /> Download
                          </a>
                        </Button>
                        <Button variant="secondary" size="sm" className="h-8 gap-2" onClick={handleOpenImage}>
                          <ExternalLink className="w-3 h-3" /> Open
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
                  <div className="p-3 bg-muted/50 rounded-lg space-y-3">
                    <div className="flex items-center justify-between">
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
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] font-mono text-muted-foreground">
                          {formatTime(currentTime)} / {formatTime(duration)}
                        </span>
                        <Button variant="ghost" size="icon" className="h-8 w-8" asChild nativeButton={false}>
                          <a href={generatedAudio} download={`echo-flow-audio-${Date.now()}.wav`}>
                            <Download className="w-4 h-4" />
                          </a>
                        </Button>
                      </div>
                    </div>
                    
                    <Slider
                      value={[currentTime]}
                      max={duration || 100}
                      step={0.1}
                      onValueChange={(v) => {
                        const val = Array.isArray(v) ? v[0] : v;
                        if (audioRef.current) {
                          audioRef.current.currentTime = val;
                          setCurrentTime(val);
                        }
                      }}
                      className="py-1"
                    />

                    <audio 
                      ref={audioRef} 
                      src={generatedAudio} 
                      onEnded={() => setIsPlaying(false)}
                      onTimeUpdate={() => {
                        if (audioRef.current) {
                          setCurrentTime(audioRef.current.currentTime);
                        }
                      }}
                      onLoadedMetadata={() => {
                        if (audioRef.current) {
                          setDuration(audioRef.current.duration);
                        }
                      }}
                      className="hidden"
                    />
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Production Studio */}
            <Card className="border-border bg-card/30">
              <CardHeader className="py-3 border-b border-border">
                <CardTitle className="text-xs font-mono uppercase tracking-wider flex items-center gap-2">
                  <Clapperboard className="w-3 h-3" /> Production Studio
                </CardTitle>
              </CardHeader>
              <CardContent className="p-4 space-y-3">
                <div className="space-y-2">
                  <div className="grid grid-cols-2 gap-2">
                    <Button 
                      variant="outline" 
                      className="h-16 gap-3 text-[10px] uppercase font-mono transition-all hover:border-primary/50"
                      onClick={handleDraftSlideshow}
                      disabled={isGeneratingSlideshow}
                    >
                      <Settings2 className="w-5 h-5 text-primary" />
                      {slideshowDraft.length > 0 ? 'Edit Slides' : 'Draft Editor'}
                    </Button>
                    <Button 
                      variant="outline" 
                      className="h-16 gap-3 text-[10px] uppercase font-mono transition-all hover:border-primary/50"
                      onClick={() => handleGenerateSlideshow()}
                      disabled={isGeneratingSlideshow}
                    >
                      {isGeneratingSlideshow ? (
                        <Loader2 className="w-5 h-5 animate-spin" />
                      ) : (
                        <Presentation className="w-5 h-5" />
                      )}
                      {generatedSlideshow ? 'Regenerate' : 'Generate'}
                    </Button>
                  </div>
                  
                  {generatedSlideshow && (
                    <div className="grid grid-cols-2 gap-2">
                      <Button 
                        variant="secondary" 
                        className="gap-2 text-[10px] uppercase font-mono"
                        onClick={() => setShowSlideshowPreview(true)}
                      >
                        <Eye className="w-4 h-4" /> Preview
                      </Button>
                      <Button 
                        variant="secondary" 
                        className="gap-2 text-[10px] uppercase font-mono"
                        onClick={handleDownloadSlideshow}
                      >
                        <Download className="w-4 h-4" /> HTML
                      </Button>
                    </div>
                  )}
                </div>
                <p className="text-[9px] text-muted-foreground text-center italic">
                  Generates an interactive Reveal.js HTML slideshow.
                </p>
              </CardContent>
            </Card>

            {/* Slideshow Preview Modal */}
            <AnimatePresence>
              {showSlideshowPreview && generatedSlideshow && (
                <motion.div 
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="fixed inset-0 z-50 bg-black/90 flex flex-col"
                >
                  <div className="p-4 flex justify-between items-center bg-background/50 backdrop-blur-md border-b border-border">
                    <div className="flex items-center gap-2">
                      <Monitor className="w-4 h-4 text-primary" />
                      <span className="text-xs font-mono uppercase tracking-wider">Slideshow Preview</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button variant="outline" size="sm" className="gap-2 h-8 text-[10px]" onClick={handleDownloadSlideshow}>
                        <Download className="w-3 h-3" /> Download HTML
                      </Button>
                      <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setShowSlideshowPreview(false)}>
                        <X className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                  <div className="flex-1 bg-black">
                    <iframe 
                      srcDoc={generatedSlideshow} 
                      className="w-full h-full border-none"
                      title="Slideshow Preview"
                    />
                  </div>
                  <div className="p-2 text-center bg-background/50 backdrop-blur-md border-t border-border">
                    <p className="text-[10px] text-muted-foreground uppercase tracking-widest">
                      Use arrow keys to navigate • Esc to exit preview
                    </p>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

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
              &copy; 2026 ECHOFLOW // ALL SYSTEMS OPERATIONAL
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
      {/* Slideshow Editor Overlay */}
      <AnimatePresence>
        {isEditingSlideshow && (
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="fixed inset-0 z-[60] bg-background"
          >
            <SlideshowEditor 
              slides={slideshowDraft}
              onCancel={() => setIsEditingSlideshow(false)}
              onSave={(newSlides) => {
                setSlideshowDraft(newSlides);
                setIsEditingSlideshow(false);
                handleGenerateSlideshow(newSlides);
              }}
              globalContext={{
                theme: 'Cinematic',
                tags: currentTag
              }}
            />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Project Browser Overlay */}
      <AnimatePresence>
        {showProjectBrowser && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex justify-end overflow-hidden"
            onClick={() => setShowProjectBrowser(false)}
          >
            <motion.div
              initial={{ x: "100%" }}
              animate={{ x: 0 }}
              exit={{ x: "100%" }}
              transition={{ type: "spring", damping: 25, stiffness: 200 }}
              onClick={(e) => e.stopPropagation()}
              className="h-full flex"
            >
              <ProjectBrowser 
                projects={projectStorage.getProjectsList()}
                onLoadProject={(id) => {
                  handleLoadProject(id);
                  setShowProjectBrowser(false);
                }}
                onDeleteProject={(id) => {
                  projectStorage.deleteProject(id);
                  // Trigger a re-render if needed, though getProjectsList will be fresh next time
                  setShowProjectBrowser(false); // Simplest is to close and they can reopen
                }}
                onClose={() => setShowProjectBrowser(false)}
              />
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </TooltipProvider>
  );
}
