export type ResponseTone = 'direct' | 'gentle' | 'analytical';

export type UserGoal = 'reduce_overthinking' | 'improve_focus' | 'manage_stress';

export type FocusMinutes = 5 | 10 | 15 | 25;

export interface UserPreferences {
  tone: ResponseTone;
  saveHistory: boolean;
  privateMode: boolean;
  goal: UserGoal;
  defaultFocusMinutes: FocusMinutes;
  onboarded: boolean;
}
