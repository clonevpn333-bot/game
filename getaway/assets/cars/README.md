# Real 3D car models

Drop a glTF binary file here named after the car's id to replace the built-in model when the game is served over http
(e.g. `rivolta.glb`, `strada.glb`, `rostr.glb`). In the single-file `getaway.html`, use **Garage → Import 3D Model (.glb)**
instead (stored in your browser).

The game fits the model automatically: length axis + front/back detected (use FLIP if it guesses wrong), scaled to the
car's real length, put on the ground, wheels found by name (wheel / tire / tyre / rim / brake / caliper) and wired to
steering, spin and suspension, body paint + glass detected so paint colours and glass damage still work.

Not supported: Draco- or KTX2-compressed files (re-export from Blender without compression). Only use models whose
licence allows it.
