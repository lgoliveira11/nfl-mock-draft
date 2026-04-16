
import json

file_path = 'c:/Users/User/Projects/nfl-mock-draft/src/data/bigboard.json'

with open(file_path, 'r') as f:
    data = json.load(f)

with open(file_path, 'w') as f:
    f.write('[\n')
    for i, p in enumerate(data):
        # Format the grade to 2 decimal places to match the style
        grade_str = f'{p["grade"]:.2f}'
        line = f'  {{ "id": {p["id"]}, "rank": {p["rank"]}, "name": "{p["name"]}", "position": "{p["position"]}", "grade": {grade_str} }}'
        if i < len(data) - 1:
            line += ','
        f.write(line + '\n')
    f.write(']\n')

print(f"Reformatted bigboard.json with {len(data)} players.")
