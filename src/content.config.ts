import { defineCollection } from 'astro:content';
import { glob } from 'astro/loaders';
import { z } from 'astro/zod';

// One file per language: src/content/posts/<slug>/<lang>.md
const posts = defineCollection({
  loader: glob({ pattern: '*/{en,de,ru}.md', base: './src/content/posts' }),
  schema: z.object({
    title: z.string(),
    date: z.coerce.date(),
    cover: z.string().optional(),
    tags: z.array(z.string()).optional(),
  }),
});

export const collections = { posts };
