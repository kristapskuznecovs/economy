"""FastAPI dependencies for dependency injection."""

from ....adapters.outbound.external import PolicyParser
from ....adapters.outbound.external.budget_open_data import BudgetOpenDataClient
from ....adapters.outbound.persistence import InMemorySimulationRepository
from ....application.handlers import SimulationCommandHandler, SimulationQueryHandler
from ....domain.services.dsge_simulation_engine import DSGESimulationEngine

# Global instances (MVP - will be replaced with proper DI container in v1)
_simulation_repository = InMemorySimulationRepository()
_simulation_engine = DSGESimulationEngine()  # Now using real DSGE model!
_command_handler = SimulationCommandHandler(_simulation_repository, _simulation_engine)
_query_handler = SimulationQueryHandler(_simulation_repository)
_policy_parser = PolicyParser()
_budget_open_data_client = BudgetOpenDataClient()


def get_command_handler() -> SimulationCommandHandler:
    """Get command handler instance."""
    return _command_handler


def get_query_handler() -> SimulationQueryHandler:
    """Get query handler instance."""
    return _query_handler


def get_policy_parser() -> PolicyParser:
    """Get policy parser instance."""
    return _policy_parser


def get_budget_open_data_client() -> BudgetOpenDataClient:
    """Get open data budget client instance."""
    return _budget_open_data_client
