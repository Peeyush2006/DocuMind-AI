import sqlite3
import json
from datetime import datetime
import pytz
from typing import Optional, List, Dict, Any
from app.config import DB_PATH, QUOTA_TIMEZONE, FREE_DAILY_DOC_LIMIT, PRO_DAILY_DOC_LIMIT, PLUS_DAILY_DOC_LIMIT

def get_db():
    conn = sqlite3.connect(str(DB_PATH))
    conn.row_factory = sqlite3.Row
    return conn

def init_db():
    conn = get_db()
    cursor = conn.cursor()
    
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS users (
        user_id TEXT PRIMARY KEY,
        email TEXT,
        plan_id TEXT DEFAULT 'free',
        account_status TEXT DEFAULT 'active',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
    """)
    
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS documents (
        id TEXT PRIMARY KEY,
        user_id TEXT,
        title TEXT,
        filename TEXT,
        original_ext TEXT,
        source_path TEXT,
        enhanced_path TEXT,
        status TEXT,
        conversion_mode TEXT DEFAULT 'editable',
        page_count INTEGER DEFAULT 1,
        confidence_avg REAL DEFAULT 0.0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
    """)
    
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS document_versions (
        id TEXT PRIMARY KEY,
        document_id TEXT,
        version_num INTEGER,
        content_html TEXT,
        raw_text TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY(document_id) REFERENCES documents(id)
    )
    """)
    
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS extraction_data (
        document_id TEXT PRIMARY KEY,
        data_json TEXT,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY(document_id) REFERENCES documents(id)
    )
    """)
    
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS usage_records (
        user_id TEXT,
        quota_date TEXT,
        documents_started INTEGER DEFAULT 0,
        documents_completed INTEGER DEFAULT 0,
        idempotency_keys TEXT DEFAULT '[]',
        PRIMARY KEY(user_id, quota_date)
    )
    """)
    
    # Ensure default user
    cursor.execute("SELECT user_id FROM users WHERE user_id = 'default_user'")
    if not cursor.fetchone():
        cursor.execute("INSERT INTO users (user_id, email, plan_id) VALUES ('default_user', 'user@documind.ai', 'free')")
        
    conn.commit()
    conn.close()

def get_today_ist_str() -> str:
    tz = pytz.timezone(QUOTA_TIMEZONE)
    return datetime.now(tz).strftime("%Y-%m-%d")

def get_user_plan(user_id: str = "default_user") -> Dict[str, Any]:
    conn = get_db()
    cursor = conn.cursor()
    cursor.execute("SELECT plan_id, account_status FROM users WHERE user_id = ?", (user_id,))
    row = cursor.fetchone()
    conn.close()
    if not row:
        return {"plan_id": "free", "plan_name": "Free Starter"}
    
    plan_id = row["plan_id"]
    names = {"free": "Free Starter", "pro": "Pro Professional", "plus": "Plus Enterprise"}
    limits = {"free": FREE_DAILY_DOC_LIMIT, "pro": PRO_DAILY_DOC_LIMIT, "plus": PLUS_DAILY_DOC_LIMIT}
    page_limits = {"free": 5, "pro": 20, "plus": 50}
    
    return {
        "plan_id": plan_id,
        "plan_name": names.get(plan_id, "Free Starter"),
        "daily_limit": limits.get(plan_id, FREE_DAILY_DOC_LIMIT),
        "page_limit": page_limits.get(plan_id, 5)
    }

def update_user_plan(plan_id: str, user_id: str = "default_user"):
    conn = get_db()
    cursor = conn.cursor()
    cursor.execute("UPDATE users SET plan_id = ? WHERE user_id = ?", (plan_id, user_id))
    conn.commit()
    conn.close()

def get_quota_status(user_id: str = "default_user") -> Dict[str, Any]:
    plan = get_user_plan(user_id)
    today = get_today_ist_str()
    
    conn = get_db()
    cursor = conn.cursor()
    cursor.execute(
        "SELECT documents_started, documents_completed FROM usage_records WHERE user_id = ? AND quota_date = ?",
        (user_id, today)
    )
    row = cursor.fetchone()
    conn.close()
    
    started = row["documents_started"] if row else 0
    daily_limit = plan["daily_limit"]
    remaining = max(0, daily_limit - started)
    can_process = remaining > 0
    
    # Calculate resets_at_ist (next midnight IST)
    tz = pytz.timezone(QUOTA_TIMEZONE)
    now_ist = datetime.now(tz)
    resets_at = f"{today} 23:59:59 IST"
    
    return {
        "plan_id": plan["plan_id"],
        "plan_name": plan["plan_name"],
        "daily_limit": daily_limit,
        "documents_used_today": started,
        "remaining_today": remaining,
        "resets_at_ist": resets_at,
        "can_process_new": can_process,
        "page_limit_per_doc": plan["page_limit"]
    }

def reserve_quota_slot(user_id: str = "default_user", idempotency_key: Optional[str] = None) -> bool:
    quota = get_quota_status(user_id)
    if not quota["can_process_new"]:
        return False
        
    today = get_today_ist_str()
    conn = get_db()
    cursor = conn.cursor()
    
    cursor.execute("SELECT documents_started, idempotency_keys FROM usage_records WHERE user_id = ? AND quota_date = ?", (user_id, today))
    row = cursor.fetchone()
    
    if row:
        idem_keys = json.loads(row["idempotency_keys"])
        if idempotency_key and idempotency_key in idem_keys:
            # Already reserved for this idempotent retry, allow without consuming another slot
            conn.close()
            return True
        if idempotency_key:
            idem_keys.append(idempotency_key)
        cursor.execute(
            "UPDATE usage_records SET documents_started = documents_started + 1, idempotency_keys = ? WHERE user_id = ? AND quota_date = ?",
            (json.dumps(idem_keys), user_id, today)
        )
    else:
        idem_keys = [idempotency_key] if idempotency_key else []
        cursor.execute(
            "INSERT INTO usage_records (user_id, quota_date, documents_started, idempotency_keys) VALUES (?, ?, 1, ?)",
            (user_id, today, json.dumps(idem_keys))
        )
    conn.commit()
    conn.close()
    return True

def finalize_quota_slot(user_id: str = "default_user"):
    today = get_today_ist_str()
    conn = get_db()
    cursor = conn.cursor()
    cursor.execute(
        "UPDATE usage_records SET documents_completed = documents_completed + 1 WHERE user_id = ? AND quota_date = ?",
        (user_id, today)
    )
    conn.commit()
    conn.close()

def release_quota_slot(user_id: str = "default_user"):
    today = get_today_ist_str()
    conn = get_db()
    cursor = conn.cursor()
    cursor.execute(
        "UPDATE usage_records SET documents_started = MAX(0, documents_started - 1) WHERE user_id = ? AND quota_date = ?",
        (user_id, today)
    )
    conn.commit()
    conn.close()

def save_document_record(doc: Dict[str, Any]):
    conn = get_db()
    cursor = conn.cursor()
    cursor.execute("""
    INSERT OR REPLACE INTO documents 
    (id, user_id, title, filename, original_ext, source_path, enhanced_path, status, conversion_mode, page_count, confidence_avg, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    """, (
        doc["id"], doc["user_id"], doc["title"], doc["filename"], doc["original_ext"],
        doc["source_path"], doc.get("enhanced_path"), doc["status"],
        doc.get("conversion_mode", "editable"), doc.get("page_count", 1),
        doc.get("confidence_avg", 0.0), doc.get("created_at", datetime.now().isoformat()),
        datetime.now().isoformat()
    ))
    conn.commit()
    conn.close()

def get_document_record(doc_id: str) -> Optional[Dict[str, Any]]:
    conn = get_db()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM documents WHERE id = ?", (doc_id,))
    row = cursor.fetchone()
    conn.close()
    return dict(row) if row else None

def list_documents(user_id: str = "default_user") -> List[Dict[str, Any]]:
    conn = get_db()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM documents WHERE user_id = ? ORDER BY created_at DESC", (user_id,))
    rows = cursor.fetchall()
    conn.close()
    return [dict(r) for r in rows]

def delete_document_record(doc_id: str):
    conn = get_db()
    cursor = conn.cursor()
    cursor.execute("DELETE FROM document_versions WHERE document_id = ?", (doc_id,))
    cursor.execute("DELETE FROM extraction_data WHERE document_id = ?", (doc_id,))
    cursor.execute("DELETE FROM documents WHERE id = ?", (doc_id,))
    conn.commit()
    conn.close()

def save_extraction_data(doc_id: str, data: Dict[str, Any]):
    conn = get_db()
    cursor = conn.cursor()
    cursor.execute("INSERT OR REPLACE INTO extraction_data (document_id, data_json, updated_at) VALUES (?, ?, ?)",
                   (doc_id, json.dumps(data), datetime.now().isoformat()))
    conn.commit()
    conn.close()

def get_extraction_data(doc_id: str) -> Optional[Dict[str, Any]]:
    conn = get_db()
    cursor = conn.cursor()
    cursor.execute("SELECT data_json FROM extraction_data WHERE document_id = ?", (doc_id,))
    row = cursor.fetchone()
    conn.close()
    if row and row["data_json"]:
        return json.loads(row["data_json"])
    return None

def save_document_version(doc_id: str, content_html: str, raw_text: str = ""):
    conn = get_db()
    cursor = conn.cursor()
    cursor.execute("SELECT COUNT(*) as cnt FROM document_versions WHERE document_id = ?", (doc_id,))
    cnt = cursor.fetchone()["cnt"]
    new_version = cnt + 1
    version_id = f"{doc_id}_v{new_version}"
    
    cursor.execute(
        "INSERT INTO document_versions (id, document_id, version_num, content_html, raw_text) VALUES (?, ?, ?, ?, ?)",
        (version_id, doc_id, new_version, content_html, raw_text)
    )
    cursor.execute("UPDATE documents SET status = 'edited', updated_at = ? WHERE id = ?", (datetime.now().isoformat(), doc_id))
    conn.commit()
    conn.close()

def get_latest_version(doc_id: str) -> Optional[Dict[str, Any]]:
    conn = get_db()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM document_versions WHERE document_id = ? ORDER BY version_num DESC LIMIT 1", (doc_id,))
    row = cursor.fetchone()
    conn.close()
    return dict(row) if row else None
