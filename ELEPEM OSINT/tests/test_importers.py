import io
import json

from openpyxl import Workbook

from app.enums import ImportFormat, OfficialStatus
from app.importers.official import map_official_rows, parse_structured_rows


def test_csv_import_and_spanish_mapping() -> None:
    data = (
        "Nombre;Estado;Dirección;Teléfono;Latitud;Longitud\n"
        "Residencial Ejemplo;Habilitado;Av. Italia 123;29001234;-34,90;-56,16\n"
    ).encode()
    rows = parse_structured_rows(data, ImportFormat.CSV)
    mapped = map_official_rows(rows)
    assert mapped[0].business_name == "Residencial Ejemplo"
    assert mapped[0].official_status is OfficialStatus.HABILITATED
    assert mapped[0].latitude == -34.9


def test_pdf_derived_json_is_structured_not_raw_pdf() -> None:
    data = json.dumps({"records": [{"nombre": "Hogar Uno", "estado": "En trámite"}]}).encode()
    rows = parse_structured_rows(data, ImportFormat.PDF_DERIVED_JSON)
    mapped = map_official_rows(rows)
    assert mapped[0].official_status is OfficialStatus.IN_PROCESS


def test_negative_official_status_is_not_misread_as_habilitated() -> None:
    mapped = map_official_rows([{"nombre": "Hogar Tres", "estado": "No habilitado"}])
    assert mapped[0].official_status is OfficialStatus.OTHER


def test_xlsx_import() -> None:
    workbook = Workbook()
    sheet = workbook.active
    sheet.append(["Nombre", "Estado", "Departamento"])
    sheet.append(["Hogar Dos", "Habilitado", "Montevideo"])
    stream = io.BytesIO()
    workbook.save(stream)
    rows = parse_structured_rows(stream.getvalue(), ImportFormat.XLSX)
    mapped = map_official_rows(rows)
    assert mapped[0].department == "Montevideo"
