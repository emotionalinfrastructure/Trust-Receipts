"""Dependency-free validation for the schemas shipped with this package.

The validator implements the Draft 2020-12 keywords used by the reference
schemas. It is deliberately not presented as a general JSON Schema engine.
"""

from __future__ import annotations

from dataclasses import dataclass
from datetime import date, datetime
import json
from pathlib import Path
import re
from typing import Any
from urllib.parse import urlparse


@dataclass(frozen=True)
class ValidationIssue:
    path: str
    code: str
    message: str

    def as_dict(self) -> dict[str, str]:
        return {"path": self.path, "code": self.code, "message": self.message}


class ValidationFailure(ValueError):
    def __init__(self, issues: list[ValidationIssue]):
        self.issues = issues
        super().__init__("; ".join(f"{i.path}: {i.message}" for i in issues))


def load_json(path: str | Path) -> Any:
    with Path(path).open("r", encoding="utf-8") as handle:
        return json.load(handle)


def validate(instance: Any, schema: dict[str, Any]) -> list[ValidationIssue]:
    issues: list[ValidationIssue] = []
    _validate(instance, schema, schema, "$", issues)
    return issues


def require_valid(instance: Any, schema: dict[str, Any]) -> None:
    issues = validate(instance, schema)
    if issues:
        raise ValidationFailure(issues)


def _resolve_ref(root: dict[str, Any], ref: str) -> dict[str, Any]:
    if not ref.startswith("#/"):
        raise ValueError(f"Only local JSON Pointer references are supported: {ref}")
    value: Any = root
    for token in ref[2:].split("/"):
        token = token.replace("~1", "/").replace("~0", "~")
        value = value[token]
    return value


def _type_matches(value: Any, expected: str) -> bool:
    if expected == "null":
        return value is None
    if expected == "boolean":
        return type(value) is bool
    if expected == "integer":
        return type(value) is int
    if expected == "number":
        return type(value) in (int, float)
    if expected == "string":
        return isinstance(value, str)
    if expected == "array":
        return isinstance(value, list)
    if expected == "object":
        return isinstance(value, dict)
    return False


def _validate(
    value: Any,
    schema: dict[str, Any],
    root: dict[str, Any],
    path: str,
    issues: list[ValidationIssue],
) -> None:
    if "$ref" in schema:
        _validate(value, _resolve_ref(root, schema["$ref"]), root, path, issues)
        return

    if "const" in schema and value != schema["const"]:
        issues.append(ValidationIssue(path, "const", f"must equal {schema['const']!r}"))

    if "enum" in schema and value not in schema["enum"]:
        issues.append(ValidationIssue(path, "enum", f"must be one of {schema['enum']}"))

    expected = schema.get("type")
    if expected is not None:
        allowed = expected if isinstance(expected, list) else [expected]
        if not any(_type_matches(value, item) for item in allowed):
            issues.append(ValidationIssue(path, "type", f"must have type {allowed}"))
            return

    if isinstance(value, dict):
        required = schema.get("required", [])
        for name in required:
            if name not in value:
                issues.append(ValidationIssue(f"{path}.{name}", "required", "is required"))
        properties = schema.get("properties", {})
        if schema.get("additionalProperties") is False:
            for name in value:
                if name not in properties:
                    issues.append(ValidationIssue(f"{path}.{name}", "additionalProperties", "is not allowed"))
        for name, subschema in properties.items():
            if name in value:
                _validate(value[name], subschema, root, f"{path}.{name}", issues)

    if isinstance(value, list):
        if "minItems" in schema and len(value) < schema["minItems"]:
            issues.append(ValidationIssue(path, "minItems", f"must contain at least {schema['minItems']} items"))
        if "maxItems" in schema and len(value) > schema["maxItems"]:
            issues.append(ValidationIssue(path, "maxItems", f"must contain at most {schema['maxItems']} items"))
        if schema.get("uniqueItems"):
            keys = [json.dumps(item, sort_keys=True, separators=(",", ":")) for item in value]
            if len(keys) != len(set(keys)):
                issues.append(ValidationIssue(path, "uniqueItems", "must not contain duplicate items"))
        item_schema = schema.get("items")
        if isinstance(item_schema, dict):
            for index, item in enumerate(value):
                _validate(item, item_schema, root, f"{path}[{index}]", issues)

    if isinstance(value, str):
        if "minLength" in schema and len(value) < schema["minLength"]:
            issues.append(ValidationIssue(path, "minLength", f"must contain at least {schema['minLength']} characters"))
        if "maxLength" in schema and len(value) > schema["maxLength"]:
            issues.append(ValidationIssue(path, "maxLength", f"must contain at most {schema['maxLength']} characters"))
        if "pattern" in schema and re.search(schema["pattern"], value) is None:
            issues.append(ValidationIssue(path, "pattern", f"must match {schema['pattern']}"))
        if "format" in schema and not _format_valid(value, schema["format"]):
            issues.append(ValidationIssue(path, "format", f"must be a valid {schema['format']}"))

    if type(value) in (int, float):
        if "minimum" in schema and value < schema["minimum"]:
            issues.append(ValidationIssue(path, "minimum", f"must be at least {schema['minimum']}"))
        if "maximum" in schema and value > schema["maximum"]:
            issues.append(ValidationIssue(path, "maximum", f"must be at most {schema['maximum']}"))


def _format_valid(value: str, format_name: str) -> bool:
    try:
        if format_name == "date-time":
            parsed = datetime.fromisoformat(value.replace("Z", "+00:00"))
            return parsed.tzinfo is not None
        if format_name == "date":
            date.fromisoformat(value)
            return True
        if format_name == "uri":
            parsed = urlparse(value)
            return bool(parsed.scheme and (parsed.netloc or parsed.path))
    except ValueError:
        return False
    return True
