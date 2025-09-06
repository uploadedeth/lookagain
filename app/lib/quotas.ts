// Quota configuration
export const USER_GAME_QUOTA = 5

// Maximum game rounds for the entire application
// Can be overridden by APP_GAME_QUOTA environment variable
export const APP_GAME_QUOTA = parseInt(process.env.APP_GAME_QUOTA || '1000', 10)

// These values can be easily changed to adjust quotas
export type QuotaStatus = {
  used: number;
  limit: number;
  remaining: number;
};
