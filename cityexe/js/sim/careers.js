// Education programmes and job requirements. Degrees are earned by actually
// attending classes at Silver River College (credits), paid with tuition or a
// student loan. Jobs check education, major, age, criminal record and fitness.
import { ensureLife, eduRank, EDU_RANK } from './lifeState.js';

export const PROGRAMS = [
  { id: 'ged', name: 'High School Equivalency (GED)', level: 'highschool', credits: 6, tuition: 300, req: 'none' },
  { id: 'assoc', name: 'Associate of Arts', level: 'associate', credits: 16, tuition: 2400, req: 'highschool' },
  { id: 'bus', name: 'B.S. Business Administration', level: 'bachelor', major: 'Business', credits: 32, tuition: 9600, req: 'highschool' },
  { id: 'cs', name: 'B.S. Computer Science', level: 'bachelor', major: 'Computer Science', credits: 32, tuition: 10400, req: 'highschool' },
  { id: 'edu', name: 'B.A. Education', level: 'bachelor', major: 'Education', credits: 32, tuition: 8000, req: 'highschool' },
  { id: 'nurse', name: 'B.S. Nursing', level: 'bachelor', major: 'Nursing', credits: 32, tuition: 11200, req: 'highschool' },
  { id: 'cj', name: 'B.A. Criminal Justice', level: 'bachelor', major: 'Criminal Justice', credits: 32, tuition: 8800, req: 'highschool' },
  { id: 'fin', name: 'B.S. Finance', level: 'bachelor', major: 'Finance', credits: 32, tuition: 10400, req: 'highschool' },
  { id: 'mba', name: 'MBA', level: 'master', major: 'Business', credits: 20, tuition: 24000, req: 'bachelor' },
  { id: 'med', name: 'Doctor of Medicine (MD)', level: 'medical', major: 'Medicine', credits: 40, tuition: 60000, req: 'bachelor', minSmarts: 65 },
  { id: 'law', name: 'Juris Doctor (Law)', level: 'law', major: 'Law', credits: 30, tuition: 48000, req: 'bachelor', minSmarts: 60 },
  { id: 'pharm', name: 'Doctor of Pharmacy', level: 'medical', major: 'Pharmacy', credits: 32, tuition: 40000, req: 'bachelor', minSmarts: 55 },
];

// requirements per role (anything not listed: no requirements beyond being 18)
export const REQ = {
  doctor: { edu: 'medical', major: 'Medicine', age: 26 }, pharmacist: { edu: 'medical', major: 'Pharmacy' }, nurse: { edu: 'bachelor', major: 'Nursing' },
  paramedic: { edu: 'associate', fitness: 40 }, officer: { edu: 'highschool', clean: true, fitness: 45, age: 21 }, firefighter: { edu: 'highschool', fitness: 55, clean: true },
  teacher: { edu: 'bachelor', major: 'Education' }, professor: { edu: 'master' }, analyst: { edu: 'bachelor' }, manager: { edu: 'bachelor', exp: 2 },
  'bank manager': { edu: 'bachelor', major: ['Business', 'Finance'], clean: true }, teller: { edu: 'highschool', clean: true }, mayor: { elected: true },
  reporter: { edu: 'bachelor' }, pilot: { edu: 'associate', license: 'pilot' }, 'bus driver': { license: 'driver', clean: true }, 'taxi driver': { license: 'driver' },
  'tow operator': { license: 'driver' }, driver: { license: 'driver' }, 'security guard': { clean: true, fitness: 35 }, bouncer: { fitness: 50 }, 'pit boss': { exp: 2 },
  dealer: { edu: 'highschool' }, lineworker: { fitness: 40 }, builder: { fitness: 40 }, operator: { edu: 'associate' }, 'admissions clerk': { edu: 'highschool' },
  receptionist: { edu: 'highschool' }, mechanic: { skill: ['driving', 20] }, cook: { skill: ['cooking', 15] },
};

export function meets(c, role, W) {
  const L = ensureLife(c, W);
  const r = REQ[role] || {};
  const fails = [];
  if (c.age < (r.age || 18)) fails.push(`must be ${r.age || 18}+`);
  if (r.edu && eduRank(c) < EDU_RANK[r.edu]) fails.push(`needs ${r.edu === 'medical' ? 'a medical degree' : r.edu === 'law' ? 'a law degree' : 'a ' + r.edu + (r.edu === 'highschool' ? ' diploma' : ' degree')}`);
  if (r.major) { const majors = Array.isArray(r.major) ? r.major : [r.major]; if (!L.edu.degrees.some((d) => majors.some((m) => d.includes(m)))) fails.push(`needs a ${majors.join('/')} degree`); }
  if (r.clean && (c.record.arrests > 0 || c.record.crimes > 1)) fails.push('needs a clean record');
  if (r.fitness && L.stats.fitness < r.fitness) fails.push(`fitness ${r.fitness}+`);
  if (r.license && !L.license[r.license]) fails.push(`${r.license} licence`);
  if (r.skill && (L.skills[r.skill[0]] || 0) < r.skill[1]) fails.push(`${r.skill[0]} skill ${r.skill[1]}+`);
  if (r.exp && (c.career.length + (c.job ? 1 : 0)) < r.exp) fails.push(`${r.exp}+ previous jobs`);
  if (r.elected) fails.push('elected office');
  return fails;
}

// interview: how likely you get the job if you meet the requirements
export function interviewChance(c, job, W) {
  const L = ensureLife(c, W);
  const s = L.stats;
  let p = 0.35 + s.smarts * 0.003 + s.looks * 0.0015 + (L.skills.charisma || 0) * 0.003 + c.traits.ambition * 0.1;
  p -= c.record.arrests * 0.12;
  if (L.hygiene < 0.4) p -= 0.15;
  if (L.drunk > 0.3) p -= 0.3;
  if (job.wage > 30) p -= 0.08;
  return Math.max(0.05, Math.min(0.92, p));
}

export function enroll(c, prog, W, loan) {
  const L = ensureLife(c, W);
  const P = PROGRAMS.find((p) => p.id === prog);
  if (!P) return 'No such programme.';
  if (eduRank(c) < EDU_RANK[P.req]) return `You need ${P.req === 'highschool' ? 'a high school diploma' : 'a ' + P.req + ' degree'} first.`;
  if (P.minSmarts && L.stats.smarts < P.minSmarts) return `Admissions requires smarts ${P.minSmarts}+ (you have ${Math.round(L.stats.smarts)}).`;
  if (L.edu.enrolled) return 'You are already enrolled in a programme.';
  if (!loan && c.money < P.tuition) return `Tuition is $${P.tuition.toLocaleString()} — not enough cash. Take a student loan?`;
  if (loan) L.loans.push({ kind: 'student', amt: P.tuition, left: Math.round(P.tuition * 1.18), daily: Math.round(P.tuition * 1.18 / 120), since: W.day });
  else c.money -= P.tuition;
  const college = W.economy.ofType('college')[0];
  L.edu.enrolled = P.id; L.edu.credits = 0; L.edu.need = P.credits; L.edu.college = college ? college.id : null;
  if (college) { college.cash += P.tuition; }
  W.history.citizenLog(c, `Enrolled in ${P.name} at Silver River College`, true);
  return null;
}

export function attend(c, W) {
  const L = ensureLife(c, W);
  const P = PROGRAMS.find((p) => p.id === L.edu.enrolled);
  if (!P) return null;
  L.edu.credits++;
  L.stats.smarts = Math.min(100, L.stats.smarts + 1.2);
  if (L.edu.credits >= P.credits) {
    L.edu.enrolled = null;
    if (EDU_RANK[P.level] > EDU_RANK[L.edu.level]) L.edu.level = P.level;
    L.edu.degrees.push(P.major ? `${P.name}` : P.name);
    W.history.citizenLog(c, `Graduated: ${P.name}`, true);
    return { graduated: P };
  }
  return { credits: L.edu.credits, need: P.credits, prog: P };
}
