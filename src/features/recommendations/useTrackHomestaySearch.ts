import { useCallback, useContext } from 'react';
import { AuthContext } from '../../contexts/AuthContextDefinition';
import { recommendationsService, type HomestaySearch } from './recommendations.service';
import { notifyRecommendationChange } from './recommendation-events';

/** Called for an intentional search, never while rendering or loading initial results. */
export function useTrackHomestaySearch() {
  const auth = useContext(AuthContext);
  const userId = auth?.user?.id;
  const initializing = auth?.initializing ?? false;
  return useCallback(async (input: HomestaySearch) => {
    if (!userId || initializing) return;
    const city = input.city?.trim();
    const district = input.district?.trim();
    const search: HomestaySearch = {
      city: city && !city.startsWith('Tất cả') ? city : undefined,
      district: district && !district.startsWith('Tất cả') ? district : undefined,
      guests: input.guests, rooms: input.rooms,
    };
    if (!search.city && !search.guests) return;
    try {
      await recommendationsService.recordSearch(search);
      notifyRecommendationChange(userId);
    } catch {
      // Tracking must not interrupt searching or booking.
    }
  }, [userId, initializing]);
}
