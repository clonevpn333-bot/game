# Locked narration word timings (../vo/assets/timing.json) -> Remotion Caption[] JSON (src/film/captions.json)
import json, os
here = os.path.dirname(os.path.abspath(__file__))
T = json.load(open(os.path.join(here, '..', '..', 'vo', 'assets', 'timing.json')))
caps = []
for line in T['lines']:
    for k, w in enumerate(line['words']):
        caps.append({
            'text': (' ' if k else ' ') + w['w'],
            'startMs': round(w['s'] * 1000),
            'endMs': round(w['e'] * 1000),
            'timestampMs': round((w['s'] + w['e']) * 500),
            'confidence': 1,
            'line': line['i'],
        })
json.dump(caps, open(os.path.join(here, '..', 'src', 'film', 'captions.json'), 'w'), indent=1)
print(len(caps), 'words')
