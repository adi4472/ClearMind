export const PRESET_TAGS = ['stress', 'work', 'personal', 'decision', 'health'] as const;

export type PresetTag = (typeof PRESET_TAGS)[number];

export const TAG_LABELS: Record<PresetTag, string> = {
  stress: 'Stress',
  work: 'Work',
  personal: 'Personal',
  decision: 'Decision',
  health: 'Health',
};

export function isPresetTag(value: string): value is PresetTag {
  return (PRESET_TAGS as readonly string[]).includes(value);
}
