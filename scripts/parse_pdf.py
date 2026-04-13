import fitz
import json
import re
import sys
import os

pdf_path = "src/assets/GUIA-DRAFT-OTC-2026.pdf"
output_path = "src/data/player_database.json"
bigboard_path = "src/data/bigboard.json"

if not os.path.exists(pdf_path):
    print("PDF not found")
    sys.exit()

with open(bigboard_path, 'r', encoding='utf-8') as f:
    bigboard = json.load(f)

doc = fitz.open(pdf_path)
database = {}

def process_player_page(page, player_name):
    blocks = page.get_text('blocks')
    blocks = [b for b in blocks if b[6] == 0]
    
    resumo = ""
    fortes = []
    fracos = []
    estatisticas = []
    times = []
    notas = {}
    bio = ""
    school = "College"

    for i, b in enumerate(blocks):
        text = b[4]
        x0, y0, x1, y1 = b[:4]
        
        # Bio / School
        if "|" in text and ("lbs" in text or "m)" in text or "anos" in text) and y0 < 300:
            lines = text.strip().split('\n')
            for line in lines:
                if "lbs" in line or "m)" in line or "anos" in line:
                    bio = line.strip()
                elif "|" in line:
                    parts = line.split("|")
                    if len(parts) > 1:
                        school = parts[1].strip()
                        
        # Resumo
        if "RESUMO DO PROSPECTO" in text:
            # Find the block immediately below, sorted by y0
            possible_resumo = [cand for cand in blocks if cand[1] > y0 + 5 and cand[1] < y0 + 200 and cand[0] < 400]
            possible_resumo.sort(key=lambda c: c[1])
            if possible_resumo:
                resumo = possible_resumo[0][4].replace('\n', ' ').strip()
                
        # Fortes e Fracos
        if y0 > 550 and y0 < 900 and not text.isupper():
            if 'PONTOS FORTES\nPONTOS FRACOS' in text: continue
            
            lines = text.strip().split('\n')
            pts = []
            cur_pt = ""
            for line in lines:
                line_stripped = line.strip()
                if not line_stripped: continue
                # Start a new bullet if line starts with uppercase, number, or special char (like  for Ótima)
                # If first char is lowercase, assume continuation
                first_char = line_stripped[0]
                if cur_pt and first_char.islower():
                    cur_pt += " " + line_stripped
                else:
                    if cur_pt: pts.append(cur_pt)
                    cur_pt = line_stripped
            if cur_pt: pts.append(cur_pt)
            
            cleaned_pts = [p.replace('•', '').strip() for p in pts if len(p.strip()) > 3]

            if x0 < 400 and len(cleaned_pts) > 0 and 'PONTOS FORTES' not in text:
                fortes.extend(cleaned_pts)
            elif x0 >= 400 and len(cleaned_pts) > 0 and 'PONTOS FRACOS' not in text:
                fracos.extend(cleaned_pts)

        # Estatisticas
        if y0 > 850 and y0 < 1100 and x0 < 400 and not text.isupper():
             if "carreira" in text.lower() or "cedidos" in text.lower() or "tackles" in text.lower() or "tds" in text.lower() or "2024" in text.lower() or "2025" in text.lower() or "snaps" in text.lower():
                 estatisticas = [line.strip() for line in text.strip().split('\n') if len(line.strip()) > 0]
                 
        # Times Interessados
        if y0 > 1050 and y0 < 1250 and x0 < 400 and not text.isupper() and "NOTAS" not in text and "TIMES" not in text and "carreira" not in text.lower():
            if ',' in text or len(text.split('\n')) <= 3:
                raw_teams = text.replace('\n', ' ').replace('.', '').split(',')
                # Filter out obvious mistakes that are long texts
                times = [t.strip() for t in raw_teams if len(t.strip()) > 2 and len(t.strip()) < 30]
            
        # Notas do Scout
        lines = text.strip().split('\n')
        for line in lines:
            if ':' in line:
                parts = line.split(':')
                if len(parts) == 2:
                    k = parts[0].strip()
                    try:
                        v = float(parts[1].strip())
                        if k in ['Habilidade atlética', 'Processamento Mental', 'Braço', 'Precisão', 'vs Run', 'Pass Blocking', 'Run Blocking', 'Uso das Mãos', 'Coverage', 'Pass Rush', 'NOTA FINAL', 'Separação', 'Rotas', 'YAC', 'Mãos', 'Ball Skills', 'Explosão', 'Contra corrida', 'Tackles', 'Run Defense']:
                            notas[k] = v
                    except:
                        pass

    return {
        "name": player_name,
        "school": school, 
        "resumo": resumo,
        "fortes": fortes,
        "fracos": fracos,
        "notas": notas,
        "estatisticas": estatisticas,
        "times": times,
        "bio": bio
    }

for player in bigboard:
    player_name = player["name"]
    name_upper = player_name.upper()
    
    found_page = None
    for p in doc:
        p_text = p.get_text()
        if name_upper in p_text and "RESUMO DO PROSPECTO" in p_text:
            found_page = p
            break
            
    if found_page:
        database[player["id"]] = process_player_page(found_page, player_name)
    else:
        database[player["id"]] = {
            "name": player_name, "school": "College", "resumo": "Dados não encontrados no PDF.",
            "fortes": [], "fracos": [], "notas": {}, "estatisticas": [], "times": [], "bio": ""
        }

with open(output_path, 'w', encoding='utf-8') as f:
    json.dump(database, f, ensure_ascii=False, indent=2)

print("Parsed database generated successfully")
