# Analytics Setup for Avila Protocol

This document explains how analytics are configured and used in the Avila Protocol frontend.

## 🚀 Vercel Analytics Integration

### **Package Installed:**
```bash
npm install @vercel/analytics
```

### **What's Tracked:**

#### **1. Automatic Page Views**
- Every page navigation is automatically tracked
- Page paths are logged with timestamps
- No additional code needed

#### **2. Custom Events**
- **Wallet Connections**: Track when users connect wallets
- **Trading Actions**: Monitor trading behavior and patterns
- **Feedback Submissions**: Track user feedback and priorities
- **Admin Actions**: Monitor administrative activities
- **Errors**: Track application errors and issues
- **User Engagement**: Monitor user interactions

## 📊 Analytics Dashboard

### **Access Your Analytics:**
1. Go to [vercel.com](https://vercel.com)
2. Select your Avila Protocol project
3. Click on "Analytics" tab
4. View real-time data and insights

### **Available Metrics:**
- **Page Views**: Which pages users visit most
- **User Sessions**: How long users stay on your site
- **Custom Events**: Detailed tracking of user actions
- **Performance**: Page load times and Core Web Vitals
- **Geographic Data**: Where your users are located

## 🔧 Custom Event Tracking

### **Usage Examples:**

```tsx
import analyticsService from '../services/analytics';

// Track wallet connection
analyticsService.trackWalletConnect('petra');

// Track trading action
analyticsService.trackTradeAction('buy_option', 'AAPL', 100);

// Track feedback
analyticsService.trackFeedback('bug', 'high');

// Track errors
analyticsService.trackError('Connection failed', 'wallet_connect');
```

### **Event Types:**

| Event | Description | Parameters |
|-------|-------------|------------|
| `page_view` | Page navigation | `page` |
| `wallet_connect` | Wallet connection | `wallet_type` |
| `trade_action` | Trading activities | `action`, `asset`, `amount` |
| `feedback_submit` | User feedback | `feedback_type`, `priority` |
| `admin_action` | Admin activities | `action`, `details` |
| `error` | Application errors | `error_message`, `context` |
| `user_engagement` | User interactions | `action`, `page` |

## 🎯 Privacy & Compliance

### **Data Collected:**
- **Page views** and navigation patterns
- **User interactions** with the application
- **Performance metrics** and error logs
- **Geographic location** (country/region level)

### **Data NOT Collected:**
- **Personal information** (names, emails, addresses)
- **Wallet addresses** or private keys
- **Trading amounts** or financial data
- **IP addresses** (anonymized by Vercel)

### **GDPR Compliance:**
- Vercel Analytics is GDPR compliant
- Users can opt-out via browser settings
- Data is stored securely and encrypted

## 🚀 Getting Started

### **1. Verify Installation:**
```bash
cd frontend
npm list @vercel/analytics
```

### **2. Check Analytics Component:**
The `<Analytics />` component is already added to `App.tsx`

### **3. Test Custom Events:**
Submit feedback or connect a wallet to see events in your dashboard

### **4. View Real-time Data:**
Check your Vercel dashboard for live analytics

## 📈 Best Practices

### **Event Naming:**
- Use **descriptive names** (e.g., `buy_option` not `buy`)
- **Consistent formatting** (snake_case recommended)
- **Meaningful parameters** for filtering and analysis

### **Performance:**
- Analytics run **asynchronously** and don't block the UI
- **Minimal overhead** on page performance
- **Automatic retry** for failed tracking calls

### **Debugging:**
- Check browser console for analytics logs
- Verify events in Vercel dashboard
- Use browser dev tools to monitor network requests

## 🔍 Troubleshooting

### **Common Issues:**

1. **Events not showing up:**
   - Check Vercel project settings
   - Verify environment variables
   - Check browser console for errors

2. **Performance impact:**
   - Analytics are loaded asynchronously
   - Minimal impact on page load times
   - Consider lazy loading for heavy analytics

3. **Privacy concerns:**
   - All data is anonymized
   - No personal information collected
   - Users can opt-out via browser settings

## 📚 Resources

- [Vercel Analytics Documentation](https://vercel.com/docs/analytics)
- [Privacy & GDPR Compliance](https://vercel.com/docs/analytics/privacy)
- [Custom Events Guide](https://vercel.com/docs/analytics/custom-events)
- [Performance Monitoring](https://vercel.com/docs/analytics/performance)

---

**Your Avila Protocol now has comprehensive analytics tracking!** 📊✨ 