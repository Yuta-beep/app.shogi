import type { Announcement } from '@/domain/models/announcement';

export interface LoadAnnouncementsUseCase {
  execute(): Promise<Announcement[]>;
}
