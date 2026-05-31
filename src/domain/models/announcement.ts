import { z } from 'zod';

export const AnnouncementSchema = z.object({
  id: z.string(),
  title: z.string(),
  contents: z.string(),
  publishedAt: z.string(),
});

export const AnnouncementListSchema = z.object({
  announcements: z.array(AnnouncementSchema),
});

export type Announcement = z.infer<typeof AnnouncementSchema>;
export type AnnouncementList = z.infer<typeof AnnouncementListSchema>;
