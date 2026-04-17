import React from 'react';
import { motion } from 'motion/react';
import { 
  FileCode, 
  Plus, 
  Clock, 
  ChevronRight, 
  Trash2, 
  Upload,
  Sparkles,
  Mic2,
  Image as ImageIcon
} from 'lucide-react';
import { Button } from '../../components/ui/button';
import { Card, CardContent } from '../../components/ui/card';
import { ProjectMetadata } from '../types';
import { projectStorage } from '../lib/storage';
import { ProjectBrowser } from './ProjectBrowser';
import { AnimatePresence } from 'motion/react';

interface LandingPageProps {
  onNewProject: () => void;
  onLoadProject: (id: string) => void;
  onImportProject: (project: any) => void;
}

export function LandingPage({ onNewProject, onLoadProject, onImportProject }: LandingPageProps) {
  const [recentProjects, setRecentProjects] = React.useState<ProjectMetadata[]>([]);
  const [showAllProjects, setShowAllProjects] = React.useState(false);
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  React.useEffect(() => {
    const list = projectStorage.getProjectsList();
    setRecentProjects(list.slice(0, 4));
  }, []);

  const handleFileImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const project = JSON.parse(event.target?.result as string);
        onImportProject(project);
      } catch (err) {
        console.error('Failed to parse project file', err);
      }
    };
    reader.readAsText(file);
  };

  const handleDelete = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    projectStorage.deleteProject(id);
    const list = projectStorage.getProjectsList();
    setRecentProjects(list.slice(0, 4));
  };

  const allProjects = projectStorage.getProjectsList();

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center p-4 hardware-grid overflow-hidden">
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="w-full max-w-4xl space-y-12"
      >
        {/* Logo & Hero */}
        <div className="text-center space-y-6">
          <motion.div 
            initial={{ scale: 0.8, rotate: -10 }}
            animate={{ scale: 1, rotate: 0 }}
            transition={{ type: "spring", stiffness: 100 }}
            className="w-24 h-24 bg-primary rounded-2xl mx-auto flex items-center justify-center glow-primary shadow-2xl"
          >
            <FileCode className="text-white w-12 h-12" />
          </motion.div>
          
          <div className="space-y-2">
            <h1 className="text-5xl font-bold tracking-tighter sm:text-6xl">
              Echo<span className="text-primary">Flow</span>
            </h1>
            <p className="text-muted-foreground text-lg max-w-[600px] mx-auto font-medium">
              The ultimate AI-powered scriptwriting and production studio. 
              Draft, refine, and visualize your ideas in seconds.
            </p>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-4">
            <Button size="lg" onClick={onNewProject} className="h-14 px-8 text-lg gap-2 glow-primary">
              <Plus className="w-5 h-5" /> Start New Project
            </Button>
            <Button size="lg" variant="outline" onClick={() => fileInputRef.current?.click()} className="h-14 px-8 text-lg gap-2">
              <Upload className="w-5 h-5" /> Import Project
            </Button>
            <input 
              type="file" 
              ref={fileInputRef} 
              className="hidden" 
              accept=".json" 
              onChange={handleFileImport} 
            />
          </div>
        </div>

        {/* Recent Projects */}
        {recentProjects.length > 0 && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.4 }}
            className="space-y-4"
          >
            <div className="flex items-center justify-between px-2">
              <div className="flex items-center gap-2 text-muted-foreground">
                <Clock className="w-4 h-4" />
                <h2 className="text-sm font-mono uppercase tracking-widest">Recent Projects</h2>
              </div>
              {allProjects.length > 4 && (
                <Button 
                  variant="ghost" 
                  size="sm" 
                  className="text-xs font-mono uppercase text-primary hover:text-primary/80 transition-colors"
                  onClick={() => setShowAllProjects(true)}
                >
                  View All Projects ({allProjects.length})
                </Button>
              )}
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {recentProjects.map((project, index) => (
                <motion.div
                  key={project.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.5 + index * 0.1 }}
                >
                  <Card 
                    className="group border-border bg-card/30 hover:bg-card/50 hover:border-primary/50 transition-all cursor-pointer overflow-hidden relative"
                    onClick={() => onLoadProject(project.id)}
                  >
                    <CardContent className="p-4 flex items-center justify-between">
                      <div className="min-w-0 flex-1">
                        <h3 className="font-semibold truncate group-hover:text-primary transition-colors">{project.name}</h3>
                        <p className="text-xs text-muted-foreground truncate font-mono mt-1">
                          {project.previewText || "Empty script..."}
                        </p>
                        <p className="text-[10px] text-muted-foreground/60 mt-2">
                          Last updated: {new Date(project.updatedAt).toLocaleDateString()}
                        </p>
                      </div>
                      <div className="flex items-center gap-2 ml-4">
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          className="h-8 w-8 text-muted-foreground hover:text-destructive opacity-0 group-hover:opacity-100 transition-opacity"
                          onClick={(e) => handleDelete(e, project.id)}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                        <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center group-hover:bg-primary group-hover:text-white transition-all">
                          <ChevronRight className="w-4 h-4" />
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
            </div>
          </motion.div>
        )}

        {/* Footer Features */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-8 pt-12 border-t border-border/50">
          <div className="space-y-2 text-center sm:text-left">
            <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center mx-auto sm:mx-0">
              <Sparkles className="w-5 h-5 text-primary" />
            </div>
            <h4 className="font-semibold">AI Rewriting</h4>
            <p className="text-xs text-muted-foreground">7+ tone presets and custom instructions to perfect your message.</p>
          </div>
          <div className="space-y-2 text-center sm:text-left">
            <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center mx-auto sm:mx-0">
              <Mic2 className="w-5 h-5 text-primary" />
            </div>
            <h4 className="font-semibold">Vocal Synthesis</h4>
            <p className="text-xs text-muted-foreground">High-fidelity TTS with fine-tuned speed and pitch controls.</p>
          </div>
          <div className="space-y-2 text-center sm:text-left">
            <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center mx-auto sm:mx-0">
              <ImageIcon className="w-5 h-5 text-primary" />
            </div>
            <h4 className="font-semibold">Visual Generation</h4>
            <p className="text-xs text-muted-foreground">Generate high-fidelity static visual concepts and storyboards that match your script's tone.</p>
          </div>
        </div>
      </motion.div>

      {/* Project Browser Overlay */}
      <AnimatePresence>
        {showAllProjects && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex justify-end overflow-hidden"
            onClick={() => setShowAllProjects(false)}
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
                projects={allProjects}
                onLoadProject={(id) => {
                  onLoadProject(id);
                  setShowAllProjects(false);
                }}
                onDeleteProject={(id) => {
                  projectStorage.deleteProject(id);
                  setRecentProjects(projectStorage.getProjectsList().slice(0, 4));
                }}
                onClose={() => setShowAllProjects(false)}
              />
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
