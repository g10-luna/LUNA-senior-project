/**
 * Shared copy for the student book-return journey (preview + live timeline).
 */
export const RETURN_JOURNEY_STEPS = [
  {
    title: 'Return request sent',
    subtitle: 'Your return is logged and waiting in the staff queue.',
  },
  {
    title: 'Staff approved your return',
    subtitle: 'A librarian approves the return and opens the robot workflow.',
  },
  {
    title: 'Robot on the way',
    subtitle: 'The robot travels to your pickup point (demo ~4 minutes).',
  },
  {
    title: 'Place the book & confirm',
    subtitle: 'Follow staff cues to load the book, then confirm handoff in this app when prompted.',
  },
  {
    title: 'Robot leaves',
    subtitle: 'The robot heads back to the desk with your book (simulated).',
  },
  {
    title: 'Return complete',
    subtitle: 'Staff confirms the book at the desk—you get a notice and the return closes in LUNA.',
  },
] as const;
