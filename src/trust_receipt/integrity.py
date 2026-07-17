"""Restricted deterministic JSON hashing for the reference implementation."""

from __future__ import annotations

from copy import deepcopy
import hashlib
import json
from typing import Any


CANONICALIZATION_PROFILE = "ei-canonical-json-no-floats-v0.1"
INTEGRITY_METHOD = "sha-256-digest-demo"


def _reject_floats(value: Any, path: str = "$") -> None:
    if isinstance(value, float):
        raise ValueError(f"Floating-point value is not permitted at {path}")
    if isinstance(value, dict):
        for key, child in value.items():
            _reject_floats(child, f"{path}.{key}")
    elif isinstance(value, list):
        for index, child in enumerate(value):
            _reject_floats(child, f"{path}[{index}]")


def canonical_bytes(value: Any) -> bytes:
    _reject_floats(value)
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
