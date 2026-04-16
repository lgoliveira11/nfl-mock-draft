
import json
import re

def normalize_name(name):
    # Remove dots, commas, and trailing suffixes for initial matching
    name = name.lower().replace('.', '').replace(',', '').strip()
    return name

def match_player(target_name, target_pos, source_players):
    norm_target = normalize_name(target_name)
    
    # Try exact match first
    for p in source_players:
        if normalize_name(p['name']) == norm_target:
            return p['name']
            
    # Try match without suffixes (Jr, II, III etc)
    suffixes = [' jr', ' ii', ' iii', ' iv']
    base_target = norm_target
    for s in suffixes:
        if base_target.endswith(s):
            base_target = base_target[:-len(s)].strip()
            break
            
    for p in source_players:
        norm_p = normalize_name(p['name'])
        base_p = norm_p
        for s in suffixes:
            if base_p.endswith(s):
                base_p = base_p[:-len(s)].strip()
                break
        if base_p == base_target and p['position'] == target_pos:
            return p['name']
            
    # Hardcoded or fuzzy matches if needed
    # But let's start with this.
    return target_name

# Positions: G, C -> IOL, EDGE -> ED, DT -> IDL
pos_map = {
    'G': 'IOL',
    'C': 'IOL',
    'EDGE': 'ED',
    'DT': 'IDL',
    'CB': 'CB',
    'S': 'S',
    'LB': 'LB',
    'QB': 'QB',
    'RB': 'RB',
    'WR': 'WR',
    'TE': 'TE',
    'OT': 'OT'
}

raw_data = """
1	Sonny Styles	LB	9.00
2	Arvell Reese	LB	8.96
3	Jermod McCoy	CB	8.95
4	Caleb Downs	S	8.93
5	Jeremiyah Love	RB	8.77
6	Mansoor Delane	CB	8.60
7	Rueben Bain Jr.	EDGE	8.53
8	Carnell Tate	WR	8.46
9	Fernando Mendoza	QB	8.46
10	Olaivavega Ioane	G	8.45
11	Avieon Terrell	CB	8.44
12	Makai Lemon	WR	8.33
13	Jordyn Tyson	WR	8.27
14	Kenyon Sadiq	TE	8.24
15	C.J. Allen	LB	8.21
16	KC Concepcion	WR	8.17
17	Akheem Mesidor	EDGE	8.15
18	Francis Mauigoa	OT	8.07
19	D'Angelo Ponds	CB	8.06
20	Dillon Thieneman	S	8.05
21	Malachi Lawrence	EDGE	8.04
22	Elijah Sarratt	WR	7.98
23	Treydan Stukes	S	7.97
24	Chase Bisontis	G	7.95
25	Omar Cooper Jr.	WR	7.95
26	Ty Simpson	QB	7.92
27	Caleb Lomu	OT	7.86
28	Peter Woods	DT	7.82
29	Zion Young	EDGE	7.81
30	Blake Miller	OT	7.81
31	Emmanuel McNeil-Warren	S	7.79
32	Max Iheanachor	OT	7.78
33	Kadyn Proctor	OT	7.77
34	Cashius Howell	EDGE	7.76
35	Jacob Rodriguez	LB	7.75
36	Christen Miller	DT	7.73
37	Chris Brazzell II	WR	7.72
38	Brandon Cisse	CB	7.71
39	R Mason Thomas	EDGE	7.70
40	Keionte Scott	CB	7.70
41	David Bailey	EDGE	7.67
42	Emmanuel Pregnon	G	7.67
43	Bud Clark	S	7.66
44	Colton Hood	CB	7.66
45	Caleb Banks	DT	7.62
46	Monroe Freeling	OT	7.61
47	Davison Igbinosun	CB	7.55
48	Kayden McDonald	DT	7.55
49	Keylan Rutledge	G	7.55
50	Jadarian Price	RB	7.53
51	Chris Bell	WR	7.53
52	Eli Raridon	TE	7.52
53	Chris Johnson	CB	7.52
54	T.J. Parker	EDGE	7.50
55	Jake Golday	LB	7.48
56	Gabe Jacas	EDGE	7.47
57	Domonique Orange	DT	7.45
58	Trey Zuhn III	C	7.42
59	Spencer Fano	OT	7.38
60	Denzel Boston	WR	7.37
61	Ted Hurst	WR	7.35
62	Josiah Trotter	LB	7.35
63	Germie Bernard	WR	7.33
64	Kaleb Proctor	DT	7.32
65	Jaishawn Barham	EDGE	7.30
66	Mike Washington Jr.	RB	7.28
67	De'Zhaun Stribling	WR	7.27
68	Sam Roush	TE	7.26
69	Keldric Faulk	EDGE	7.26
70	Billy Schrauth	G	7.26
71	Julian Neal	CB	7.25
72	Keith Abney II	CB	7.21
73	Diego Pounds	OT	7.20
74	Lee Hunter	DT	7.20
75	Cyrus Allen	WR	7.20
76	Keagen Trost	G	7.17
77	Kamari Ramsey	S	7.14
78	Antonio Williams	WR	7.14
79	Gracen Halton	DT	7.14
80	Oscar Delp	TE	7.12
81	Nick Barrett	DT	7.09
82	Romello Height	EDGE	7.09
83	Anthony Hill Jr.	LB	7.09
84	Dae'Quan Wright	TE	7.07
85	Beau Stephens	G	7.07
86	Jimmy Rolder	LB	7.06
87	Caleb Tiernan	OT	7.04
88	Derrick Moore	EDGE	7.04
89	Justin Joly	TE	7.04
90	Kyle Louis	LB	7.04
91	LT Overton	EDGE	7.03
92	Garrett Nussmeier	QB	7.02
93	Jalon Kilgore	S	7.02
94	Aiden Fisher	LB	7.02
95	Bryce Lance	WR	7.02
96	Nicholas Singleton	RB	7.00
97	Keyshaun Elliott	LB	6.99
98	Max Klare	TE	6.99
99	Brenen Thompson	WR	6.97
100	Emmett Johnson	RB	6.96
101	Cole Payton	QB	6.93
102	Justin Jefferson	LB	6.93
103	Logan Jones	C	6.93
104	Jake Slaughter	C	6.92
105	Skyler Bell	WR	6.92
106	Jonah Coleman	RB	6.91
107	Eli Stowers	TE	6.91
108	Kaleb Elarms-Orr	LB	6.89
109	Genesis Smith	S	6.88
110	Zakee Wheatley	S	6.88
111	Kendal Daniels	LB	6.87
112	Chris McClellan	DT	6.87
113	Anez Cooper	G	6.84
114	Tanner Koziol	TE	6.83
115	Tim Keenan III	DT	6.82
116	Deontae Lawson	LB	6.80
117	Gennings Dunker	G	6.79
118	Michael Trigg	TE	6.78
119	Nate Boerkircher	TE	6.76
120	Bishop Fitzgerald	S	6.75
121	Toriano Pride Jr.	CB	6.75
122	Kaytron Allen	RB	6.75
123	Ja'Kobi Lane	WR	6.75
124	Markel Bell	OT	6.74
125	Dontay Corleone	DT	6.73
126	Rayshaun Benny	DT	6.70
127	Keyron Crawford	EDGE	6.68
128	Josh Cameron	WR	6.67
129	Tyreak Sapp	EDGE	6.66
130	A.J. Haulcy	S	6.65
131	Zachariah Branch	WR	6.64
132	Kevin Coleman Jr.	WR	6.61
133	Malachi Fields	WR	6.59
134	Demond Claiborne	RB	6.50
135	Adam Randall	RB	6.48
136	Fernando Carmona	G	6.46
137	Jack Endries	TE	6.46
138	Drew Shelton	OT	6.41
139	Desmond Reid	RB	6.41
140	Austin Barber	OT	6.38
141	Le'Veon Moss	RB	6.38
142	Colbie Young	WR	6.32
143	Riley Nowakowski	TE	6.31
144	Pat Coogan	C	6.27
145	Dametrious Crownover	OT	6.21
146	Aamil Wagner	OT	6.18
147	Louis Moore	S	6.12
148	Mikail Kamara	EDGE	6.07
149	Isaiah World	OT	6.01
150	Ar'maj Reed-Adams	G	5.99
151	DQ Smith	S	5.99
152	Nyjalik Kelly	EDGE	5.99
153	Jeff Caldwell	WR	5.98
154	Wade Woodaz	LB	5.92
155	Nolan Rucci	OT	5.91
156	Domani Jackson	CB	5.80
157	Joey Aguilar	QB	5.72
158	Tristan Leigh	OT	5.62
159	Jaeden Roberts	G	5.57
160	Cade Klubnik	QB	5.50
161	Cole Brevard	DT	5.50
162	James Thompson Jr.	DT	5.49
163	Micah Morris	G	5.36
"""

with open('c:/Users/User/Projects/nfl-mock-draft/src/data/bigboard.json', 'r') as f:
    source_players = json.load(f)

output = []
for line in raw_data.strip().split('\n'):
    parts = line.split('\t')
    if len(parts) < 4: continue
    rank = int(parts[0])
    name = parts[1]
    pos = parts[2]
    grade = float(parts[3])
    
    new_pos = pos_map.get(pos, pos)
    best_name = match_player(name, new_pos, source_players)
    
    output.append({
        "id": rank,
        "rank": rank,
        "name": best_name,
        "position": new_pos,
        "grade": grade
    })

with open('c:/Users/User/Projects/nfl-mock-draft/src/data/bigboard_cristian.json', 'w') as f:
    f.write('[\n')
    for i, p in enumerate(output):
        line = f'  {{ "id": {p["id"]}, "rank": {p["rank"]}, "name": "{p["name"]}", "position": "{p["position"]}", "grade": {p["grade"]:.2f} }}'
        if i < len(output) - 1:
            line += ','
        f.write(line + '\n')
    f.write(']\n')

print(f"Created/Updated bigboard_cristian.json with {len(output)} players.")
