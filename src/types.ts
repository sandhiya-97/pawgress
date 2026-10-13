export type ProjectStatus = 'Idea' | 'In progress' | 'Shipped';

export type Project = {
  id: string;
  title: string;
  description: string;
  link: string;
  category: string;
  status: ProjectStatus;
};

export type FieldNote = {
  id: string;
  day: number;
  content: string;
  createdAt: string;
  updatedAt: string;
};

export type PawgressUserData = {
  nickname: string;
  completed: number[];
  notes: FieldNote[];
  projects: Project[];
};
