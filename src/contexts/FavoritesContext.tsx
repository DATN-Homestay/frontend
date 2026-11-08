import React, { useState, useEffect, useCallback, useRef } from 'react';
import { message } from 'antd';
import { useAuth } from './useAuth';
import { favoritesService } from '../services/favoritesService';
import { FavoritesContext } from './FavoritesContextDefinition';
import { notifyRecommendationChange } from '../features/recommendations/recommendation-events';

export type { FavoritesContextType } from './FavoritesContextDefinition';

const EMPTY_FAVORITES = new Set<string>();

export const FavoritesProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isAuthenticated, user } = useAuth();
  const userId = isAuthenticated ? user?.id : undefined;
  const [favorites, setFavorites] = useState<{ userId?: string; ids: Set<string> }>({ ids: EMPTY_FAVORITES });
  const favoriteIds = favorites.userId === userId ? favorites.ids : EMPTY_FAVORITES;
  const latestLoad = useRef(0);

  const refreshFavoriteIds = useCallback(async () => {
    const request = ++latestLoad.current;
    if (!userId) return;
    try {
      const ids = await favoritesService.getFavoriteIds();
      if (request === latestLoad.current) setFavorites({ userId, ids: new Set(ids.map(String)) });
    } catch {
      // Bỏ qua lỗi nếu chưa có mạng hoặc phiên hết hạn
    }
  }, [userId]);

  useEffect(() => {
    const request = ++latestLoad.current;
    if (!userId) return;
    let active = true;
    void favoritesService.getFavoriteIds().then((ids) => {
      if (active && request === latestLoad.current) setFavorites({ userId, ids: new Set(ids.map(String)) });
    }).catch(() => { /* Phiên hết hạn hoặc mất mạng không cản trở xem phòng. */ });
    return () => { active = false; };
  }, [userId]);

  const isFavorite = useCallback(
    (homestayId: string | number): boolean => {
      return favoriteIds.has(String(homestayId));
    },
    [favoriteIds],
  );

  const toggleFavorite = useCallback(
    async (homestayId: string | number): Promise<boolean> => {
      const idStr = String(homestayId);
      if (!userId) {
        message.warning('Vui lòng đăng nhập để lưu homestay vào danh sách yêu thích');
        return false;
      }

      // Optimistic update
      latestLoad.current++;
      const wasFavorite = favoriteIds.has(idStr);
      setFavorites((prev) => {
        const next = new Set(prev.userId === userId ? prev.ids : EMPTY_FAVORITES);
        if (wasFavorite) {
          next.delete(idStr);
        } else {
          next.add(idStr);
        }
        return { userId, ids: next };
      });

      try {
        const res = await favoritesService.toggleFavorite(idStr);
        notifyRecommendationChange(userId);
        if (res.is_favorite) {
          message.success('Đã lưu vào danh sách yêu thích!');
        } else {
          message.info('Đã xóa khỏi danh sách yêu thích');
        }
        return res.is_favorite;
      } catch (err) {
        // Rollback nếu API lỗi
        setFavorites((prev) => {
          if (prev.userId !== userId) return prev;
          const next = new Set(prev.ids);
          if (wasFavorite) {
            next.add(idStr);
          } else {
            next.delete(idStr);
          }
          return { userId, ids: next };
        });
        message.error(err instanceof Error ? err.message : 'Không thể cập nhật danh sách yêu thích');
        return wasFavorite;
      }
    },
    [userId, favoriteIds],
  );

  return (
    <FavoritesContext.Provider
      value={{
        favoriteIds,
        favoritesCount: favoriteIds.size,
        isFavorite,
        toggleFavorite,
        refreshFavoriteIds,
      }}
    >
      {children}
    </FavoritesContext.Provider>
  );
};
