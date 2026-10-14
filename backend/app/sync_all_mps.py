"""
Script to scrape all current 10th Parliament MPs from parliament.lk
and enrich with official photos, party, district, role, and public/media tracking.
"""
import requests
import re
import json
from pathlib import Path

HEADERS = {'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)'}
URL = 'https://www.parliament.lk/en/members-of-parliament/mp-listing?itemCount=250'

def scrape_parliament_mps():
    print("Fetching 10th Parliament MPs from parliament.lk...")
    r = requests.get(URL, headers=HEADERS, timeout=25)
    r.raise_for_status()

    # Pattern matching MP card
    # Matches: profile link, image, name, role (if present), party, district
    pattern = re.compile(
        r"<a\s+href='(?:https://www\.parliament\.lk)?/en/members-of-parliament/mp-profile/(\d+)'[^>]*>.*?"
        r"<img[^>]+src='([^']+)'.*?"
        r"<div class='mp_name_div'>\s*<p[^>]*><b>(.*?)</b></p>(?:\s*<p class='fst-italic'>(.*?)</p>)?\s*</div>.*?"
        r"<div class='mp_party_div[^']*'>\s*<p[^>]*><b>Political Party</b></p>\s*<p>(.*?)</p>\s*<p[^>]*><b>District</b></p>\s*<p[^>]*>(.*?)</p>",
        re.DOTALL | re.IGNORECASE
    )

    matches = pattern.findall(r.text)
    print(f"Parsed {len(matches)} MPs from official parliament.lk listing.")

    mps = []
    party_codes = {
        "Jathika Jana balawegaya": "NPP",
        "National People's Power": "NPP",
        "Samagi Jana Balawegaya": "SJB",
        "Illankai Tamil Arasu Kadchi": "ITAK",
        "Sri Lanka Podujana Peramuna": "SLPP",
        "United National Party": "UNP",
        "Sri Lanka Muslim Congress": "SLMC",
    }

    for mp_num, img_url, name, role, party, district in matches:
        clean_name = re.sub(r'<[^>]+>', '', name).strip()
        clean_role = re.sub(r'<[^>]+>', '', role).strip() if role else "Member of Parliament"
        clean_party = re.sub(r'<[^>]+>', '', party).strip()
        clean_district = re.sub(r'<[^>]+>', '', district).strip()
        
        # High-res photo URL (remove thumbs/)
        full_img_url = img_url.replace('/thumbs/', '/')

        code = party_codes.get(clean_party, clean_party[:4].upper())

        mps.append({
            "id": f"mp-{mp_num}",
            "official_mp_id": mp_num,
            "name": clean_name,
            "party": clean_party,
            "party_code": code,
            "district": clean_district,
            "current_role": clean_role,
            "avatar_url": full_img_url,
            "parliament_profile_url": f"https://www.parliament.lk/en/members-of-parliament/mp-profile/{mp_num}",
        })

    return mps

if __name__ == "__main__":
    mps = scrape_parliament_mps()
    print(f"Sample MP 1: {mps[0]}")
    print(f"Sample MP 2: {mps[1]}")
    
    out_path = Path("backend/app/data_mps_all.json")
    with open(out_path, "w", encoding="utf-8") as f:
        json.dump(mps, f, indent=2, ensure_ascii=False)
    print(f"Successfully saved {len(mps)} MPs to {out_path}")
