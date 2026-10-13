# Pawgress Supabase setup

## Database migration

Apply `supabase/migrations/20261013213000_pawgress_rls.sql` in the Supabase SQL Editor. It creates `profiles`, `mission_progress`, `field_notes`, and `projects`, enables RLS, and restricts every row to the authenticated owner.

## Authentication redirects

In **Supabase → Authentication → URL Configuration**:

- Set the Site URL to the final published Pawgress origin.
- Add the active Manus preview origin: `https://3000-ijsiqc5yl1tyunr9w8mne-426777a4.sg2.manus.computer`.
- Add the final published origin once the deployment URL is available.
- Keep Google enabled under the provider settings as already configured by the owner.

Pawgress calls `signInWithOAuth({ provider: 'google', options: { redirectTo: window.location.origin } })`, so the browser returns to whichever approved preview or published origin it is currently using.

## Existing local progress migration

Before the first signed-in sync, Pawgress reads the existing guest-scoped localStorage keys. Remote data wins for an existing nickname, note day, or project identity; local completed days are unioned with remote completed days, and local notes/projects are added only when an equivalent remote record is absent. The merged result is then written to Supabase and retained in account-scoped localStorage for offline continuity. Signing out returns the UI to the guest scope without deleting the account’s remote data.
