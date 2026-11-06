# Pawgress local-only storage

Pawgress no longer uses Supabase or Google authentication. Nickname, completed DSA days, field notes, and project cards are stored in the current browser's `localStorage` under Pawgress-specific keys.

- No account or sign-in is required.
- Data stays in the browser profile on this device and is not synced to other devices.
- Clearing browser/site data, using private browsing, or changing browsers/devices can make this data unavailable.
- The app's **Clear all my local data** action removes Pawgress progress, notes, projects, and nickname from this browser.

Older installations that have a `pawgress-account-id` in local storage automatically merge any account-scoped browser data with guest data on first load. This cannot retrieve records that existed only in the former Supabase cloud database. Export or retain those records in Supabase before decommissioning that project if they need to be kept.
