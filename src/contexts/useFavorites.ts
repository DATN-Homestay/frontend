import { useContext } from 'react';
import { FavoritesContext, defaultFavoritesContext, type FavoritesContextType } from './FavoritesContextDefinition';

export function useFavorites(): FavoritesContextType {
  const context = useContext(FavoritesContext);
  if (!context) {
    return defaultFavoritesContext;
  }
  return context;
}
