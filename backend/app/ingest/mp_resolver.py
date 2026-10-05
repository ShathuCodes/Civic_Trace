"""
Trilingual MP Entity Resolver for Sri Lankan Parliamentary and News Records.
Maps name variants, initials, honorifics, and Sinhala/Tamil transliterations
to stable, canonical MP identifiers (e.g. "mp-akd", "mp-sajith").
"""

import re
import unicodedata
from typing import Dict, List, Optional, Tuple


# Common parliamentary titles and honorifics in English, Sinhala, and Tamil
HONORIFICS = [
    # English
    r"\bhon\.?\b",
    r"\bhonourable\b",
    r"\bdr\.?\b",
    r"\bprof\.?\b",
    r"\bprofessor\b",
    r"\bpresident\b",
    r"\bprime minister\b",
    r"\bopposition leader\b",
    r"\bleader of the opposition\b",
    r"\bminister\b",
    r"\bmp\b",
    r"\bmember of parliament\b",
    r"\bpc\b",
    r"\bpresident's counsel\b",
    r"\bspeaker\b",
    # Sinhala
    r"ගරු",
    r"අතිගරු",
    r"ආචාර්ය",
    r"මහාචාර්ය",
    r"පාර්ලිමේන්තු මන්ත්‍රී",
    r"මන්ත්‍රීතුමා",
    r"මන්ත්‍රීවරයා",
    r"අග්‍රාමාත්‍ය",
    r"ජනාධිපති",
    r"විපක්ෂ නායක",
    r"කථානායක",
    # Tamil
    r"கௌரவ",
    r"அதிமேதகு",
    r"கலாநிதி",
    r"பேராசிரியர்",
    r"பாராளுமன்ற உறுப்பினர்",
    r"பிரதமர்",
    r"ஜனாதிபதி",
    r"எதிர்க்கட்சித் தலைவர்",
    r"சபாநாயகர்",
    r"அமைச்சர்",
]

_HONORIFIC_REGEX = re.compile("|".join(HONORIFICS), re.IGNORECASE)


def normalize_text(text: str) -> str:
    """Normalize unicode, strip punctuation, honorifics, and excess whitespace."""
    if not text:
        return ""
    text = unicodedata.normalize("NFKC", text)
    # Strip known honorific patterns
    text = _HONORIFIC_REGEX.sub(" ", text)
    # Remove standard punctuation except alphanumeric and unicode word characters
    text = re.sub(r"[^\w\s\u0D80-\u0DFF\u0B80-\u0BFF]", " ", text)
    # Collapse multiple whitespaces
    return " ".join(text.split()).casefold()


class MPResolver:
    """
    Resolves mentions of Sri Lankan politicians in English, Sinhala, and Tamil
    to canonical MP IDs.
    """

    def __init__(self, mps: Optional[List[dict]] = None):
        # Maps normalized alias string -> canonical mp_id
        self._alias_index: Dict[str, str] = {}
        # Stores primary metadata by mp_id
        self._mp_metadata: Dict[str, dict] = {}

        # Default built-in aliases for key Sri Lankan MPs
        self._register_default_aliases()

        # If a pool of MP models or dicts is passed, index them
        if mps:
            for mp in mps:
                self.register_mp(mp)

    def _register_default_aliases(self):
        """Seed high-frequency Sri Lankan MP name variants."""
        defaults = [
            (
                "mp-akd",
                "Anura Kumara Dissanayake",
                "අනුර කුමාර දිසානායක",
                "அநுர குமார திசாநாயக்க",
                ["anura kumara dissanayake", "anura dissanayake", "a k dissanayake", "akd",
                 "anura kumara", "anura", "president anura", "අනුර කුමාර දිසානායක", "අනුර කුමාර",
                 "අනුර දිසානායක", "அநுர குமார திசாநாயக்க", "அநுர குமார"],
            ),
            (
                "mp-sajith",
                "Sajith Premadasa",
                "සජිත් ප්‍රේමදාස",
                "சஜித் பிரேமதாச",
                ["sajith premadasa", "s premadasa", "sajith", "opposition leader sajith",
                 "සජිත් ප්‍රේමදාස", "සජිත්", "சஜித் பிரேமதாச", "சஜித்"],
            ),
            (
                "mp-harsha",
                "Dr. Harsha de Silva",
                "ආචාර්ය හර්ෂ ද සිල්වා",
                "கலாநிதி ஹர்ஷ டி சில்வா",
                ["harsha de silva", "harsha desilva", "h de silva", "dr harsha de silva",
                 "dr harsha", "harsha", "ආචාර්ය හර්ෂ ද සිල්වා", "හර්ෂ ද සිල්වා", "හර්ෂ",
                 "கலாநிதி ஹர்ஷ டி சில்வா", "ஹர்ஷ டி சில்வா"],
            ),
            (
                "mp-ranil",
                "Ranil Wickremesinghe",
                "රනිල් වික්‍රමසිංහ",
                "ரணில் விக்ரமசிங்க",
                ["ranil wickremesinghe", "ranil wickramasinghe", "r wickremesinghe", "ranil",
                 "former president ranil", "රනිල් වික්‍රමසිංහ", "රනිල්",
                 "ரணில் விக்ரமசிங்க", "ரணில்"],
            ),
            (
                "mp-alisabry",
                "Ali Sabry",
                "අලි සබ්‍රි",
                "அலி சப்ரி",
                ["ali sabry", "m u m ali sabry", "minister ali sabry",
                 "අලි සබ්‍රි", "அலி சப்ரி"],
            ),
            (
                "mp-sumanthiran",
                "M. A. Sumanthiran",
                "එම්. ඒ. සුමන්තිරන්",
                "எம். ஏ. சுமந்திரன்",
                ["m a sumanthiran", "mathiaparanan abraham sumanthiran", "ma sumanthiran",
                 "sumanthiran", "එම් ඒ සුමන්තිරන්", "සුමන්තිරන්", "எம் ஏ சுமந்திரன்", "சுமந்திரன்"],
            ),
        ]
        for mp_id, name_en, name_si, name_ta, aliases in defaults:
            self._mp_metadata[mp_id] = {
                "id": mp_id,
                "name": name_en,
                "sinhala_name": name_si,
                "tamil_name": name_ta,
            }
            for alias in aliases:
                norm = normalize_text(alias)
                if norm:
                    self._alias_index[norm] = mp_id

    def register_mp(self, mp: dict):
        """Register an MP dict or model and automatically index its names and common permutations."""
        mp_id = mp.get("id") or getattr(mp, "id", None)
        if not mp_id:
            return

        name_en = mp.get("name") or getattr(mp, "name", "")
        name_si = mp.get("sinhala_name") or getattr(mp, "sinhala_name", "")
        name_ta = mp.get("tamil_name") or getattr(mp, "tamil_name", "")

        self._mp_metadata[mp_id] = {
            "id": mp_id,
            "name": name_en,
            "sinhala_name": name_si,
            "tamil_name": name_ta,
        }

        # Index primary names
        for raw_name in (name_en, name_si, name_ta):
            if raw_name:
                norm = normalize_text(raw_name)
                if norm:
                    self._alias_index[norm] = mp_id

        # Generate initial variations for English names (e.g. "Anura Kumara Dissanayake" -> "A. K. Dissanayake")
        if name_en:
            tokens = name_en.split()
            if len(tokens) >= 2:
                # Last name only if long enough (> 4 chars)
                last_name = tokens[-1]
                # Initials + last name
                initials = " ".join([t[0] for t in tokens[:-1]] + [last_name])
                norm_init = normalize_text(initials)
                if norm_init:
                    self._alias_index[norm_init] = mp_id

    def resolve(self, text: str) -> Tuple[Optional[str], float, str]:
        """
        Resolve a string (speech speaker header, news quote attribution, etc.)
        to a canonical MP ID.
        Returns: (mp_id or None, confidence 0.0-1.0, matched_alias)
        """
        if not text:
            return None, 0.0, ""

        cleaned = normalize_text(text)
        if not cleaned:
            return None, 0.0, ""

        # 1. Exact match on normalized alias
        if cleaned in self._alias_index:
            return self._alias_index[cleaned], 1.0, cleaned

        # 2. Check if any registered alias is fully contained in cleaned text
        best_match_id = None
        longest_match_len = 0
        best_alias = ""

        for alias, mp_id in self._alias_index.items():
            if alias in cleaned:
                # Prefer longer, more specific matches (e.g. "anura kumara dissanayake" over "anura")
                if len(alias) > longest_match_len:
                    longest_match_len = len(alias)
                    best_match_id = mp_id
                    best_alias = alias

        if best_match_id and longest_match_len >= 4:
            confidence = min(0.95, round(longest_match_len / max(len(cleaned), 1), 2) + 0.3)
            return best_match_id, confidence, best_alias

        # 3. Token overlap check (Jaccard-like)
        cleaned_tokens = set(cleaned.split())
        best_token_score = 0.0
        best_token_mp = None
        best_token_alias = ""

        for alias, mp_id in self._alias_index.items():
            alias_tokens = set(alias.split())
            if not alias_tokens:
                continue
            intersection = cleaned_tokens & alias_tokens
            if intersection:
                score = len(intersection) / len(alias_tokens)
                if score > best_token_score and score >= 0.7:
                    best_token_score = score
                    best_token_mp = mp_id
                    best_token_alias = alias

        if best_token_mp:
            return best_token_mp, round(best_token_score * 0.85, 2), best_token_alias

        return None, 0.0, ""

    def get_mp(self, mp_id: str) -> Optional[dict]:
        """Retrieve indexed metadata for an MP."""
        return self._mp_metadata.get(mp_id)


_GLOBAL_RESOLVER = MPResolver()


def resolve_mp_speaker(text: str, mp_pool: Optional[List[dict]] = None) -> Optional[str]:
    """Convenience helper: resolve raw speaker text to canonical MP ID."""
    resolver = MPResolver(mp_pool) if mp_pool else _GLOBAL_RESOLVER
    mp_id, conf, _ = resolver.resolve(text)
    return mp_id if conf >= 0.7 else None
