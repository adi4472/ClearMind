export interface EncourageMessage {
  title: string;
  body?: string;
}

// Shown when an entire task is marked complete (manual breakdown, or the final
// step of an AI breakdown).
const FINAL_MESSAGES: EncourageMessage[] = [
  { title: 'You did it.', body: 'That counts.' },
  { title: 'Nice work.', body: 'One thing taken care of.' },
  { title: 'Look at you.', body: 'Small wins add up.' },
  { title: 'Done.', body: "You showed up — that's the hardest part." },
  { title: "That's one off your mind.", body: 'Lighter already.' },
  { title: 'Quiet pride moment.', body: 'You moved something forward.' },
  { title: 'Proud of you.', body: 'Truly.' },
];

// Shown after each intermediate step of an AI breakdown (more steps remaining).
const STEP_MESSAGES: EncourageMessage[] = [
  { title: 'One step closer.' },
  { title: 'Nice. Keep going.' },
  { title: 'One down.', body: 'On to the next.' },
  { title: 'That counts.' },
  { title: 'Step by step — exactly the point.' },
  { title: 'Good. Onward.' },
];

function pickRandom<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

export function randomFinalMessage(): EncourageMessage {
  return pickRandom(FINAL_MESSAGES);
}

export function randomStepMessage(): EncourageMessage {
  return pickRandom(STEP_MESSAGES);
}
