import type { Announcement } from '@/domain/models/announcement';
import type { AnnouncementRepository } from '@/domain/repositories/announcement-repository';
import { AnnouncementApiDataSource } from '@/infra/datasources/announcement-api-datasource';

export class ApiAnnouncementRepository implements AnnouncementRepository {
  constructor(private readonly dataSource = new AnnouncementApiDataSource()) {}

  async loadAnnouncements(): Promise<Announcement[]> {
    return this.dataSource.fetchAnnouncements();
  }
}
