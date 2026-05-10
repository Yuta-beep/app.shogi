import type {
  SaveOnlineMatchSetupPayload,
  SaveOnlineMatchSetupResult,
} from '@/domain/models/online-match';

export type SaveOnlineMatchSetupInput = SaveOnlineMatchSetupPayload;

export interface SaveOnlineMatchSetupUseCase {
  execute(input: SaveOnlineMatchSetupInput): Promise<SaveOnlineMatchSetupResult>;
}
