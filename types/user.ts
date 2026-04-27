export type ResponseTone = 'direct' | 'gentle' | 'analytical';

export type UserGoal = 'reduce_overthinking' | 'improve_focus' | 'manage_stress';

export interface UserPreferences {
  tone: ResponseTone;
  saveHistory: boolean;
  privateMode: boolean;
  goal: UserGoal;
}
