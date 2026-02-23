from __future__ import annotations

from dataclasses import dataclass
from typing import Sequence

import numpy as np
from numpy.typing import NDArray


@dataclass
class IRFResult:
    horizon: int
    shocks: Sequence[str]
    variables: Sequence[str]
    responses: NDArray[np.float64]  # shape: (n_vars, horizon+1, n_shocks)


def compute_irfs(
    g1: NDArray[np.float64],
    impact: NDArray[np.float64],
    horizon: int,
    shock_sizes: NDArray[np.float64] | None = None,
) -> NDArray[np.float64]:
    n_vars, n_shocks = impact.shape
    if shock_sizes is None:
        shock_sizes = np.ones((n_shocks,))
    shock_sizes = np.asarray(shock_sizes, dtype=float).reshape((n_shocks,))
    responses = np.zeros((n_vars, horizon + 1, n_shocks))

    for j in range(n_shocks):
        responses[:, 0, j] = impact[:, j] * shock_sizes[j]
        for t in range(1, horizon + 1):
            responses[:, t, j] = g1 @ responses[:, t - 1, j]

    return responses
