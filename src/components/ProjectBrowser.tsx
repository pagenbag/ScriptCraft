import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  X, 
  Search, 
  Trash2, 
  ChevronRight, 
  Clock, 
  FileCode,
  Calendar,
  MoreVertical
} from 'lucide-react';
import { Button } from '../../components/ui/button';
import { Card, CardContent } from '../../components/ui/card';
import { ScrollArea } from '../../components/ui/scroll-area';
import { ProjectMetadata } from '../types';
import { Separator } from '../../components/ui/separator';

interface ProjectBrowserProps {
  projects: ProjectMetadata[];
  onLoadProject: (id: string) => void;
  onDeleteProject: (id: string) => void;
  onClose: () => void;
}

export const ProjectBrowser: React.FC<ProjectBrowserProps> = ({
  projects,
  onLoadProject,
  onDeleteProject,
  onClose
}) => {
  const [search, setSearch] = React.useState('');

  const filteredProjects = projects.filter(p => 
    p.name.toLowerCase().includes(search.toLowerCase()) ||
    p.previewText.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="flex flex-col h-screen bg-background border-l border-border shadow-2xl w-full max-w-md overflow-hidden relative">
      {/* Header */}
      <div className="shrink-0 p-4 border-b border-border flex items-center justify-between bg-card/50 backdrop-blur-md">
        <div className="flex items-center gap-2">
          <div className="p-2 bg-primary/10 rounded-lg">
            <Clock className="w-4 h-4 text-primary" />
          </div>
          <div>
            <h2 className="text-sm font-semibold">All Projects</h2>
            <p className="text-[10px] text-muted-foreground uppercase font-mono">{projects.length} Items</p>
          </div>
        </div>
        <Button variant="ghost" size="icon" onClick={onClose}>
          <X className="w-4 h-4" />
        </Button>
      </div>

      {/* Search Bar */}
      <div className="shrink-0 p-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search projects..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-muted/50 border-none rounded-lg py-2 pl-9 pr-4 text-sm focus:ring-1 focus:ring-primary/50 transition-all outline-none"
          />
        </div>
      </div>

      <Separator className="shrink-0" />

      {/* Projects List */}
      <ScrollArea className="flex-1 min-h-0">
        <div className="p-4 space-y-3">
          {filteredProjects.length > 0 ? (
            filteredProjects.map((project) => (
              <motion.div
                key={project.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                layout
              >
                <Card 
                  className="group border-border bg-card/20 hover:bg-card/40 hover:border-primary/50 cursor-pointer transition-all relative overflow-hidden"
                  onClick={() => onLoadProject(project.id)}
                >
                  <CardContent className="p-3">
                    <div className="flex items-start justify-between gap-4">
                      <div className="min-w-0 flex-1">
                        <h3 className="text-sm font-medium truncate group-hover:text-primary transition-colors">
                          {project.name}
                        </h3>
                        <p className="text-[11px] text-muted-foreground line-clamp-2 mt-1 font-sans">
                          {project.previewText || "No content yet"}
                        </p>
                        <div className="flex items-center gap-2 mt-3">
                          <Calendar className="w-3 h-3 text-muted-foreground/60" />
                          <span className="text-[10px] text-muted-foreground/60 font-mono">
                            {new Date(project.updatedAt).toLocaleDateString(undefined, {
                              year: 'numeric',
                              month: 'short',
                              day: 'numeric'
                            })}
                          </span>
                        </div>
                      </div>
                      
                      <div className="flex flex-col gap-2">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity hover:bg-destructive/10 hover:text-destructive"
                          onClick={(e) => {
                            e.stopPropagation();
                            onDeleteProject(project.id);
                          }}
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                        <div className="h-7 w-7 rounded-full bg-primary/5 flex items-center justify-center group-hover:bg-primary group-hover:text-white transition-all self-end">
                          <ChevronRight className="w-4 h-4" />
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))
          ) : (
            <div className="flex flex-col items-center justify-center py-12 text-center text-muted-foreground">
              <div className="w-12 h-12 bg-muted rounded-full flex items-center justify-center mb-4">
                <FileCode className="w-6 h-6 opacity-20" />
              </div>
              <p className="text-sm">No projects found</p>
              {search && <p className="text-xs mt-1">Try a different search term</p>}
            </div>
          )}
        </div>
      </ScrollArea>

      {/* Footer / Stats */}
      <div className="shrink-0 p-4 border-t border-border bg-muted/20">
        <p className="text-[10px] font-mono text-muted-foreground text-center uppercase tracking-widest leading-relaxed">
          Storage Usage: Local Browser
          <br />
          Highly Optimized for Echoflow v2.0
        </p>
      </div>
    </div>
  );
};
