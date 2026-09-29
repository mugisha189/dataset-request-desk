"""Operational CLI: seed demo users and import episode CSVs.

    python cli.py seed-users seed/users.json
    python cli.py import-episodes seed/episodes.csv
"""

import json

import typer

from app.database import SessionLocal
from app.models import Role, User
from app.security import hash_password
from app.services.import_episodes import import_episodes_csv

cli = typer.Typer()


@cli.command("seed-users")
def seed_users(path: str = typer.Argument("seed/users.json")):
    with open(path) as f:
        users = json.load(f)

    db = SessionLocal()
    try:
        created, skipped = 0, 0
        for u in users:
            email = u["email"].lower()
            if db.query(User).filter(User.email == email).first():
                skipped += 1
                continue
            db.add(
                User(
                    email=email,
                    name=u["name"],
                    organisation=u.get("organisation"),
                    role=Role(u["role"]),
                    hashed_password=hash_password(u["password"]),
                )
            )
            created += 1
        db.commit()
        typer.echo(f"seed-users: created={created} skipped(existing)={skipped}")
    finally:
        db.close()


@cli.command("import-episodes")
def import_episodes(path: str = typer.Argument(...)):
    with open(path, encoding="utf-8-sig") as f:
        content = f.read()

    db = SessionLocal()
    try:
        batch = import_episodes_csv(db, content, path, imported_by_id=None)
        db.commit()
        typer.echo(
            f"import-episodes: total_rows={batch.total_rows} imported={batch.imported_count} "
            f"skipped={batch.skipped_count} duplicates={batch.duplicate_count}"
        )
        details = json.loads(batch.report)
        for d in details[:50]:
            typer.echo(f"  row {d['row_number']}: {d['outcome']} {d.get('episode_id') or ''} - {d.get('reason') or ''}")
        if len(details) > 50:
            typer.echo(f"  ... and {len(details) - 50} more (see import_batches.report in the database)")
    finally:
        db.close()


if __name__ == "__main__":
    cli()
