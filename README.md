# Games For Us

Free two-player web games that only work when both partners cooperate.

## Two Halves

A bomb-defusal game for two. Each player sees half of the device and holds the manual for the other half, so you describe, read and pass tools back and forth until every module is disarmed.

- **Modules:** wires, glyph keypad, pulse lights, word lock
- **Tools:** screwdriver, wire cutters, UV torch, multimeter, split between two toolboxes
- **Utilities:** shared notes, one pause and one hint per round

## Play offline, on the same Wi-Fi

No internet needed. One computer hosts, and both of you play from any phone or laptop on the same Wi-Fi.

```bash
npm install
```

```bash
npm run play
```

The terminal prints two links. Open the `localhost` one on the host computer, and open the `Same Wi-Fi` one on the other device. On Windows, click **Allow** if the firewall asks about Node.js.

## Play online, from anywhere

The repo deploys to [Render](https://render.com) for free with the included `render.yaml`:

1. Sign in to Render with GitHub.
2. Choose **New > Blueprint** and pick this repository.
3. Click **Apply**. After a few minutes you get a public link like `https://two-halves.onrender.com` to share.

Every push to `main` redeploys automatically. On the free plan the server sleeps when nobody plays, so the first visit can take about a minute to wake it.

## Develop

```bash
npm run dev
```

Open http://localhost:5173 in two browser windows, create a room in one and join with the code in the other. The production server (`npm start`) serves the built client and the game socket on `PORT` (default 3001).

## Project layout

```
games/two-halves/   game rules, manual data, tests
server/             rooms and WebSocket server
shared/             message types shared by client and server
client/             React app (Vite)
```

## Checks

```bash
npm test
```

```bash
npm run typecheck
```

Design file: [Two Halves in Figma](https://www.figma.com/design/qHfUaejCKJepPHW7cYzUgN)
