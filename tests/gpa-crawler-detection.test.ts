import { describe, it, expect } from 'vitest';

describe('GPA Crawler Challenge & State Detection Logic', () => {
  it('detects Cloudflare Turnstile challenge titles and elements', () => {
    const isCloudflareChallenge = (docTitle: string, hasChallengeElement: boolean) => {
      return (
        docTitle.includes('Just a moment...') ||
        docTitle.includes('Attention Required') ||
        hasChallengeElement
      );
    };

    expect(isCloudflareChallenge('Just a moment...', false)).toBe(true);
    expect(isCloudflareChallenge('Attention Required! | Cloudflare', false)).toBe(true);
    expect(isCloudflareChallenge('GPAnalysis', true)).toBe(true);
    expect(isCloudflareChallenge('GPAnalysis', false)).toBe(false);
  });

  it('detects unauthenticated or rate-limited HTTP response codes', () => {
    const shouldPauseQueue = (statusCode: number) => {
      return [401, 403, 429, 503].includes(statusCode);
    };

    expect(shouldPauseQueue(401)).toBe(true);
    expect(shouldPauseQueue(403)).toBe(true);
    expect(shouldPauseQueue(429)).toBe(true);
    expect(shouldPauseQueue(503)).toBe(true);
    expect(shouldPauseQueue(200)).toBe(false);
  });
});
