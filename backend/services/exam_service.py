import os
import pandas as pd

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
EXCEL_PATH = os.path.join(BASE_DIR, 'exam_data.xlsx')

def load_questions():
    if not os.path.exists(EXCEL_PATH):
        print(f"ERROR: Excel file not found at {EXCEL_PATH}")
        return []
    try:
        df = pd.read_excel(EXCEL_PATH, sheet_name='Questions').fillna('')
        questions = []
        for _, row in df.iterrows():
            questions.append({
                "questionNo": int(row['QuestionNo']),
                "questionText": str(row['QuestionText']),
                "options": {
                    "A": str(row['OptionA']),
                    "B": str(row['OptionB']),
                    "C": str(row['OptionC']),
                    "D": str(row['OptionD'])
                },
                "imageFileName": str(row['ImageFileName']).strip() if row['ImageFileName'] else None
            })
        return questions
    except Exception as e:
        print(f"Error reading Excel file: {e}")
        return []

def evaluate_exam(student_answers):
    if not os.path.exists(EXCEL_PATH):
        return 0, 0, 0.0, "FAILED", {}, []
    try:
        df_keys = pd.read_excel(EXCEL_PATH, sheet_name='AnswerKey')
        answer_key = dict(zip(df_keys['QuestionNo'], df_keys['CorrectAnswer']))
        questions_map = {q['questionNo']: q for q in load_questions()}

        score = 0
        total = len(answer_key)
        breakdown = []

        for q_no, correct_ans in answer_key.items():
            q_no_int = int(q_no)
            q_no_key = str(q_no_int)
            raw_user_ans = student_answers.get(q_no_key)
            user_ans_key = str(raw_user_ans).strip().upper() if raw_user_ans is not None else ''
            correct_key = str(correct_ans).strip().upper()

            is_correct = bool(user_ans_key) and user_ans_key == correct_key
            if is_correct:
                score += 1

            question_info = questions_map.get(q_no_int, {})
            options = question_info.get('options', {})
            cand_option_text = str(options.get(user_ans_key, '')).strip() if user_ans_key else ''
            correct_option_text = str(options.get(correct_key, '')).strip()

            breakdown.append({
                "questionNo": q_no_int,
                "questionText": str(question_info.get('questionText', '')),
                "imageFileName": question_info.get('imageFileName') or None,
                "candidateAnswer": user_ans_key,
                "candidateAnswerText": cand_option_text,
                "correctAnswer": correct_key,
                "correctAnswerText": correct_option_text,
                "isCorrect": is_correct
            })

        percentage = round((score / total) * 100, 2) if total > 0 else 0.0
        status = "PASSED" if percentage >= 95.0 else "FAILED"
        formatted_key = {str(k): str(v).strip().upper() for k, v in answer_key.items()}

        return score, total, percentage, status, formatted_key, breakdown
    except Exception as e:
        print(f"Error evaluating exam: {e}")
        return 0, 0, 0.0, "FAILED", {}, []