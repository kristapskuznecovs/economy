from __future__ import annotations

from dataclasses import dataclass
from typing import Any

import numpy as np
from numpy.typing import NDArray

from lv_fiscal_dsge.gensys import gensys


@dataclass
class Solution:
    G1: Any
    C: Any
    impact: Any
    eu: tuple[int, int]


class UnsolvedModelError(RuntimeError):
    pass


def solve_linear_model(
    g0: NDArray[np.float64],
    g1: NDArray[np.float64],
    c: NDArray[np.float64] | None = None,
    psi: NDArray[np.float64] | None = None,
    pi: NDArray[np.float64] | None = None,
    div: float | None = None,
) -> Solution:
    G1, C, impact, eu = gensys(g0, g1, c, psi, pi, div=div)
    return Solution(G1=G1, C=C, impact=impact, eu=eu)
