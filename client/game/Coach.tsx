// Tutorial coach: one short, state-aware tip per column. Only shown in tutorial rounds.
import type { GameView } from '../../games/two-halves/logic';
import { MODULE_NAMES } from '../../games/two-halves/manual';
import { COACH, Pixels } from '../pixels';

export function deviceTip(g: GameView): string | null {
  const m = g.modules[0];
  if (!m) return null;
  const name = MODULE_NAMES[m.type].toLowerCase(), sd = g.tools.screwdriver, cut = g.tools.cutters;
  if (m.solved) return g.partner.every((p) => p.solved) ? null : `Your ${name} is disarmed. Open the Manual tab and help your partner with theirs.`;
  if (m.screws) {
    if (sd === 'mine') return `Your ${name} is screwed shut. Tap each screw to take the cover off.`;
    if (sd === 'incoming') return 'The screwdriver is on its way. It lands in 2 seconds.';
    return `Your ${name} is screwed shut and your partner has the screwdriver. Ask them to tap it in their toolbox to pass it to you.`;
  }
  if (sd === 'mine' && g.half === 'A') return 'Cover off! Your partner needs the screwdriver too. Tap it in your toolbox to pass it.';
  if (m.type === 'wires') {
    return cut === 'mine'
      ? 'Your partner tells you which wire to cut. Repeat it back, then tap that wire. A wrong cut is a strike.'
      : 'Read the wires out loud: how many, and their colours from the top. You also need the wire cutters, so ask your partner to pass them.';
  }
  if (m.type === 'keypad') return 'Describe each symbol out loud and give it a name, like "the robot". Your partner finds the column with all four and reads out the order.';
  if (m.type === 'pulse') return 'Measure the voltage and read out the flashes. Your partner tells you which colours to press.';
  return 'Read out the letters on each dial. Your partner finds the only word that fits, then you spell it and press Submit.';
}

export function manualTip(g: GameView): string | null {
  const p = g.partner[0];
  if (!p) return null;
  if (p.solved) return g.modules.every((m) => m.solved) ? null : "Your partner's module is done. Go back to the Device tab and finish yours.";
  if (p.type === 'wires') return 'Your partner has the wires. Ask how many and what colours, then go down the rules and stop at the first that fits. Rule 3 needs their serial number, rule 4 needs your batteries.';
  if (p.type === 'keypad') return 'Your partner has the keypad. Ask them to describe the four symbols, find the one column holding all four, then read out the order from top to bottom.';
  if (p.type === 'pulse') return 'Ask for the voltage first, then use the matching table. For each flash they read out, tell them the colour to press.';
  return 'Ask for the letters on each dial, then find the only word in the list they can spell.';
}

export function Coach({ tip }: { tip: string | null }) {
  if (!tip) return null;
  return (
    <aside className="coach" role="status" key={tip}>
      <Pixels rows={COACH} px={4} />
      <div>
        <span className="label">Tutorial</span>
        <p>{tip}</p>
      </div>
    </aside>
  );
}
