import os
import hmac
import hashlib
import threading
import pandas as pd
from services.config import get_secret_key

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
EXCEL_PATH = os.path.join(BASE_DIR, 'exam_data.xlsx')
IMAGES_DIR = os.path.join(BASE_DIR, 'static', 'images')
VALID_OPTIONS = ('A', 'B', 'C', 'D')


class ExamDataError(Exception):
    """Raised when the exam workbook is missing or unreadable."""


_lock = threading.Lock()
_cache = {"stamp": None, "questions": None, "answer_key": None}


def image_id(filename):
    # Opaque, stable id so image URLs don't reveal the answer (e.g. "caliper.jpg")
    return hmac.new(get_secret_key().encode(), filename.encode(), hashlib.sha256).hexdigest()[:32]


def image_url(filename):
    return f'/api/images/{image_id(filename)}' if filename else None


def _load_workbook():
    """Parses the Excel file once and re-reads it only when it changes."""
    try:
        st = os.stat(EXCEL_PATH)
    except FileNotFoundError as e:
        raise ExamDataError(f'Exam workbook not found at {EXCEL_PATH}') from e
    stamp = (st.st_mtime_ns, st.st_size)

    with _lock:
        if _cache["stamp"] == stamp:
            return _cache["questions"], _cache["answer_key"]
        try:
            df = pd.read_excel(EXCEL_PATH, sheet_name='Questions').fillna('')
            df_keys = pd.read_excel(EXCEL_PATH, sheet_name='AnswerKey')
            questions = []
            for _, row in df.iterrows():
                image = str(row['ImageFileName']).strip() if row['ImageFileName'] else ''
                questions.append({
                    "questionNo": int(row['QuestionNo']),
                    "questionText": str(row['QuestionText']),
                    "options": {k: str(row[f'Option{k}']) for k in VALID_OPTIONS},
                    "imageFileName": image or None,
                })
            answer_key = {
                int(q): str(a).strip().upper()
                for q, a in zip(df_keys['QuestionNo'], df_keys['CorrectAnswer'])
            }
        except Exception as e:
            raise ExamDataError(f'Could not read exam workbook: {e}') from e

        if not questions or not answer_key:
            raise ExamDataError('The exam workbook has no questions or no answer key.')

        _cache.update(stamp=stamp, questions=questions, answer_key=answer_key)
        return questions, answer_key


def load_questions():
    """Questions for candidates: no answers, no real image filenames."""
    questions, _ = _load_workbook()
    return [
        {
            "questionNo": q["questionNo"],
            "questionText": q["questionText"],
            "options": q["options"],
            "imageUrl": image_url(q["imageFileName"]),
        }
        for q in questions
    ]


def resolve_image(requested_id):
    """Maps an opaque image id back to a file on disk, or None."""
    questions, _ = _load_workbook()
    for q in questions:
        name = q["imageFileName"]
        if name and hmac.compare_digest(image_id(name), requested_id):
            return name
    return None


def validate_answers(answers):
    """Returns (clean_answers, error). Keys are question numbers, values A-D."""
    if not isinstance(answers, dict):
        return None, 'Answers must be an object of question number to option.'
    questions, _ = _load_workbook()
    valid_numbers = {str(q["questionNo"]) for q in questions}
    clean = {}
    for key, value in answers.items():
        if str(key) not in valid_numbers:
            return None, f'Unknown question number: {str(key)[:10]}'
        if not isinstance(value, str) or value.strip().upper() not in VALID_OPTIONS:
            return None, f'Invalid option for question {key}.'
        clean[str(key)] = value.strip().upper()
    return clean, None


def evaluate_exam(student_answers):
    """Scores validated answers. Raises ExamDataError if the workbook can't be read."""
    questions, answer_key = _load_workbook()
    questions_map = {q['questionNo']: q for q in questions}

    score = 0
    breakdown = []
    for q_no, correct_key in answer_key.items():
        user_ans_key = student_answers.get(str(q_no), '')
        is_correct = bool(user_ans_key) and user_ans_key == correct_key
        if is_correct:
            score += 1

        question_info = questions_map.get(q_no, {})
        options = question_info.get('options', {})
        breakdown.append({
            "questionNo": q_no,
            "questionText": str(question_info.get('questionText', '')),
            "imageFileName": question_info.get('imageFileName') or None,
            "candidateAnswer": user_ans_key,
            "candidateAnswerText": str(options.get(user_ans_key, '')).strip() if user_ans_key else '',
            "correctAnswer": correct_key,
            "correctAnswerText": str(options.get(correct_key, '')).strip(),
            "isCorrect": is_correct
        })

    total = len(answer_key)
    percentage = round((score / total) * 100, 2) if total > 0 else 0.0
    status = "PASSED" if percentage >= 95.0 else "FAILED"
    return score, total, percentage, status, breakdown
