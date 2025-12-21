import { z } from 'zod';

// Default schema definitions
export const ProjectSchema = z.object({
  schema: z.literal('Project'),
  title: z.string().min(1, 'Title is required'),
  status: z.enum(['planned', 'active', 'paused', 'done']).default('planned'),
  due: z.string().datetime().optional(),
  tags: z.array(z.string()).default([]),
  description: z.string().optional(),
});

export const TaskSchema = z.object({
  schema: z.literal('Task'),
  title: z.string().min(1, 'Title is required'),
  status: z.enum(['open', 'in-progress', 'done', 'cancelled']).default('open'),
  priority: z.enum(['low', 'medium', 'high']).optional(),
  due: z.string().datetime().optional(),
  assignedTo: z.string().optional(),
  tags: z.array(z.string()).default([]),
});

export const PersonSchema = z.object({
  schema: z.literal('Person'),
  name: z.string().min(1, 'Name is required'),
  email: z.string().email().optional(),
  role: z.string().optional(),
  tags: z.array(z.string()).default([]),
});

export const BookmarkSchema = z.object({
  schema: z.literal('Bookmark'),
  title: z.string().min(1, 'Title is required'),
  url: z.string().url('Must be a valid URL'),
  description: z.string().optional(),
  tags: z.array(z.string()).default([]),
});

export type Project = z.infer<typeof ProjectSchema>;
export type Task = z.infer<typeof TaskSchema>;
export type Person = z.infer<typeof PersonSchema>;
export type Bookmark = z.infer<typeof BookmarkSchema>;

// Schema registry
export const defaultSchemas = {
  Project: {
    name: 'Project',
    schema: ProjectSchema,
    description: 'Track projects with status, due dates, and tags',
  },
  Task: {
    name: 'Task',
    schema: TaskSchema,
    description: 'Manage tasks with priority and assignment',
  },
  Person: {
    name: 'Person',
    schema: PersonSchema,
    description: 'Store contact information',
  },
  Bookmark: {
    name: 'Bookmark',
    schema: BookmarkSchema,
    description: 'Save and organize bookmarks',
  },
};

