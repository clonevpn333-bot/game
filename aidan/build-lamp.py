"""Build lamp.html (the Lamp Timeline) from index.html. Run: python3 aidan/build-lamp.py"""
import pathlib
d=pathlib.Path(__file__).parent
s=(d/'index.html').read_text(encoding='utf8')
for a,b in [("<title>The Calling of Aidan</title>","<title>The Calling of Aidan — Lamp Timeline</title>"),("'aidan_house_v3'","'aidan_lamp_v1'"),("<script>\n'use strict';","<script>\n'use strict';window.LAMP_TIMELINE=1;")]:
    assert a in s,a
    s=s.replace(a,b)
(d/'lamp.html').write_text(s,encoding='utf8');print('built lamp.html')
