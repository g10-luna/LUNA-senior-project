import { Link } from 'expo-router';
import * as WebBrowser from 'expo-web-browser';
import React from 'react';
import { Platform } from 'react-native';

/** Props for ExternalLink. Extends expo-router Link props with a required string href. */
export type ExternalLinkProps = Omit<
  React.ComponentProps<typeof Link>,
  'href'
> & {
  /** URL to open. On native, opens in the in-app browser; on web, behaves as a normal link. */
  href: string;
  /** Optional callback when opening the browser fails (native only). */
  onError?: (error: unknown) => void;
};

/**
 * Renders a link that opens in the in-app browser on native (iOS/Android) and as a normal
 * external link on web. Use for documentation, privacy policy, or any external URL.
 *
 * @param props - Link props with required `href` (string). Optional `onError` for native open failures.
 */
export function ExternalLink(props: ExternalLinkProps) {
  const { href, onError, ...rest } = props;

  const handlePress = React.useCallback(
    async (e: { preventDefault?: () => void }) => {
      if (Platform.OS !== 'web') {
        e.preventDefault?.();
        try {
          await WebBrowser.openBrowserAsync(href);
        } catch (error) {
          onError?.(error);
          // Do not re-throw: avoids crashing when caller does not provide onError
        }
      }
    },
    [href, onError]
  );

  return (
    <Link
      target="_blank"
      {...rest}
      href={href as React.ComponentProps<typeof Link>['href']}
      onPress={handlePress}
    />
  );
}
