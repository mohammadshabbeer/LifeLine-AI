LIFELINE AI - PHASE 1: TAILWIND CSS INTEGRATION
================================================

What changed:
- Tailwind CSS Play CDN was added only to hospital-login.html.
- Tailwind utility classes were added to the existing hospital login layout.
- Existing element IDs, form behavior, Firebase/session JavaScript, theme code,
  Font Awesome, and original CSS files were NOT removed or renamed.
- Original page backup: hospital-login-before-tailwind.html

How to test:
1. Open the LifeLine-AI folder in VS Code.
2. Run with Live Server.
3. Open hospital-login.html.
4. Login using username admin and one of these passwords:
   Apollo 1111, Care 2222, Yashoda 3333, City 4444.
5. Confirm redirect to hospital.html and dashboard data works normally.

Important:
- Internet is needed to load Tailwind Play CDN.
- If Tailwind CDN is unavailable, original CSS remains linked as fallback.
- No Firebase configuration or project functionality was changed.
