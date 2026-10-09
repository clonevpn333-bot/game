# DEAD FREQUENCY

A first-person, grounded horror game. October 15, 2004: you are Evan, 17, working the overnight shift alone at KTLR 94.1, a tiny radio station outside Kessler Gap, Oregon.

## Run it
Any static server works (scripts are plain, no build step):

```
cd dead-frequency
npx http-server -p 8080   # or: python3 -m http.server 8080
```
Open http://localhost:8080 and click NEW TAPE. Headphones recommended.

## Controls
WASD move · Mouse look · E interact (hold where shown) · Shift walk faster · C crouch · F flashlight · Tab phone · 1–4 / mouse dialogue choices · Esc pause
Driving: W gas · S brake · A/D steer · H high beams · R tune radio

Everything (models, textures, music, sound) is generated in code. Three.js r160 is vendored in `vendor/`.
