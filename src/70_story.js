/* 70_story.js — campaign data: characters, acts, missions, dialogue. OWNER: story agent. STUB. */
VH.Story = {
  title: 'VOLTHAVEN', tagline: 'The city sleeps so the city can live.',
  requiredBeats: [],
  characters: { kas: { name: 'Rin Kasavin', role: 'protagonist' } },
  acts: [{ id: 'a1', title: 'SIGNAL', missions: ['m01'] }],
  missions: {
    m01: {
      id: 'm01', act: 'a1', title: 'Cold Open', subtitle: 'Undertide', district: 'undertide',
      brief: 'Placeholder.', objectives: [{ id: 'o1', text: 'Survive' }],
      script: [{ t: 'objective', id: 'o1', text: 'Survive' }, { t: 'end', outcome: 'success' }],
    },
  },
  dialogue: {}, codex: [], barks: {},
};
