export const RECOMMENDATION_CHANGED = 'homestay-recommendation-changed';

export function notifyRecommendationChange(userId: string) {
  window.dispatchEvent(new window.CustomEvent(RECOMMENDATION_CHANGED, { detail: userId }));
}
