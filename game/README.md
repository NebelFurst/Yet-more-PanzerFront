<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://ai.google.dev/static/site-assets/images/share-ais-513315318.png" />
</div>

# Run and deploy your AI Studio app

This contains everything you need to run your app locally.

View your app in AI Studio: https://ai.studio/apps/d88f9442-bd82-4bf7-b552-703b4a81de0c

## Run Locally

**Prerequisites:**  Node.js


1. Install dependencies:
   `npm install`
2. Set the `GEMINI_API_KEY` in [.env.local](.env.local) to your Gemini API key
3. Run the app:
   `npm run dev`

## Campaigns and depot

The hangar's **Campaigns** tab offers City Defence, City Assault, Forest Ambush, and Open Breakthrough. Each operation has three escalating phases, its own terrain size and cover layout, different objectives, and credit rewards. City Defence requires an uncontested timed hold of headquarters; the assault and breakthrough operations require capturing multiple sectors. **Deploy Skirmish** keeps the original endless battlefield available.

Open **Depot → Blueprint Shop** to buy designs for the E100 Zwilling or T28 Assault Prototype. Buying a blueprint reveals the tank in its nation's tech tree; purchasing the vehicle still requires its predecessor and a separate credit payment. The E100 Zwilling fires a twin-shell salvo, while the Maus uses one main cannon.

Credits, owned blueprints, purchased tanks, equipped vehicles, and upgrades are saved in Netlify Database. Existing browser progress is imported on the first connection. Saves use an anonymous, HTTP-only browser cookie, so they remain associated with that browser rather than a cross-device account. A save indicator reports connection errors and offers retries; clearing the cookie disconnects the browser from its save.

For local development with the progression API, run `netlify dev --port 8889`. Database schema changes are defined in `db/schema.ts`, with generated migrations under `netlify/database/migrations` applied at deployment. `npm run lint` checks TypeScript without generating build artifacts.
