from __future__ import annotations

from typing import Any


class GensysNotImplementedError(RuntimeError):
    pass


def gensys(*_args: Any, **_kwargs: Any) -> Any:
    """
    Placeholder for Sims (2001) gensys solver.

    Expected signature:
    gensys(g0, g1, c, psi, pi, div=None) -> (G1, C, impact, eu)

    TODO: Implement with scipy.linalg.ordqz and determinacy checks.
    """
    raise GensysNotImplementedError(
        "gensys solver not implemented yet. "
        "Implement after full model transcription."
    )
