// "The Works": the side-on course for Chapter 5, written as explicit pieces in metres so every
// gap and climb is a deliberate distance. Movement budget (see chapter5.js): a running jump
// clears ~6 m and rises ~2.9 m; an air dash adds ~3.6 m; wall jumps climb shafts 3-5 m wide.

export function buildCourse() {
  const S = [];                  // static solids {x0,x1,y0,y1}
  const oneWay = [];             // thin platforms you can jump up through {x0,x1,y}
  const crumble = [];            // {x0,x1,y, t}
  const saws = [];               // {x,y,r, path:[x0,y0,x1,y1], period}
  const pistons = [];            // crushers {x0,x1,top,low,period,phase}
  const movers = [];             // {x0,y0,x1,y1,w,period,phase}
  const conveyors = [];          // {x0,x1,y,dir,speed}
  const vents = [];              // launchers {x,y,power,period,phase}
  const drones = [];             // {x0,x1,y}
  const checkpoints = [];        // {x,y,id,budget}
  const lasers = [];             // timed beams {x,y0,y1,period,on}
  const floor = (x0, x1, y) => S.push({ x0, x1, y0: -12, y1: y });
  const block = (x0, x1, y0, y1) => S.push({ x0, x1, y0, y1 });

  // ---- 1. startup: run, jump, a step, a gap, crumbling grates
  floor(-10, 18, 0);
  floor(22, 34, 0);
  floor(34, 44, 2);
  oneWay.push({ x0: 46.5, x1: 49.5, y: 3.4 });
  crumble.push({ x0: 51, x1: 55, y: 3 });
  floor(57, 71.5, 1);
  checkpoints.push({ x: 60, y: 1, id: 'c1', budget: 150 });
  block(-12, -10, -12, 30); // the start wall

  // ---- 2. the shaft: walk in under an overhang, wall-jump between its faces, climb out top right
  block(66, 67.5, 4.6, 17);                 // left wall (an overhang you walk under)
  floor(71.5, 86, 13);                      // right wall of the shaft and the ledge on top
  saws.push({ x: 79, y: 13.7, r: 0.9, path: [77, 13.7, 82, 13.7], period: 2.6 });
  floor(86, 100, 13);
  pistons.push({ x0: 90, x1: 92.5, top: 19, low: 13, period: 2.2, phase: 0 });
  pistons.push({ x0: 95, x1: 97.5, top: 19, low: 13, period: 2.2, phase: 1.1 });
  block(86, 100, 19, 22);                    // ceiling the crushers hang from
  movers.push({ x0: 103, y0: 11, x1: 112, y1: 11, w: 3, period: 4.2, phase: 0 });
  floor(115, 128, 10);
  checkpoints.push({ x: 118, y: 10, id: 'c2', budget: 120 });

  // ---- 3. the line: a dash gap, drones, a conveyor against you, steam launchers to a high ledge
  floor(136, 142, 11);                      // 8 m gap from 128: needs jump + dash
  drones.push({ x0: 143, x1: 151, y: 12.6 });
  floor(142, 152, 11);
  conveyors.push({ x0: 152, x1: 166, y: 10, dir: -1, speed: 4.5 });
  floor(152, 166, 10);
  vents.push({ x: 163.4, y: 10, power: 26, period: 2.4, phase: 0 });
  block(166, 168, 10, 16.5);
  floor(168, 182, 17);                      // high ledge (reach it from the vent)
  lasers.push({ x: 175, y0: 17, y1: 22, period: 1.8, on: 0.9 });
  floor(185, 196, 8);
  checkpoints.push({ x: 188, y: 8, id: 'c3', budget: 100 });

  // ---- 4. the collapse: everything at once while the Works fall in behind you
  floor(196, 204, 8);
  crumble.push({ x0: 206, x1: 210, y: 9 });
  floor(212, 218, 10);
  saws.push({ x: 222.5, y: 10.8, r: 1.0, path: [222.5, 10.8, 222.5, 14.5], period: 1.6 });
  floor(220, 226, 10);
  floor(226, 232.5, 10);
  block(228, 229.2, 13, 25);                // overhang: walk under it into the second shaft
  floor(232.5, 244, 18);                    // right face of the shaft and the floor above
  drones.push({ x0: 236, x1: 243, y: 19.6 });
  movers.push({ x0: 247, y0: 18, x1: 247, y1: 23, w: 3, period: 2.6, phase: 0 });
  floor(251, 258, 22);
  pistons.push({ x0: 260, x1: 262.5, top: 28, low: 22, period: 1.6, phase: 0.4 });
  floor(258, 266, 22);
  crumble.push({ x0: 268, x1: 271, y: 22 });
  crumble.push({ x0: 273, x1: 276, y: 22 });
  floor(278, 300, 22);
  const exit = { x: 292, y: 22 };

  const start = { x: -6, y: 0 };
  const collapse = { from: 174, trigger: 196, speed: 4.6, accel: 0.03 }; // the falling-in wall chases you in section 4
  return { S, oneWay, crumble, saws, pistons, movers, conveyors, vents, drones, checkpoints, lasers, exit, start, collapse, minY: -10 };
}
