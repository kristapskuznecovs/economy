from __future__ import annotations

from typing import Any

import numpy as np
from numpy.typing import NDArray
from scipy.linalg import ordqz


class GensysNotImplementedError(RuntimeError):
    pass


def gensys(
    g0: NDArray[np.float64],
    g1: NDArray[np.float64],
    c: NDArray[np.float64] | None,
    psi: NDArray[np.float64] | None,
    pi: NDArray[np.float64] | None,
    div: float | None = None,
) -> tuple[NDArray[np.float64], NDArray[np.float64], NDArray[np.float64], tuple[int, int]]:
    """
    Sims (2001) gensys solver.

    System: g0 * x_t = g1 * x_{t-1} + c + psi * eps_t + pi * eta_t
    Returns: (G1, C, impact, eu)
    """
    if div is None:
        div = 1.0000001

    g0 = np.atleast_2d(np.asarray(g0, dtype=float))
    g1 = np.atleast_2d(np.asarray(g1, dtype=float))
    n = g0.shape[0]

    if c is None:
        c = np.zeros((n, 1))
    c = np.atleast_2d(np.asarray(c, dtype=float))
    if c.shape[1] != 1:
        c = c.reshape((n, 1))

    if psi is None:
        psi = np.zeros((n, 0))
    psi = np.atleast_2d(np.asarray(psi, dtype=float))

    if pi is None:
        pi = np.zeros((n, 0))
    pi = np.atleast_2d(np.asarray(pi, dtype=float))

    def _select(alpha: np.ndarray, beta: np.ndarray) -> np.ndarray:
        alpha_arr = np.asarray(alpha)
        beta_arr = np.asarray(beta)
        with np.errstate(divide="ignore", invalid="ignore"):
            ratio = np.abs(
                np.divide(alpha_arr, beta_arr, out=np.full_like(alpha_arr, np.inf), where=beta_arr != 0)
            )
        return ratio < div

    s, t, alpha, beta, q, z = ordqz(g0, g1, sort=_select)
    eigval = alpha / beta
    nstable = int(np.sum(np.abs(eigval) < div))
    nunstable = n - nstable

    # Partition matrices (stable eigenvalues first)
    s11 = s[:nstable, :nstable]
    t11 = t[:nstable, :nstable]
    s12 = s[:nstable, nstable:]
    t12 = t[:nstable, nstable:]
    q1 = q[:nstable, :]
    q2 = q[nstable:, :]

    # Existence/uniqueness checks (Sims' rank conditions)
    eu_exist = 1
    eu_unique = 1
    if nunstable > 0:
        q2pi = q2 @ pi
        rank_q2pi = np.linalg.matrix_rank(q2pi) if q2pi.size else 0
        if rank_q2pi < nunstable:
            eu_exist = 0
            eu_unique = 0
        elif rank_q2pi > nunstable:
            eu_exist = 1
            eu_unique = 0
        else:
            eu_exist = 1
            eu_unique = 1 if q2pi.shape[1] == nunstable else 0

    if nstable == 0:
        G1 = np.zeros_like(g0)
        C = np.zeros_like(c)
        impact = np.zeros((n, psi.shape[1]))
        return G1, C, impact, (eu_exist, eu_unique)

    # Solve for stable block.
    s11_inv = np.linalg.inv(s11)
    Zinv = np.linalg.inv(z)

    G1_stable = s11_inv @ t11
    G1_block = np.block(
        [
            [G1_stable, s11_inv @ t12],
            [np.zeros((nunstable, nstable)), np.eye(nunstable)],
        ]
    )
    G1 = z @ G1_block @ Zinv

    c_block = np.vstack([s11_inv @ (q1 @ c), np.zeros((nunstable, 1))])
    psi_block = np.vstack([s11_inv @ (q1 @ psi), np.zeros((nunstable, psi.shape[1]))])
    C = z @ c_block
    impact = z @ psi_block

    return G1, C, impact, (eu_exist, eu_unique)
