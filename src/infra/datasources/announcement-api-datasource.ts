import { AnnouncementListSchema, type Announcement } from '@/domain/models/announcement';
import { getJson } from '@/infra/http/api-client';

export class AnnouncementApiDataSource {
  async fetchAnnouncements(): Promise<Announcement[]> {
    const response = await getJson<unknown>('/api/v1/announcements');
    return AnnouncementListSchema.parse(response).announcements;
  }
}
