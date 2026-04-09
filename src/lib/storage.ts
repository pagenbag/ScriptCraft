import { Project, ProjectMetadata } from '../types';

const PROJECTS_KEY = 'scriptcraft_projects_list';
const PROJECT_PREFIX = 'scriptcraft_project_';

export const projectStorage = {
  saveProject: (project: Project) => {
    const updatedProject = { ...project, updatedAt: Date.now() };
    localStorage.setItem(`${PROJECT_PREFIX}${project.id}`, JSON.stringify(updatedProject));
    
    // Update metadata list
    const list = projectStorage.getProjectsList();
    const index = list.findIndex(p => p.id === project.id);
    const metadata: ProjectMetadata = {
      id: project.id,
      name: project.name,
      updatedAt: updatedProject.updatedAt,
      previewText: project.content.slice(0, 100)
    };

    if (index > -1) {
      list[index] = metadata;
    } else {
      list.unshift(metadata);
    }
    
    // Sort by updatedAt
    list.sort((a, b) => b.updatedAt - a.updatedAt);
    localStorage.setItem(PROJECTS_KEY, JSON.stringify(list));
  },

  getProject: (id: string): Project | null => {
    const data = localStorage.getItem(`${PROJECT_PREFIX}${id}`);
    return data ? JSON.parse(data) : null;
  },

  getProjectsList: (): ProjectMetadata[] => {
    const data = localStorage.getItem(PROJECTS_KEY);
    return data ? JSON.parse(data) : [];
  },

  deleteProject: (id: string) => {
    localStorage.removeItem(`${PROJECT_PREFIX}${id}`);
    const list = projectStorage.getProjectsList().filter(p => p.id !== id);
    localStorage.setItem(PROJECTS_KEY, JSON.stringify(list));
  },

  exportProject: (project: Project) => {
    const blob = new Blob([JSON.stringify(project, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${project.name.replace(/\s+/g, '_')}_${project.id}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }
};
