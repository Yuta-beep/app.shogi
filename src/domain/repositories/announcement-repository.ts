import type { Announcement } from '@/domain/models/announcement';

export interface AnnouncementRepository {
  loadAnnouncements(): Promise<Announcement[]>;
}
