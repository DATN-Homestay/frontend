import { createContext } from 'react';

export interface FavoritesContextType {
  favoriteIds: Set<string>;
  favoritesCount: number;
  isFavorite: (homestayId: string | number) => boolean;
  toggleFavorite: (homestayId: string | number) => Promise<boolean>;
  refreshFavoriteIds: () => Promise<void>;
}

export const defaultFavoritesContext: FavoritesContextType = {
  favoriteIds: new Set<string>(),
  favoritesCount: 0,
  isFavorite: () => false,
  toggleFavorite: async () => false,
  refreshFavoriteIds: async () => {},
};

export const FavoritesContext = createContext<FavoritesContextType | undefined>(undefined);
