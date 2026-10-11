# Implementation Plan: Debugging and Resolving HazCam Playback

## Objective
Identify and resolve the root cause of "stuck on connecting" issues for HazCam streams, as reported by console errors in Chrome.

## Steps

1.  **Error Analysis (Critical)**
    *   User to provide exact red error messages from the browser console (copy/paste).
    *   Model to correlate these errors with HLS.js event logs added to `HlsPlayer.tsx`.

2.  **Investigate Network/CORS**
    *   If errors indicate "CORS blocked" or "Access-Control-Allow-Origin", implement a server-side proxy route for HazCam requests. The client-side `xhrSetup` adjustments were insufficient, indicating strict server-side origin policies.

3.  **Refactor Error Handling in `HlsPlayer.tsx`**
    *   Based on specific error codes, enhance `HlsPlayer.tsx` to handle these scenarios gracefully, potentially bypassing problematic segments or implementing more robust retry logic tailored to the identified error type (e.g., decoder errors vs. network timeouts).

4.  **Validation**
    *   Verify playback stability across different HazCam links on the development dashboard.
