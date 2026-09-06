"""Generate macaroon-vectors.json; pymacaroons is the oracle.

Usage: pip install pymacaroons && python gen_macaroon_vectors.py > macaroon-vectors.json

The third-party caveat uses a random nonce, so every run yields different
root/bound values; the tests read whatever the fixture contains.
"""
import base64, json, sys
from pymacaroons import Macaroon, Verifier

def b64(s): return base64.b64encode(s.encode()).decode()

root = Macaroon(location="", identifier="root-key-id-1234", key="root-secret-key-0000000000000000")
root.add_first_party_caveat("acl:package_access,package_manage,package_metrics")
root.add_first_party_caveat("expires:2027-09-06T00:00:00")
caveat_key = "third-party-caveat-key-abcdefghij"
root.add_third_party_caveat("login.ubuntu.com", caveat_key, "u1-caveat-id-5678")

discharge = Macaroon(location="login.ubuntu.com", identifier="u1-caveat-id-5678", key=caveat_key)
discharge.add_first_party_caveat("login.ubuntu.com|account|abc123")
discharge.add_first_party_caveat("login.ubuntu.com|valid_since|2026-09-06T12:00:00.000000")

bound = root.prepare_for_request(discharge)

# sanity: verifier accepts bound discharge
v = Verifier(); v.satisfy_general(lambda c: True)
assert v.verify(root, "root-secret-key-0000000000000000", discharge_macaroons=[bound])

r, d, b = root.serialize(), discharge.serialize(), bound.serialize()
creds_new = json.dumps({"t": "u1-macaroon", "v": {"r": r, "d": d}})
creds_legacy = json.dumps({"r": r, "d": d})
creds_ini = f"[login.ubuntu.com]\nmacaroon = {r}\nunbound_discharge = {d}\n\n"
out = {
    "root": r, "discharge": d, "bound_discharge": b,
    "root_signature_hex": root.signature, "discharge_signature_hex": discharge.signature,
    "bound_signature_hex": bound.signature,
    "authorization_header": f"Macaroon root={r}, discharge={b}",
    "exported_login_file": b64(creds_new),
    "exported_login_file_legacy_json": b64(creds_legacy),
    "exported_login_file_old_ini": creds_ini,
}
json.dump(out, sys.stdout, indent=2); print()
