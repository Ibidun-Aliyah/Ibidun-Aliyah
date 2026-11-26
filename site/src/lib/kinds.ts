// Post types and their LED colours.
export const KINDS = {
  build: { label: 'Build', color: '#FFB020' },
  teach: { label: 'Teach', color: '#3BE38A' },
  organise: { label: 'Organise', color: '#4DA3FF' },
  learn: { label: 'Learn', color: '#FF5FB0' },
  life: { label: 'Life', color: '#FFF3D6' },
} as const;
export type Kind = keyof typeof KINDS;
