"""
CivicTrace Ingestion, Entity Resolution, and Promise Matching Engine.
Designed for Sri Lankan Parliamentary Hansards and reliable public sources.
"""

from .mp_resolver import MPResolver, resolve_mp_speaker
from .hansard_parser import HansardParser, HansardTurn
from .promise_matcher import PromiseMatcher, MatchResult
from .normalizer import DataNormalizer, NormalizationReport

__all__ = [
    "MPResolver",
    "resolve_mp_speaker",
    "HansardParser",
    "HansardTurn",
    "PromiseMatcher",
    "MatchResult",
    "DataNormalizer",
    "NormalizationReport",
]
