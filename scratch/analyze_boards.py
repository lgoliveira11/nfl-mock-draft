
import json

def normalize_name(name):
    return name.lower().replace('.', '').replace(',', '').strip()

def get_player_set(file_path):
    with open(file_path, 'r') as f:
        data = json.load(f)
    # Using a tuple of (normalized_name, position) as identity
    # We use position because sometimes names repeat across different positions (rare but possible)
    # also because it was a criterion in the user's previous request.
    return {(normalize_name(p['name']), p['position']): p['name'] for p in data}

board1_map = get_player_set('c:/Users/User/Projects/nfl-mock-draft/src/data/bigboard.json')
board2_map = get_player_set('c:/Users/User/Projects/nfl-mock-draft/src/data/bigboard_cristian.json')

board1_keys = set(board1_map.keys())
board2_keys = set(board2_map.keys())

only_in_original = board1_keys - board2_keys
only_in_cristian = board2_keys - board1_keys

print("### Somente no bigboard.json (Original):")
if not only_in_original:
    print("Nenhum.")
else:
    for k in sorted(only_in_original):
        print(f"- {board1_map[k]} ({k[1]})")

print("\n### Somente no bigboard_cristian.json:")
if not only_in_cristian:
    print("Nenhum.")
else:
    for k in sorted(only_in_cristian):
        print(f"- {board2_map[k]} ({k[1]})")
