import { track } from '@vercel/analytics';

// Analytics service for tracking custom events
export const analyticsService = {
  // Track page views
  trackPageView: (page: string) => {
    track('page_view', { page });
  },

  // Track wallet connections
  trackWalletConnect: (walletType: string) => {
    track('wallet_connect', { wallet_type: walletType });
  },

  // Track trading actions
  trackTradeAction: (action: string, asset?: string, amount?: number) => {
    const payload: Record<string, any> = { 
      action, 
      timestamp: new Date().toISOString()
    };
    
    if (asset) payload.asset = asset;
    if (amount !== undefined) payload.amount = amount;
    
    track('trade_action', payload);
  },

  // Track feedback submissions
  trackFeedback: (type: string, priority: string) => {
    track('feedback_submit', { 
      feedback_type: type, 
      priority,
      timestamp: new Date().toISOString()
    });
  },

  // Track admin actions
  trackAdminAction: (action: string, details?: any) => {
    const payload: Record<string, any> = { 
      action, 
      timestamp: new Date().toISOString()
    };
    
    if (details) payload.details = details;
    
    track('admin_action', payload);
  },

  // Track errors
  trackError: (error: string, context?: string) => {
    const payload: Record<string, any> = { 
      error_message: error, 
      timestamp: new Date().toISOString()
    };
    
    if (context) payload.context = context;
    
    track('error', payload);
  },

  // Track user engagement
  trackEngagement: (action: string, page: string) => {
    track('user_engagement', { 
      action, 
      page,
      timestamp: new Date().toISOString()
    });
  }
};

export default analyticsService; 