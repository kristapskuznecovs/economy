from __future__ import annotations

from dataclasses import dataclass
from typing import Any


@dataclass
class Solution:
    G1: Any
    C: Any
    impact: Any
    eu: tuple[int, int]


class UnsolvedModelError(RuntimeError):
    pass


def solve_linear_model(*_args: Any, **_kwargs: Any) -> Solution:
    raise UnsolvedModelError(
        "Model solver not implemented yet. "
        "Next step: transcribe full equations and build linearization."
    )
