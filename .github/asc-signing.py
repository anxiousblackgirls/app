# Copyright (c) 2026 Anxious Black Girls, LLC. All rights reserved. See LICENSE.
# Sets up App Store signing on the GitHub Mac using the App Store Connect API key.
# 1. Makes a new private key and asks Apple for an Apple Distribution certificate.
#    If the team is at Apple's certificate limit, it revokes the oldest one this
#    process can replace (App Store and TestFlight builds already sent stay valid).
# 2. Makes a fresh App Store provisioning profile for com.anxiousblackgirls.app.
# 3. Writes signing.p12, the profile, and its UUID/name for the next build steps.
# Needs: KEY_ID, ISSUER, RUNNER_TEMP, and $RUNNER_TEMP/AuthKey.p8.
import base64, json, os, time, urllib.error, urllib.request
import jwt
from cryptography import x509
from cryptography.hazmat.primitives import hashes, serialization
from cryptography.hazmat.primitives.asymmetric import rsa
from cryptography.hazmat.primitives.serialization import pkcs12
from cryptography.x509.oid import NameOID

BUNDLE = "com.anxiousblackgirls.app"
PROFILE_NAME = "ABG App Store (GitHub builds)"
TMP = os.environ["RUNNER_TEMP"]
P12_PASS = os.environ.get("P12_PASS", "abg-ci")

key = open(os.path.join(TMP, "AuthKey.p8")).read()
token = jwt.encode(
    {"iss": os.environ["ISSUER"], "iat": int(time.time()), "exp": int(time.time()) + 1200, "aud": "appstoreconnect-v1"},
    key, algorithm="ES256", headers={"kid": os.environ["KEY_ID"]})


def api(method, path, body=None):
    req = urllib.request.Request(
        "https://api.appstoreconnect.apple.com" + path, method=method,
        data=json.dumps(body).encode() if body is not None else None,
        headers={"Authorization": "Bearer " + token, "Content-Type": "application/json"})
    try:
        with urllib.request.urlopen(req) as r:
            raw = r.read()
            return r.status, (json.loads(raw) if raw else {})
    except urllib.error.HTTPError as e:
        raw = e.read().decode()
        try:
            return e.code, json.loads(raw)
        except ValueError:
            return e.code, {"raw": raw}


def fail(msg):
    print("::error::" + msg[:600])
    raise SystemExit(1)


# 1. Certificate
pkey = rsa.generate_private_key(public_exponent=65537, key_size=2048)
csr = (x509.CertificateSigningRequestBuilder()
       .subject_name(x509.Name([x509.NameAttribute(NameOID.COMMON_NAME, "ABG GitHub builds"),
                                x509.NameAttribute(NameOID.COUNTRY_NAME, "US")]))
       .sign(pkey, hashes.SHA256()))
csr_pem = csr.public_bytes(serialization.Encoding.PEM).decode()
create = {"data": {"type": "certificates", "attributes": {"certificateType": "DISTRIBUTION", "csrContent": csr_pem}}}

status, res = api("POST", "/v1/certificates", create)
if status == 409:
    st, lst = api("GET", "/v1/certificates?filter[certificateType]=DISTRIBUTION,IOS_DISTRIBUTION&limit=50")
    certs = sorted(lst.get("data", []), key=lambda c: c["attributes"].get("expirationDate") or "")
    if not certs:
        fail("Apple refused a new certificate: " + json.dumps(res)[:400])
    old = certs[0]
    print("::notice::Certificate limit reached; revoking the oldest distribution certificate (%s, expires %s)." % (old["id"], old["attributes"].get("expirationDate")))
    api("DELETE", "/v1/certificates/" + old["id"])
    status, res = api("POST", "/v1/certificates", create)
if status not in (200, 201):
    fail("Apple refused a new certificate (HTTP %s): %s" % (status, json.dumps(res)[:400]))
cert_id = res["data"]["id"]
cert = x509.load_der_x509_certificate(base64.b64decode(res["data"]["attributes"]["certificateContent"]))
open(os.path.join(TMP, "signing.p12"), "wb").write(pkcs12.serialize_key_and_certificates(
    b"abg", pkey, cert, None,
    serialization.PrivateFormat.PKCS12.encryption_builder().kdf_rounds(50000)
    .key_cert_algorithm(pkcs12.PBES.PBESv1SHA1And3KeyTripleDESCBC).hmac_hash(hashes.SHA1())
    .build(P12_PASS.encode())))  # older format: macOS keychain can't read the newer default

# 2. Provisioning profile
st, ids = api("GET", "/v1/bundleIds?filter[identifier]=" + BUNDLE)
match = [b for b in ids.get("data", []) if b["attributes"]["identifier"] == BUNDLE]
if not match:
    fail("Bundle ID %s is not registered in the Apple Developer account." % BUNDLE)
bundle_id = match[0]["id"]

st, profs = api("GET", "/v1/profiles?filter[name]=" + urllib.request.quote(PROFILE_NAME) + "&limit=50")
for p in profs.get("data", []):
    api("DELETE", "/v1/profiles/" + p["id"])

status, res = api("POST", "/v1/profiles", {"data": {
    "type": "profiles",
    "attributes": {"name": PROFILE_NAME, "profileType": "IOS_APP_STORE"},
    "relationships": {
        "bundleId": {"data": {"type": "bundleIds", "id": bundle_id}},
        "certificates": {"data": [{"type": "certificates", "id": cert_id}]}}}})
if status not in (200, 201):
    fail("Apple refused the provisioning profile (HTTP %s): %s" % (status, json.dumps(res)[:400]))
attrs = res["data"]["attributes"]
uuid = attrs["uuid"]
open(os.path.join(TMP, "profile.mobileprovision"), "wb").write(base64.b64decode(attrs["profileContent"]))

with open(os.environ["GITHUB_OUTPUT"], "a") as out:
    out.write("profile_uuid=%s\nprofile_name=%s\n" % (uuid, PROFILE_NAME))
print("::notice::Signing ready: Apple Distribution certificate %s, profile %s." % (cert_id, uuid))
