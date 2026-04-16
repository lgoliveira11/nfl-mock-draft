
import json
import re

def normalize_name(name):
    # Remove dots, commas, hyphens and lower case
    name = name.lower().replace('.', '').replace(',', '').replace('-', ' ').strip()
    # Remove extra spaces
    name = re.sub(r'\s+', ' ', name)
    return name

def get_base_name(name):
    # Remove common suffixes
    name = normalize_name(name)
    suffixes = [' jr', ' sr', ' ii', ' iii', ' iv']
    for s in suffixes:
        if name.endswith(s):
            return name[:-len(s)].strip()
    return name

with open('c:/Users/User/Projects/nfl-mock-draft/src/data/player_database.json', 'r', encoding='utf-8') as f:
    db = json.load(f)

# Build map of base names to IDs
name_to_id = {}
for pid, pdata in db.items():
    name = normalize_name(pdata['name'])
    base_name = get_base_name(name)
    name_to_id[name] = int(pid)
    if base_name not in name_to_id:
        name_to_id[base_name] = int(pid)

def sync_ids(file_path, db_map):
    with open(file_path, 'r', encoding='utf-8') as f:
        data = json.load(f)
    
    updated_count = 0
    not_found = []
    
    for p in data:
        full_name = normalize_name(p['name'])
        base_name = get_base_name(p['name'])
        
        # Try full name then base name
        if full_name in db_map:
            p['id'] = db_map[full_name]
            updated_count += 1
        elif base_name in db_map:
            p['id'] = db_map[base_name]
            updated_count += 1
        else:
            not_found.append(p['name'])
            
    # Write back in specific format
    with open(file_path, 'w', encoding='utf-8') as f:
        f.write('[\n')
        for i, p in enumerate(data):
            # Format carefully
            grade_str = f'{p["grade"]:.2f}'
            line = f'  {{ "id": {p["id"]}, "rank": {p["rank"]}, "name": "{p["name"]}", "position": "{p["position"]}", "grade": {grade_str} }}'
            if i < len(data) - 1:
                line += ','
            f.write(line + '\n')
        f.write(']\n')
    
    return updated_count, len(data), not_found

print("Processing bigboard.json...")
u1, t1, nf1 = sync_ids('c:/Users/User/Projects/nfl-mock-draft/src/data/bigboard.json', name_to_id)
print(f"Updated {u1}/{t1} players. Not found: {nf1}")

print("\nProcessing bigboard_cristian.json...")
u2, t2, nf2 = sync_ids('c:/Users/User/Projects/nfl-mock-draft/src/data/bigboard_cristian.json', name_to_id)
print(f"Updated {u2}/{t2} players. Not found: {nf2}")
