import mixpanel from 'mixpanel-browser';
import FingerprintJS from '@fingerprintjs/fingerprintjs';

// Immediate logging to check if the file is loaded
console.log('[Debug] Mixpanel file loaded, token:', process.env.NEXT_PUBLIC_MIXPANEL_TOKEN ? 'Present' : 'Missing');

const MIXPANEL_TOKEN = process.env.NEXT_PUBLIC_MIXPANEL_TOKEN;
const IS_DEVELOPMENT = process.env.NODE_ENV === 'development';

// Initialize FingerprintJS
const fpPromise = FingerprintJS.load();

// Helper function for consistent logging across environments
const logEvent = (type: string, message: string, data?: any) => {
  const timestamp = new Date().toISOString();
  const logMessage = `[Mixpanel ${type}] ${timestamp} - ${message}`;
  
  // Use console.group for better visibility
  console.group(logMessage);
  if (data) console.log('Data:', data);
  console.groupEnd();
};

// Initialize Mixpanel
export const initMixpanel = async () => {
  console.log('[Debug] initMixpanel called');
  
  logEvent('Init', 'Starting Mixpanel initialization', {
    token: MIXPANEL_TOKEN ? 'Present' : 'Missing',
    environment: process.env.NODE_ENV,
    url: window.location.href
  });

  if (!MIXPANEL_TOKEN) {
    const error = 'Mixpanel token is missing! Check your environment variables.';
    console.error('[Debug] ' + error);
    logEvent('Error', error);
    return;
  }

  try {
    console.log('[Debug] Attempting Mixpanel.init...');
    
    mixpanel.init(MIXPANEL_TOKEN, { 
      debug: true, // Enable debug mode in all environments for now
      track_pageview: true,
      persistence: 'localStorage',
      api_host: 'https://api.mixpanel.com',
      cross_site_cookie: false
    });

    console.log('[Debug] Mixpanel.init completed, loading FingerprintJS...');

    // Get visitor identifier using FingerprintJS
    const fp = await fpPromise;
    const result = await fp.get();
    const visitorId = result.visitorId;

    console.log('[Debug] FingerprintJS loaded, visitor ID:', visitorId);

    // Set user ID in Mixpanel
    mixpanel.identify(visitorId);
    
    logEvent('Success', 'Mixpanel initialized successfully', {
      visitorId,
      environment: process.env.NODE_ENV,
      url: window.location.href
    });

    // Debug helper for all environments
    mixpanel.register_once({
      'First Seen': new Date().toISOString(),
      'Environment': process.env.NODE_ENV,
      'Hostname': window.location.hostname,
      'URL': window.location.href
    });

    return true; // Indicate successful initialization
  } catch (error) {
    console.error('[Debug] Mixpanel initialization error:', error);
    logEvent('Error', 'Failed to initialize Mixpanel', error);
    return false;
  }
};

// Track message sent event with debug logging
export const trackMessageSent = (messageData: any) => {
  try {
    logEvent('Track', 'Attempting to track message', messageData);

    mixpanel.track('Message Sent', {
      timestamp: new Date().toISOString(),
      hostname: window.location.hostname,
      ...messageData
    });

    logEvent('Success', 'Message tracked successfully');
  } catch (error) {
    logEvent('Error', 'Failed to track message', error);
  }
};

// Helper function to track any custom event
export const track = (eventName: string, properties?: any) => {
  try {
    logEvent('Track', `Attempting to track event: ${eventName}`, properties);

    mixpanel.track(eventName, {
      timestamp: new Date().toISOString(),
      hostname: window.location.hostname,
      ...properties
    });

    logEvent('Success', `Event ${eventName} tracked successfully`);
  } catch (error) {
    logEvent('Error', `Failed to track event ${eventName}`, error);
  }
}; 