from __future__ import annotations

from dataclasses import dataclass

import numpy as np
from numpy.typing import NDArray
from scipy.linalg import eig


@dataclass
class DeterminacyResult:
    stable: int
    unstable: int
    eigenvalues: NDArray[np.complex128]


def check_determinacy(g0: NDArray[np.float64], g1: NDArray[np.float64], div: float = 1.0000001) -> DeterminacyResult:
    eigvals = eig(g0, g1, right=False)
    unstable = int(np.sum(np.abs(eigvals) > div))
    stable = int(len(eigvals) - unstable)
    return DeterminacyResult(stable=stable, unstable=unstable, eigenvalues=eigvals)
