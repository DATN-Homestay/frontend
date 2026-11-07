import { useContext, useEffect } from 'react';
import { AuthContext } from '../../contexts/AuthContextDefinition';
import { recommendationsService } from './recommendations.service';

/** Record only successfully loaded pages for the currently verified account. */
export function useTrackHomestayView(homestayId: string | undefined) {
  const auth = useContext(AuthContext);
  const userId = auth?.user?.id;
  const initializing = auth?.initializing;
  useEffect(() => {
    if (!userId || !homestayId || initializing) return;
    // Analytics must never interrupt viewing/booking a room. The server also
    // deduplicates refreshes, repeated visits and StrictMode calls atomically.
    void recommendationsService.recordView(homestayId).catch(() => undefined);
  }, [userId, homestayId, initializing]);
}
