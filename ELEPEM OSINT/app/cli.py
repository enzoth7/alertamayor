import argparse
from datetime import datetime
from pathlib import Path

import uvicorn

from app.config import get_settings
from app.db import SessionLocal
from app.enums import ImportFormat
from app.importers.official import import_official_registry
from app.services.exports import export_csv, export_json


def _datetime(value: str) -> datetime:
    try:
        return datetime.fromisoformat(value.replace("Z", "+00:00"))
    except ValueError as exc:
        raise argparse.ArgumentTypeError("expected ISO-8601 date/time") from exc


def _serve(_: argparse.Namespace) -> None:
    settings = get_settings()
    uvicorn.run(
        "app.main:app",
        host=settings.app_host,
        port=settings.app_port,
        log_level=settings.log_level.lower(),
    )


def _import_registry(args: argparse.Namespace) -> None:
    path = Path(args.file).resolve(strict=True)
    data = path.read_bytes()
    with SessionLocal() as session:
        imported = import_official_registry(
            session,
            data=data,
            source_filename=path.name,
            source_format=ImportFormat(args.format),
            source_url=args.source_url,
            retrieved_at=args.retrieved_at,
            actor=args.actor,
        )
    print(f"Imported {imported.row_count} records as batch {imported.id}")


def _export(args: argparse.Namespace) -> None:
    output = Path(args.output).resolve()
    with SessionLocal() as session:
        data = (
            export_json(session, actor=args.actor)
            if args.format == "json"
            else export_csv(session, actor=args.actor)
        )
    output.write_bytes(data)
    print(f"Wrote private review export to {output}")


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(prog="alerta-mayor")
    subparsers = parser.add_subparsers(dest="command", required=True)
    serve = subparsers.add_parser("serve", help="run the local FastAPI server")
    serve.set_defaults(handler=_serve)

    importer = subparsers.add_parser("import-registry", help="import an official snapshot")
    importer.add_argument("file")
    importer.add_argument("--format", required=True, choices=[item.value for item in ImportFormat])
    importer.add_argument("--source-url", required=True)
    importer.add_argument("--retrieved-at", required=True, type=_datetime)
    importer.add_argument("--actor", default="local-operator")
    importer.set_defaults(handler=_import_registry)

    exporter = subparsers.add_parser("export", help="write a private review export")
    exporter.add_argument("--format", choices=("csv", "json"), required=True)
    exporter.add_argument("--output", required=True)
    exporter.add_argument("--actor", default="local-operator")
    exporter.set_defaults(handler=_export)
    return parser


def main() -> None:
    args = build_parser().parse_args()
    args.handler(args)


if __name__ == "__main__":
    main()
