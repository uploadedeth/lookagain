// Quota configuration
export const QUOTA_CONFIG = {
  // Maximum game rounds per user
  USER_GAME_QUOTA: 5,
  
  // Maximum game rounds for the entire application
  // Can be overridden by VITE_APP_GAME_QUOTA environment variable
  APP_GAME_QUOTA: parseInt(import.meta.env.VITE_APP_GAME_QUOTA || '1000', 10),
  
  // Collection to track app-wide stats
  APP_STATS_DOC: 'appStats/global'
};

// These values can be easily changed to adjust quotas
export type QuotaStatus = {
  used: number;
  limit: number;
  remaining: number;
  percentage: number;
};
