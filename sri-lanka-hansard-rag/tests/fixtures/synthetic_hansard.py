"""Synthetic trilingual Hansard fixtures for testing."""

SYNTHETIC_SINHALA_TEXT = """ගරු කථානායකතුමා:
අද දින පාර්ලිමේන්තු කටයුතු ආරම්භ කරමු. ධීවර ප්‍රජාව මුහුණ දෙන ගැටලු පිළිබඳව විශේෂ ප්‍රකාශයක් කිරීමට මම ගරු අමාත්‍යතුමාට ආරාධනා කරනවා.

ගරු ධීවර අමාත්‍යතුමා:
ගරු කථානායකතුමනි, උතුරු සහ නැගෙනහිර පළාත්වල ධීවරයින් සඳහා නව සහනාධාර වැඩපිළිවෙළක් ලබන මස සිට ක්‍රියාත්මක කිරීමට රජය තීරණය කර තිබෙනවා.
"""

SYNTHETIC_TAMIL_TEXT = """கௌரவ சபாநாயகர்:
இன்றைய பாராளுமன்ற அமர்வை ஆரம்பிக்கின்றோம். வடக்கு மற்றும் கிழக்கு மாகாண மீனவர்களின் வாழ்வாதார பிரச்சினைகள் குறித்து கௌரவ அமைச்சர் அவர்கள் விளக்கம் அளிப்பார்.

கௌரவ கடற்றொழில் அமைச்சர்:
கௌரவ சபாநாயகர் அவர்களே, மீனவர்களுக்கான புதிய எரிபொருள் மானியம் மற்றும் படகு பாதுகாப்பு உபகரணங்கள் அடுத்த மாதம் முதல் பகிர்ந்தளிக்கப்படும் என்பதை மகிழ்ச்சியுடன் தெரிவித்துக் கொள்கிறேன்.
"""

SYNTHETIC_ENGLISH_TEXT = """The Speaker:
Honourable Members, we now proceed to the Questions for Oral Answers. Question No. 1 standing in the name of the Member for Jaffna.

The Hon. Minister of Fisheries:
Mr. Speaker, the Ministry has allocated 500 million rupees for the modernization of fishing harbours in Galle, Trincomalee, and Point Pedro.
"""

SYNTHETIC_MIXED_PAGE = f"""PARLIAMENTARY DEBATES
OFFICIAL REPORT
Wednesday, 23rd September, 2026
[Cols. 1815-1816]

{SYNTHETIC_SINHALA_TEXT}

{SYNTHETIC_TAMIL_TEXT}

{SYNTHETIC_ENGLISH_TEXT}

1816
"""
