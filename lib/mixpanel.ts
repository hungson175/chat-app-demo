import mixpanel from 'mixpanel-browser';
import FingerprintJS from '@fingerprintjs/fingerprintjs';

const MIXPANEL_TOKEN = process.env.NEXT_PUBLIC_MIXPANEL_TOKEN;
const IS_DEVELOPMENT = process.env.NODE_ENV === 'development';

// Initialize FingerprintJS
const fpPromise = FingerprintJS.load();

// Initialize Mixpanel
export const initMixpanel = async () => {
  if (!MIXPANEL_TOKEN) {
    console.warn('Mixpanel token is missing! Check your .env.local file.');
    return;
  }

  mixpanel.init(MIXPANEL_TOKEN, { 
    debug: IS_DEVELOPMENT,
    track_pageview: true,
    persistence: 'localStorage',
    api_host: 'https://api.mixpanel.com',
    cross_site_cookie: false
  });

  // Get visitor identifier using FingerprintJS
  const fp = await fpPromise;
  const result = await fp.get();
  const visitorId = result.visitorId;

  // Set user ID in Mixpanel
  mixpanel.identify(visitorId);

  if (IS_DEVELOPMENT) {
    console.log('Mixpanel initialized in debug mode');
    console.log('Visitor ID:', visitorId);
    
    // Debug helper
    mixpanel.register_once({
      'First Seen': new Date().toISOString(),
      'Environment': 'development'
    });
  }
};

// Track message sent event with debug logging
export const trackMessageSent = (messageData: any) => {
  if (IS_DEVELOPMENT) {
    console.group('Mixpanel Event: Message Sent');
    console.log('Event properties:', messageData);
    console.log('Timestamp:', new Date().toISOString());
    console.groupEnd();
  }

  mixpanel.track('Message Sent', {
    timestamp: new Date().toISOString(),
    ...messageData
  });
};

// Helper function to track any custom event
export const track = (eventName: string, properties?: any) => {
  if (IS_DEVELOPMENT) {
    console.group(`Mixpanel Event: ${eventName}`);
    console.log('Event properties:', properties);
    console.log('Timestamp:', new Date().toISOString());
    console.groupEnd();
  }

  mixpanel.track(eventName, properties);
}; 