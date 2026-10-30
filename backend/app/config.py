import os
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent.parent
STORAGE_DIR = BASE_DIR / "storage"
UPLOADS_DIR = STORAGE_DIR / "uploads"
PROCESSED_DIR = STORAGE_DIR / "processed"
EXPORTS_DIR = STORAGE_DIR / "exports"
SAMPLES_DIR = STORAGE_DIR / "samples"
DB_PATH = STORAGE_DIR / "documind.db"

for directory in [UPLOADS_DIR, PROCESSED_DIR, EXPORTS_DIR, SAMPLES_DIR]:
    directory.mkdir(parents=True, exist_ok=True)

FREE_DAILY_DOC_LIMIT = 3
FREE_MAX_PAGES_PER_DOC = 5

PRO_DAILY_DOC_LIMIT = 30
PRO_MAX_PAGES_PER_DOC = 20

PLUS_DAILY_DOC_LIMIT = 100
PLUS_MAX_PAGES_PER_DOC = 50

# Confidence threshold under which text is flagged for review
CONFIDENCE_THRESHOLD = 0.85

# Timezone for quota reset (IST)
QUOTA_TIMEZONE = "Asia/Kolkata"
