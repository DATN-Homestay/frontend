import { useEffect, useMemo, useState } from 'react';
import { customerService } from '../../services/customerService';
import type { BookingQuote } from '../../types/customer';

type AvailabilityRequest = Parameters<typeof customerService.quoteBooking>[0];
interface AvailabilityResult {
  request: AvailabilityRequest;
  quote: BookingQuote | null;
  error: string | null;
}

export function useRoomAvailability(roomId: string | undefined, dateRange: [string, string] | null, enabled: boolean) {
  const checkIn = dateRange?.[0];
  const checkOut = dateRange?.[1];
  const request = useMemo(() => enabled && roomId && checkIn && checkOut ? {
    room_id: String(roomId), check_in_date: checkIn, check_out_date: checkOut,
  } : null, [enabled, roomId, checkIn, checkOut]);
  const [result, setResult] = useState<AvailabilityResult | null>(null);

  useEffect(() => {
    if (!request) return;
    let cancelled = false;
    customerService.quoteBooking(request)
      .then((quote) => {
        if (!cancelled) setResult({ request, quote, error: null });
      })
      .catch((error: unknown) => {
        if (!cancelled) setResult({ request, quote: null,
          error: error instanceof Error ? error.message : 'Không thể kiểm tra tình trạng phòng. Vui lòng thử lại.' });
      });
    return () => { cancelled = true; };
  }, [request]);

  // A response belongs only to the exact selection that started its request.
  const current = request && result?.request === request ? result : null;
  return {
    quote: current?.quote ?? null,
    error: current?.error ?? null,
    loading: request !== null && current === null,
  };
}
