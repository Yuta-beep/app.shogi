import { ApiLoadAnnouncementsUseCase } from '@/usecases/announcement/api-announcement-usecases';
import type { LoadAnnouncementsUseCase } from '@/usecases/announcement/load-announcements-usecase';

export function createLoadAnnouncementsUseCase(): LoadAnnouncementsUseCase {
  return new ApiLoadAnnouncementsUseCase();
}
