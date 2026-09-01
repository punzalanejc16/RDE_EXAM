import os
import json

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
RESULTS_JSON_PATH = os.path.join(BASE_DIR, 'results.json')

def check_candidate_exists(student_name):
    if not os.path.exists(RESULTS_JSON_PATH):
        return False
    try:
        with open(RESULTS_JSON_PATH, 'r', encoding='utf-8') as f:
            history = json.load(f)
            for record in history:
                if record.get('studentName', '').strip().lower() == student_name.strip().lower():
                    return True
    except Exception:
        pass
    return False

def save_to_json(record):
    history = []
    if os.path.exists(RESULTS_JSON_PATH):
        try:
            with open(RESULTS_JSON_PATH, 'r', encoding='utf-8') as f:
                history = json.load(f)
        except Exception as e:
            print(f"Warning: Could not read JSON file. Creating new. {e}")

    history.append(record)
    with open(RESULTS_JSON_PATH, 'w', encoding='utf-8') as f:
        json.dump(history, f, indent=4, ensure_ascii=False)

def get_all_results():
    if os.path.exists(RESULTS_JSON_PATH):
        with open(RESULTS_JSON_PATH, 'r', encoding='utf-8') as f:
            return json.load(f)
    return []