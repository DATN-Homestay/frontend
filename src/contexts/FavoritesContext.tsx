import React, { useState, useEffect, useCallback } from 'react';
import { message } from 'antd';
import { useAuth } from './useAuth';
import { favoritesService } from '../services/favoritesService';
import { FavoritesContext } from './FavoritesContextDefinition';

export type { FavoritesContextType } from './FavoritesContextDefinition';

export const FavoritesProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isAuthenticated, user } = useAuth();
  const [favoriteIds, setFavoriteIds] = useState<Set<string>>(new Set());

  const refreshFavoriteIds = useCallback(async () => {
    if (!isAuthenticated) {
      setFavoriteIds(new Set());
      return;
    }
    try {
      const ids = await favoritesService.getFavoriteIds();
      setFavoriteIds(new Set(ids.map(String)));
    } catch {
      // Bỏ qua lỗi nếu chưa có mạng hoặc phiên hết hạn
    }
  }, [isAuthenticated]);

  useEffect(() => {
    if (isAuthenticated) {
      void refreshFavoriteIds();
    } else {
      setFavoriteIds(new Set());
    }
  }, [isAuthenticated, user?.id, refreshFavoriteIds]);

  const isFavorite = useCallback(
    (homestayId: string | number): boolean => {
      return favoriteIds.has(String(homestayId));
    },
    [favoriteIds],
  );

  const toggleFavorite = useCallback(
    async (homestayId: string | number): Promise<boolean> => {
      const idStr = String(homestayId);
      if (!isAuthenticated) {
        message.warning('Vui lòng đăng nhập để lưu homestay vào danh sách yêu thích');
        return false;
      }

      // Optimistic update
      const wasFavorite = favoriteIds.has(idStr);
      setFavoriteIds((prev) => {
        const next = new Set(prev);
        if (wasFavorite) {
          next.delete(idStr);
        } else {
          next.add(idStr);
        }
        return next;
      });

      try {
        const res = await favoritesService.toggleFavorite(idStr);
        if (res.is_favorite) {
          message.success('Đã lưu vào danh sách yêu thích!');
        } else {
          message.info('Đã xóa khỏi danh sách yêu thích');
        }
        return res.is_favorite;
      } catch (err) {
        // Rollback nếu API lỗi
        setFavoriteIds((prev) => {
          const next = new Set(prev);
          if (wasFavorite) {
            next.add(idStr);
          } else {
            next.delete(idStr);
          }
          return next;
        });
        message.error(err instanceof Error ? err.message : 'Không thể cập nhật danh sách yêu thích');
        return wasFavorite;
      }
    },
    [isAuthenticated, favoriteIds],
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
