// Prints triangle counts of the vehicle models (node test/geo-stats.mjs; needs node_modules/three -> vendor).
import { buildVehicleModels } from '../js/render/vehicleModels.js';
const M = buildVehicleModels();
for (const k in M) console.log(k, M[k].attributes.position.count / 3 | 0, 'tris');
