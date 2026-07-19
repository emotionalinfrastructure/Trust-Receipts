"""Restricted deterministic JSON hashing for the reference implementation."""

from __future__ import annotations

from copy import deepcopy
import hashlib
import json
from typing import Any


CANONICALIZATION_PROFILE = "ei-canonical-json-no-floats-v0.1"
INTEGRITY_METHOD = "sha-256-digest-demo"
MAX_SAFE_INTEGER = (2**53) - 1


def _reject_unsupported_values(value: Any, path: str = "$") -> None:
    if value is None or type(value) is bool:
        return
    if isinstance(value, float):
        raise ValueError(f"Floating-point value is not permitted at {path}")
    if type(value) is int:
        if abs(value) > MAX_SAFE_INTEGER:
            raise ValueError(f"Integer outside the cross-runtime safe range at {path}")
        return
    if isinstance(value, str):
        try:
            value.encode("utf-8", errors="strict")
        except UnicodeEncodeError as exc:
            raise ValueError(f"Unpaired Unicode surrogate is not permitted at {path}") from exc
        return
    if isinstance(value, dict):
        for key, child in value.items():
            if not isinstance(key, str):
                raise ValueError(f"Object key must be a string at {path}")
            _reject_unsupported_values(key, f"{path}.<key>")
            _reject_unsupported_values(child, f"{path}.{key}")
        return
    if isinstance(value, list):
        for index, child in enumerate(value):
            _reject_unsupported_values(child, f"{path}[{index}]")
        return
    raise ValueError(f"Unsupported JSON value at {path}: {type(value).__name__}")


def canonical_bytes(value: Any) -> bytes:
    _reject_unsupported_values(value)
    return json.dumps(
        value,
        ensure_ascii=False,
        allow_nan=False,
        sort_keys=True,
        separators=(",", ":"),
    ).encode("utf-8")


def integrity_payload(receipt: dict[str, Any]) -> dict[str, Any]:
    payload = deepcopy(receipt)
    integrity = payload.setdefault("integrity", {})
    integrity["method"] = integrity.get("method", INTEGRITY_METHOD)
    integrity["canonicalization_profile"] = integrity.get(
        "canonicalization_profile", CANONICALIZATION_PROFILE
    )
    integrity.pop("digest", None)
    return payload


def compute_digest(receipt: dict[str, Any]) -> str:
    value = hashlib.sha256(canonical_bytes(integrity_payload(receipt))).hexdigest()
    return f"sha256:{value}"


def add_digest(receipt: dict[str, Any]) -> dict[str, Any]:
    result = deepcopy(receipt)
    result["integrity"] = {
        "method": INTEGRITY_METHOD,
        "digest": "sha256:" + ("0" * 64),
        "canonicalization_profile": CANONICALIZATION_PROFILE,
        "verification_status": "unverified",
    }
    result["integrity"]["digest"] = compute_digest(result)
    return result


def verify_digest(receipt: dict[str, Any]) -> bool:
    integrity = receipt.get("integrity", {})
    if integrity.get("method") != INTEGRITY_METHOD:
        return False
    if integrity.get("canonicalization_profile") != CANONICALIZATION_PROFILE:
        return False
    supplied = integrity.get("digest")
    return isinstance(supplied, str) and supplied == compute_digest(receipt)
