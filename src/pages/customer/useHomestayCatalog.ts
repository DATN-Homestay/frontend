import { useEffect, useState } from 'react';
import { customerService, type HomestayCatalogFilters } from '../../services/customerService';
import type { HomestayItem } from '../../types/customer';

export function useHomestayCatalog(city: string | undefined, page: number, pageSize: number, filters: HomestayCatalogFilters, revision: number) {
  const { district, guests, rooms } = filters;
  const key = JSON.stringify([city, page, pageSize, district, guests, rooms, revision]);
  const [result, setResult] = useState<{ key: string; items: HomestayItem[]; total: number } | null>(null);
  const [failure, setFailure] = useState<{ key: string; message: string } | null>(null);
  const [allTotal, setAllTotal] = useState(0);

  useEffect(() => {
    let active = true;
    void customerService.getHomestays(city, pageSize, (page - 1) * pageSize, { district, guests, rooms }).then((data) => {
      if (!city && !district && !guests) setAllTotal(data.total ?? 0);
      if (active) {
        setResult({ key, items: data.items, total: data.total ?? data.items.length });
        setFailure(null);
      }
    }).catch((error: unknown) => {
      if (active) setFailure({ key, message: error instanceof Error ? error.message : 'Không tải được danh sách homestay.' });
    });
    return () => { active = false; };
  }, [city, page, pageSize, district, guests, rooms, key]);

  const data = result?.key === key ? result : null;
  const error = failure?.key === key ? failure.message : null;
  return { items: data?.items ?? [], total: data?.total ?? 0, allTotal, loading: !data && !error, error };
}
