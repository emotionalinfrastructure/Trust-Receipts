"""Reference implementation for the AI Trust Receipt candidate specification."""

from .engine import assess_conformance, evaluate_gate
from .integrity import add_digest, verify_digest
from .pipeline import create_receipt

__all__ = [
    "add_digest",
    "assess_conformance",
    "create_receipt",
    "evaluate_gate",
    "verify_digest",
]

__version__ = "0.1.1"
