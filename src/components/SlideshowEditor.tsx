import React, { useState, useRef } from 'react';
import { 
  Plus, 
  Trash2, 
  Image as ImageIcon, 
  Sparkles, 
  ChevronLeft, 
  ChevronRight, 
  Upload, 
  Play, 
  Save,
  X,
  Type,
  Layers,
  ArrowLeft,
  ArrowRight,
  Loader2
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Button } from '../../components/ui/button';
import { Card, CardContent } from '../../components/ui/card';
import { Textarea } from '../../components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../components/ui/select';
import { Label } from '../../components/ui/label';
import { Slide, TransitionType } from '../types';
import { generateSceneImage } from '../lib/gemini';
import { toast } from 'sonner';

interface SlideshowEditorProps {
  slides: Slide[];
  onSave: (slides: Slide[]) => void;
  onCancel: () => void;
  globalContext: {
    tone?: string;
    theme?: string;
    tags?: string;
  };
}

export const SlideshowEditor: React.FC<SlideshowEditorProps> = ({ 
  slides: initialSlides, 
  onSave, 
  onCancel,
  globalContext 
}) => {
  const [slides, setSlides] = useState<Slide[]>(initialSlides.length > 0 ? initialSlides : [{
    id: crypto.randomUUID(),
    text: '',
    visualPrompt: '',
    image: null,
    transition: 'fade'
  }]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isGenerating, setIsGenerating] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const currentSlide = slides[currentIndex];

  const updateSlide = (updates: Partial<Slide>) => {
    const newSlides = [...slides];
    newSlides[currentIndex] = { ...currentSlide, ...updates };
    setSlides(newSlides);
  };

  const addSlide = (after: boolean) => {
    const newSlide: Slide = {
      id: crypto.randomUUID(),
      text: '',
      visualPrompt: '',
      image: null,
      transition: 'fade'
    };
    const newSlides = [...slides];
    const insertIndex = after ? currentIndex + 1 : currentIndex;
    newSlides.splice(insertIndex, 0, newSlide);
    setSlides(newSlides);
    setCurrentIndex(insertIndex);
  };

  const deleteSlide = () => {
    if (slides.length <= 1) {
      setSlides([{
        id: crypto.randomUUID(),
        text: '',
        visualPrompt: '',
        image: null,
        transition: 'fade'
      }]);
      return;
    }
    const newSlides = slides.filter((_, i) => i !== currentIndex);
    setSlides(newSlides);
    setCurrentIndex(Math.max(0, currentIndex - 1));
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        updateSlide({ image: reader.result as string });
      };
      reader.readAsDataURL(file);
    }
  };

  const handleGenerateImage = async () => {
    if (!currentSlide.visualPrompt.trim()) {
      toast.error('Please enter a visual description first.');
      return;
    }

    setIsGenerating(true);
    try {
      // Prompt Augmentation Logic: [Global Theme/Style Context] + [Current Script Tag] + [User's Custom Description]
      const augmentedPrompt = `${globalContext.theme || 'Cinematic'} style, ${globalContext.tags || ''}. ${currentSlide.visualPrompt}`.trim();

      const result = await generateSceneImage(augmentedPrompt, {
        aspectRatio: '16:9'
      });

      if (result) {
        updateSlide({ image: result });
        toast.success('Image generated successfully!');
      }
    } catch (error) {
      console.error(error);
      toast.error('Failed to generate image.');
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="flex flex-col h-full bg-background text-foreground">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-border bg-card/50 backdrop-blur-md">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={onCancel}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div>
            <h2 className="text-lg font-semibold">Slideshow Editor</h2>
            <p className="text-xs text-muted-foreground uppercase tracking-wider font-mono">
              Slide {currentIndex + 1} of {slides.length}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="default" className="gap-2" onClick={() => onSave(slides)}>
            <Save className="w-4 h-4" /> Save Changes
          </Button>
        </div>
      </div>

      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar / Timeline */}
        <div className="w-64 border-r border-border bg-card/20 overflow-y-auto p-4 space-y-4">
          <div className="flex items-center justify-between mb-4">
            <span className="text-xs font-mono uppercase text-muted-foreground">Timeline</span>
            <div className="flex gap-1">
              <Button variant="outline" size="icon" className="h-7 w-7" onClick={() => addSlide(false)}>
                <Plus className="w-3 h-3" />
              </Button>
            </div>
          </div>
          <div className="space-y-3">
            {slides.map((slide, index) => (
              <motion.div
                key={slide.id}
                layout
                onClick={() => setCurrentIndex(index)}
                className={`relative group cursor-pointer rounded-lg border-2 transition-all aspect-video overflow-hidden ${
                  currentIndex === index ? 'border-primary ring-2 ring-primary/20' : 'border-border hover:border-primary/50'
                }`}
              >
                {slide.image ? (
                  <img src={slide.image} alt="" className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full bg-muted flex items-center justify-center">
                    <ImageIcon className="w-6 h-6 text-muted-foreground/30" />
                  </div>
                )}
                <div className="absolute bottom-0 left-0 right-0 bg-black/60 p-1 text-[10px] text-white truncate px-2">
                  {index + 1}. {slide.text || 'Empty Slide'}
                </div>
                {currentIndex === index && (
                  <div className="absolute top-1 right-1">
                    <Button 
                      variant="destructive" 
                      size="icon" 
                      className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
                      onClick={(e) => {
                        e.stopPropagation();
                        deleteSlide();
                      }}
                    >
                      <Trash2 className="w-3 h-3" />
                    </Button>
                  </div>
                )}
              </motion.div>
            ))}
            <Button 
              variant="outline" 
              className="w-full border-dashed gap-2 py-8" 
              onClick={() => addSlide(true)}
            >
              <Plus className="w-4 h-4" /> Add Slide
            </Button>
          </div>
        </div>

        {/* Main Stage */}
        <div className="flex-1 overflow-y-auto p-8 bg-muted/10">
          <div className="max-w-4xl mx-auto space-y-8">
            {/* Slide Preview */}
            <Card className="overflow-hidden border-border shadow-2xl aspect-video relative group">
              {currentSlide.image ? (
                <img src={currentSlide.image} alt="Slide Preview" className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full bg-muted flex flex-col items-center justify-center gap-4">
                  <ImageIcon className="w-12 h-12 text-muted-foreground/20" />
                  <p className="text-sm text-muted-foreground">No visual selected for this slide</p>
                </div>
              )}
              
              {/* Text Overlay Preview */}
              <div className="absolute bottom-0 left-0 right-0 p-8 bg-gradient-to-t from-black/80 to-transparent">
                <p className="text-white text-center text-xl font-medium drop-shadow-lg">
                  {currentSlide.text || 'Add slide text below...'}
                </p>
              </div>

              {isGenerating && (
                <div className="absolute inset-0 bg-black/60 backdrop-blur-sm flex flex-col items-center justify-center gap-4 z-20">
                  <Loader2 className="w-10 h-10 text-primary animate-spin" />
                  <p className="text-white font-mono text-sm animate-pulse">GENERATING VISUAL...</p>
                </div>
              )}
            </Card>

            {/* Controls Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              {/* Left Column: Content */}
              <div className="space-y-6">
                <div className="space-y-2">
                  <Label className="text-xs font-mono uppercase text-muted-foreground flex items-center gap-2">
                    <Type className="w-3 h-3" /> Slide Text
                  </Label>
                  <Textarea
                    value={currentSlide.text}
                    onChange={(e) => updateSlide({ text: e.target.value })}
                    placeholder="What should this slide say?"
                    className="min-h-[120px] bg-card resize-none"
                  />
                </div>

                <div className="space-y-2">
                  <Label className="text-xs font-mono uppercase text-muted-foreground flex items-center gap-2">
                    <Layers className="w-3 h-3" /> Transition
                  </Label>
                  <Select 
                    value={currentSlide.transition} 
                    onValueChange={(val) => updateSlide({ transition: val as TransitionType })}
                  >
                    <SelectTrigger className="bg-card">
                      <SelectValue placeholder="Select transition" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">None (Cut)</SelectItem>
                      <SelectItem value="fade">Fade</SelectItem>
                      <SelectItem value="slide">Slide</SelectItem>
                      <SelectItem value="convex">Convex</SelectItem>
                      <SelectItem value="concave">Concave</SelectItem>
                      <SelectItem value="zoom">Zoom</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Right Column: Visuals */}
              <div className="space-y-6">
                <div className="space-y-4">
                  <Label className="text-xs font-mono uppercase text-muted-foreground flex items-center gap-2">
                    <ImageIcon className="w-3 h-3" /> Visual Assets
                  </Label>
                  
                  <div className="grid grid-cols-2 gap-3">
                    <Button 
                      variant="outline" 
                      className="h-24 flex-col gap-2 border-dashed hover:border-primary/50 hover:bg-primary/5"
                      onClick={() => fileInputRef.current?.click()}
                    >
                      <Upload className="w-5 h-5 text-muted-foreground" />
                      <span className="text-[10px] uppercase font-mono">Upload Image</span>
                    </Button>
                    <input 
                      type="file" 
                      ref={fileInputRef} 
                      className="hidden" 
                      accept="image/*" 
                      onChange={handleFileUpload}
                    />

                    <div className="relative group h-24">
                      <div className="absolute inset-0 bg-primary/10 rounded-md border border-primary/20 flex flex-col items-center justify-center gap-2">
                        <Sparkles className="w-5 h-5 text-primary" />
                        <span className="text-[10px] uppercase font-mono text-primary">AI Generator</span>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label className="text-[10px] uppercase text-muted-foreground">AI Visual Prompt</Label>
                    <div className="relative">
                      <Textarea
                        value={currentSlide.visualPrompt}
                        onChange={(e) => updateSlide({ visualPrompt: e.target.value })}
                        placeholder="Describe the visual you want..."
                        className="pr-12 bg-card min-h-[80px]"
                      />
                      <Button 
                        size="icon" 
                        className="absolute bottom-2 right-2 h-8 w-8"
                        onClick={handleGenerateImage}
                        disabled={isGenerating}
                      >
                        {isGenerating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
                      </Button>
                    </div>
                    <p className="text-[9px] text-muted-foreground italic">
                      * Prompt will be augmented with project theme: {globalContext.theme || 'Cinematic'}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
