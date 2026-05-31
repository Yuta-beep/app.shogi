import type { Announcement } from '@/domain/models/announcement';
import type { AnnouncementRepository } from '@/domain/repositories/announcement-repository';
import { ApiAnnouncementRepository } from '@/infra/repositories/announcement-repository';
import type { LoadAnnouncementsUseCase } from '@/usecases/announcement/load-announcements-usecase';

export class ApiLoadAnnouncementsUseCase implements LoadAnnouncementsUseCase {
  constructor(
    private readonly repository: AnnouncementRepository = new ApiAnnouncementRepository(),
  ) {}

  async execute(): Promise<Announcement[]> {
    return this.repository.loadAnnouncements();
  }
}
