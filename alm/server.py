#!/usr/bin/env python3
"""Local, dependency-free ALM for the motor controller project."""
from __future__ import annotations

import argparse
import csv
import json
import re
import sqlite3
from datetime import datetime, timezone
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from urllib.parse import unquote, urlparse

HERE = Path(__file__).resolve().parent
PROJECT = HERE.parent / "moteus_c1_aspice_draft"
DEFAULT_DB = HERE / "data" / "alm.sqlite3"
STAGES = [
    ("MAN.3", "프로젝트 관리"), ("SYS.1", "이해관계자 요구"),
    ("SYS.2", "시스템 요구"), ("SYS.3", "시스템 아키텍처"),
    ("HWE.1", "하드웨어 요구"), ("HWE.2", "하드웨어 설계"),
    ("HWE.3", "하드웨어 설계 검증"), ("HWE.4", "하드웨어 요구 검증"),
    ("SWE.1", "소프트웨어 요구"), ("SWE.2", "소프트웨어 아키텍처"),
    ("SWE.3", "상세 설계·구현"), ("SWE.4", "단위 검증"),
    ("SWE.5", "소프트웨어 통합 검증"), ("SWE.6", "소프트웨어 요구 검증"),
    ("SYS.4", "시스템 통합 검증"), ("SYS.5", "시스템 요구 검증"),
    ("VAL.1", "제품 유효성 확인"), ("SPL.2", "릴리스"),
    ("SUP.8", "형상 관리"), ("SUP.9", "문제 관리"), ("SUP.10", "변경 관리"),
]
TYPES = ("requirement", "architecture", "design", "test_case", "test_run", "document", "change", "problem")
STATUSES = ("Proposed", "Draft", "Reviewed", "Approved", "Obsolete")
PREFIXES = {
    ("SYS.1", "requirement"): "STK-REQ", ("SYS.2", "requirement"): "SYS-REQ",
    ("SYS.3", "architecture"): "SYS-ARC", ("HWE.1", "requirement"): "HWE-REQ",
    ("HWE.2", "design"): "HWE-DES", ("SWE.1", "requirement"): "SWE-REQ",
    ("SWE.2", "architecture"): "SWE-ARC", ("SWE.3", "design"): "SWE-DET",
    ("SUP.10", "change"): "CR", ("SUP.9", "problem"): "PRB",
}


def now():
    return datetime.now(timezone.utc).isoformat(timespec="seconds")


def connect(path: Path):
    path.parent.mkdir(parents=True, exist_ok=True)
    db = sqlite3.connect(path)
    db.row_factory = sqlite3.Row
    db.execute("PRAGMA foreign_keys=ON")
    db.execute("PRAGMA busy_timeout=3000")
    return db


def initialize(db):
    db.executescript("""
        CREATE TABLE IF NOT EXISTS items (
          id TEXT PRIMARY KEY, process TEXT NOT NULL, kind TEXT NOT NULL,
          title TEXT NOT NULL, body TEXT NOT NULL DEFAULT '',
          status TEXT NOT NULL DEFAULT 'Draft', priority TEXT NOT NULL DEFAULT 'Must',
          category TEXT NOT NULL DEFAULT '', metadata TEXT NOT NULL DEFAULT '{}',
          revision INTEGER NOT NULL DEFAULT 1, created_at TEXT NOT NULL, updated_at TEXT NOT NULL
        );
        CREATE TABLE IF NOT EXISTS links (
          source TEXT NOT NULL REFERENCES items(id), relation TEXT NOT NULL,
          target TEXT NOT NULL REFERENCES items(id),
          PRIMARY KEY (source, relation, target), CHECK(source != target)
        );
        CREATE TABLE IF NOT EXISTS history (
          id INTEGER PRIMARY KEY AUTOINCREMENT, item_id TEXT NOT NULL,
          revision INTEGER NOT NULL, snapshot TEXT NOT NULL, changed_at TEXT NOT NULL
        );
        CREATE TABLE IF NOT EXISTS settings (key TEXT PRIMARY KEY, value TEXT NOT NULL);
    """)
    if db.execute("SELECT value FROM settings WHERE key='seeded'").fetchone():
        if not (HERE / "data" / "workspace.json").exists():
            write_snapshot(db)
        return
    saved = HERE / "data" / "workspace.json"
    if saved.exists():
        snapshot = json.loads(saved.read_text(encoding="utf-8"))
        stamp = now()
        with db:
            for item in snapshot["items"]:
                db.execute("INSERT INTO items VALUES (?,?,?,?,?,?,?,?,?,?,?,?)", (
                    item["id"], item["process"], item["kind"], item["title"], item["body"],
                    item["status"], item["priority"], item["category"],
                    json.dumps(item["metadata"], ensure_ascii=False), item["revision"],
                    item.get("created_at", stamp), item.get("updated_at", stamp)))
            for link in snapshot["links"]:
                db.execute("INSERT INTO links VALUES (?,?,?)", (link["source"], link["relation"], link["target"]))
            for record in snapshot.get("history", []):
                db.execute("INSERT INTO history(item_id,revision,snapshot,changed_at) VALUES (?,?,?,?)", (
                    record["item_id"], record["revision"], json.dumps(record["snapshot"], ensure_ascii=False), record["changed_at"]))
            db.execute("INSERT INTO settings VALUES ('seeded','1')")
        return
    seed = json.loads((HERE / "data" / "initial_requirements.json").read_text(encoding="utf-8"))
    stamp = now()
    with db:
        for process, section, body_key in [
            ("SYS.1", seed["stakeholder"], "need"),
            ("SYS.2", seed["system"], "requirement"),
        ]:
            for item in section["requirements"]:
                extras = {k: v for k, v in item.items() if k not in
                          {"id", "title", body_key, "priority", "status", "category", "source"}}
                db.execute("""INSERT INTO items VALUES (?,?,?,?,?,?,?,?,?,?,?,?)""", (
                    item["id"], process, "requirement", item["title"], item[body_key],
                    item.get("status", "Draft"), item.get("priority", "Must"),
                    item.get("category", ""), json.dumps(extras, ensure_ascii=False), 1, stamp, stamp))
        with (PROJECT / "trace" / "links.csv").open(encoding="utf-8-sig", newline="") as f:
            for row in csv.DictReader(f):
                db.execute("INSERT INTO links VALUES (?,?,?)", (row["source"], row["relation"], row["target"]))
        for ident, title, process, path in [
            ("PRJ-CHARTER-001", "프로젝트 차터", "MAN.3", "docs/00_project/project_charter.md"),
            ("SYS2-REVIEW-001", "시스템 요구사항 리뷰", "SYS.2", "docs/02_system/system_requirements_review.md"),
            ("SYS2-CHECK-001", "SYS.2 리뷰 체크리스트", "SYS.2", "docs/02_system/sys2_review_checklist.md"),
        ]:
            db.execute("INSERT INTO items VALUES (?,?,?,?,?,?,?,?,?,?,?,?)", (
                ident, process, "document", title, (PROJECT / path).read_text(encoding="utf-8"),
                "Draft", "Must", "", json.dumps({"imported_from": path}, ensure_ascii=False), 1, stamp, stamp))
        db.execute("INSERT INTO settings VALUES ('seeded','1')")
    write_snapshot(db)


def item_dict(row):
    result = dict(row)
    result["metadata"] = json.loads(result["metadata"])
    return result


def all_data(db):
    items = [item_dict(r) for r in db.execute("SELECT * FROM items ORDER BY id")]
    links = [dict(r) for r in db.execute("SELECT * FROM links ORDER BY source,target")]
    return {"items": items, "links": links, "stages": STAGES, "types": TYPES}


def write_snapshot(db):
    data = all_data(db)
    data = {"items": data["items"], "links": data["links"],
            "history": [{**dict(r), "snapshot": json.loads(r["snapshot"])} for r in
                        db.execute("SELECT item_id,revision,snapshot,changed_at FROM history ORDER BY id")]}
    path = HERE / "data" / "workspace.json"
    temp = path.with_suffix(".json.tmp")
    temp.write_text(json.dumps(data, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    temp.replace(path)


def diagnostics(items, links):
    by_id = {x["id"]: x for x in items}
    incoming = {}
    outgoing = {}
    for link in links:
        incoming.setdefault(link["target"], []).append(link)
        outgoing.setdefault(link["source"], []).append(link)
    issues = []
    for item in items:
        if item["status"] == "Obsolete":
            continue
        ident, process, kind = item["id"], item["process"], item["kind"]
        meta = item["metadata"]
        if kind == "requirement" and process == "SYS.2":
            if not any(x["relation"] == "derived_from" for x in outgoing.get(ident, [])):
                issues.append({"item_id": ident, "level": "error", "message": "상위 이해관계자 요구와 연결되지 않음"})
            ver = meta.get("verification", {})
            if not ver.get("method") or not ver.get("acceptance_criteria"):
                issues.append({"item_id": ident, "level": "error", "message": "검증 방법 또는 판정 기준 누락"})
            if "TBD" in item["body"] or "TBD" in str(ver.get("acceptance_criteria", "")) or meta.get("open_points"):
                issues.append({"item_id": ident, "level": "warning", "message": "TBD 또는 미결정 항목 남음"})
            if meta.get("technical_feasibility", {}).get("status") != "Assessed":
                issues.append({"item_id": ident, "level": "warning", "message": "기술 실현 가능성 평가 대기"})
            if item["status"] == "Approved" and any(i["item_id"] == ident for i in issues):
                issues.append({"item_id": ident, "level": "error", "message": "승인 상태에 미해결 항목 존재"})
        if kind == "requirement" and process == "SYS.1" and not incoming.get(ident):
            issues.append({"item_id": ident, "level": "warning", "message": "파생된 시스템 요구사항 없음"})
        if kind == "test_case" and not any(x["relation"] == "verifies" for x in outgoing.get(ident, [])):
            issues.append({"item_id": ident, "level": "warning", "message": "검증 대상 요구사항이 연결되지 않음"})
        if kind == "test_run" and not any(x["relation"] == "result_of" for x in outgoing.get(ident, [])):
            issues.append({"item_id": ident, "level": "warning", "message": "시험 명세가 연결되지 않음"})
    return issues


def create_id(db, process, kind):
    if kind == "test_case":
        prefix = "TC-" + process.replace(".", "")
    elif kind == "test_run":
        prefix = "RUN"
    else:
        prefix = PREFIXES.get((process, kind), process.replace(".", "") + "-" + kind.upper()[:3])
    numbers = [int(m.group(1)) for row in db.execute("SELECT id FROM items WHERE id LIKE ?", (prefix + "-%",))
               if (m := re.fullmatch(re.escape(prefix) + r"-(\d+)", row["id"]))]
    return f"{prefix}-{max(numbers, default=0) + 1:03d}"


def validate_item(payload, existing=None):
    process, kind = payload.get("process"), payload.get("kind")
    if process not in {p for p, _ in STAGES} or kind not in TYPES:
        raise ValueError("유효한 프로세스와 산출물 종류를 선택하세요.")
    title = str(payload.get("title", "")).strip()
    if not title:
        raise ValueError("제목을 입력하세요.")
    status = payload.get("status", "Draft")
    if status not in STATUSES:
        raise ValueError("유효하지 않은 상태입니다.")
    metadata = payload.get("metadata", {})
    if not isinstance(metadata, dict):
        raise ValueError("상세 속성은 객체여야 합니다.")
    if kind == "requirement" and process == "SYS.2" and status == "Approved":
        verification = metadata.get("verification", {})
        if ("TBD" in str(payload.get("body", "")) or "TBD" in str(verification.get("acceptance_criteria", ""))
                or metadata.get("open_points") or metadata.get("technical_feasibility", {}).get("status") != "Assessed"
                or not verification.get("method") or not verification.get("acceptance_criteria")):
            raise ValueError("SYS.2 승인 전 TBD·미결정 사항, 검증 기준, 실현 가능성 평가를 완료하세요.")
    if existing and (process != existing["process"] or kind != existing["kind"]):
        raise ValueError("기존 항목의 프로세스와 종류는 변경할 수 없습니다.")


class Handler(BaseHTTPRequestHandler):
    db_path = DEFAULT_DB

    def log_message(self, fmt, *args):
        print("[ALM] " + fmt % args)

    def send_json(self, data, status=200):
        body = json.dumps(data, ensure_ascii=False).encode("utf-8")
        self.send_response(status)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Content-Length", str(len(body)))
        self.send_header("Cache-Control", "no-store")
        self.end_headers()
        self.wfile.write(body)

    def input(self):
        length = int(self.headers.get("Content-Length", "0"))
        if length > 2_000_000:
            raise ValueError("요청 크기가 너무 큽니다.")
        return json.loads(self.rfile.read(length) or b"{}")

    def do_GET(self):
        path = unquote(urlparse(self.path).path)
        if path == "/api/data":
            with connect(self.db_path) as db:
                data = all_data(db)
                data["diagnostics"] = diagnostics(data["items"], data["links"])
            return self.send_json(data)
        if path == "/api/export.json":
            with connect(self.db_path) as db:
                data = all_data(db)
            body = json.dumps(data, ensure_ascii=False, indent=2).encode("utf-8")
            self.send_response(200)
            self.send_header("Content-Type", "application/json; charset=utf-8")
            self.send_header("Content-Disposition", 'attachment; filename="motor-alm-export.json"')
            self.send_header("Content-Length", str(len(body)))
            self.end_headers()
            return self.wfile.write(body)
        if path.startswith("/api/history/"):
            ident = path.removeprefix("/api/history/")
            with connect(self.db_path) as db:
                records = [{**dict(r), "snapshot": json.loads(r["snapshot"])} for r in
                           db.execute("SELECT revision,snapshot,changed_at FROM history WHERE item_id=? ORDER BY revision DESC", (ident,))]
            return self.send_json(records)
        if path == "/":
            path = "/index.html"
        if path not in ("/index.html", "/guide.html", "/app.js", "/style.css"):
            return self.send_error(404)
        file = HERE / "static" / path[1:]
        body = file.read_bytes()
        mime = "text/html" if path.endswith(".html") else "text/javascript" if path.endswith(".js") else "text/css"
        self.send_response(200)
        self.send_header("Content-Type", mime + "; charset=utf-8")
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def do_POST(self):
        self.mutate("POST")

    def do_PUT(self):
        self.mutate("PUT")

    def do_DELETE(self):
        self.mutate("DELETE")

    def mutate(self, method):
        try:
            path = unquote(urlparse(self.path).path)
            data = self.input() if method != "DELETE" else {}
            with connect(self.db_path) as db:
                if path == "/api/items" and method == "POST":
                    validate_item(data)
                    ident = create_id(db, data["process"], data["kind"])
                    stamp = now()
                    with db:
                        db.execute("INSERT INTO items VALUES (?,?,?,?,?,?,?,?,?,?,?,?)", (
                            ident, data["process"], data["kind"], data["title"].strip(), str(data.get("body", "")),
                            data.get("status", "Draft"), data.get("priority", "Must"), data.get("category", ""),
                            json.dumps(data.get("metadata", {}), ensure_ascii=False), 1, stamp, stamp))
                    write_snapshot(db)
                    return self.send_json({"id": ident}, 201)
                if path.startswith("/api/items/") and method == "PUT":
                    ident = path.removeprefix("/api/items/")
                    old = db.execute("SELECT * FROM items WHERE id=?", (ident,)).fetchone()
                    if not old:
                        return self.send_json({"error": "항목을 찾을 수 없습니다."}, 404)
                    validate_item(data, old)
                    if old["kind"] == "requirement" and old["process"] == "SYS.2" and data.get("status") == "Approved":
                        if not db.execute("SELECT 1 FROM links WHERE source=? AND relation='derived_from'", (ident,)).fetchone():
                            raise ValueError("SYS.2 승인 전 상위 이해관계자 요구와 연결하세요.")
                    revision = old["revision"] + 1
                    with db:
                        db.execute("INSERT INTO history(item_id,revision,snapshot,changed_at) VALUES (?,?,?,?)", (
                            ident, old["revision"], json.dumps(item_dict(old), ensure_ascii=False), now()))
                        db.execute("""UPDATE items SET title=?,body=?,status=?,priority=?,category=?,metadata=?,revision=?,updated_at=? WHERE id=?""", (
                            data["title"].strip(), str(data.get("body", "")), data.get("status", "Draft"),
                            data.get("priority", "Must"), data.get("category", ""),
                            json.dumps(data.get("metadata", {}), ensure_ascii=False), revision, now(), ident))
                    write_snapshot(db)
                    return self.send_json({"id": ident, "revision": revision})
                if path == "/api/links" and method == "POST":
                    source, target, relation = (str(data.get(k, "")).strip() for k in ("source", "target", "relation"))
                    if relation not in ("derived_from", "implements", "allocated_to", "verifies", "result_of", "related_to"):
                        raise ValueError("유효한 관계를 선택하세요.")
                    if source == target:
                        raise ValueError("자기 자신과 연결할 수 없습니다.")
                    with db:
                        db.execute("INSERT INTO links VALUES (?,?,?)", (source, relation, target))
                    write_snapshot(db)
                    return self.send_json({"ok": True}, 201)
                if path.startswith("/api/links/") and method == "DELETE":
                    parts = path.removeprefix("/api/links/").split("/")
                    if len(parts) != 3:
                        raise ValueError("관계 경로가 올바르지 않습니다.")
                    with db:
                        result = db.execute("DELETE FROM links WHERE source=? AND relation=? AND target=?", parts)
                    write_snapshot(db)
                    return self.send_json({"deleted": result.rowcount})
            return self.send_json({"error": "지원하지 않는 경로입니다."}, 404)
        except (ValueError, KeyError, json.JSONDecodeError) as exc:
            return self.send_json({"error": str(exc)}, 400)
        except sqlite3.IntegrityError as exc:
            return self.send_json({"error": "중복 링크 또는 존재하지 않는 항목입니다."}, 400)


def run():
    parser = argparse.ArgumentParser(description="Motor Controller ALM")
    parser.add_argument("--host", default="127.0.0.1")
    parser.add_argument("--port", type=int, default=8765)
    parser.add_argument("--db", type=Path, default=DEFAULT_DB)
    args = parser.parse_args()
    with connect(args.db) as db:
        initialize(db)
    Handler.db_path = args.db
    server = ThreadingHTTPServer((args.host, args.port), Handler)
    print(f"Motor ALM: http://{args.host}:{args.port}", flush=True)
    server.serve_forever()


if __name__ == "__main__":
    run()
