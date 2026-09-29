/* ------------------------------------------------------------------ *
 *  Every connection to the database is encrypted AND checks it is
 *  talking to Supabase.
 *
 *  `pg` sends everything in plaintext unless it is handed `ssl`, and the
 *  connection strings pasted from Supabase ask for none. Until 2026-09-30
 *  the app's own connection was a plain socket (bug audit 3, O-07,
 *  proved live: `encrypted=false`): every query and every member's row
 *  crossed the network readable.
 *
 *  Supabase's pooler presents a certificate signed by Supabase's OWN root,
 *  which no operating system trusts, so "verify" needs that root pinned
 *  here. It was fetched from Supabase's published download
 *  (supabase-downloads.s3-ap-southeast-1.amazonaws.com/prod/ssl/
 *  prod-ca-2021.crt) and matched against the root the pooler itself
 *  presents: SHA-256 80:70:25:AD:50:D4:ED:21:9D:2C:9C:7D:29:9C:00:4F:
 *  82:4E:B0:0C:F7:F6:5A:FE:F6:07:D0:7B:72:E6:CA:FA, valid until
 *  2031-04-26. When Supabase rotates it, connections fail loudly with
 *  SELF_SIGNED_CERT_IN_CHAIN rather than quietly going unverified.
 *
 *  Plain TypeScript with no imports and no `@/` alias, so the CI scripts
 *  (scripts/ops, run by bare Node, which strips the types) share this one
 *  copy with the app.
 * ------------------------------------------------------------------ */

export const SUPABASE_ROOT_CA_2021 = `-----BEGIN CERTIFICATE-----
MIIDxDCCAqygAwIBAgIUbLxMod62P2ktCiAkxnKJwtE9VPYwDQYJKoZIhvcNAQEL
BQAwazELMAkGA1UEBhMCVVMxEDAOBgNVBAgMB0RlbHdhcmUxEzARBgNVBAcMCk5l
dyBDYXN0bGUxFTATBgNVBAoMDFN1cGFiYXNlIEluYzEeMBwGA1UEAwwVU3VwYWJh
c2UgUm9vdCAyMDIxIENBMB4XDTIxMDQyODEwNTY1M1oXDTMxMDQyNjEwNTY1M1ow
azELMAkGA1UEBhMCVVMxEDAOBgNVBAgMB0RlbHdhcmUxEzARBgNVBAcMCk5ldyBD
YXN0bGUxFTATBgNVBAoMDFN1cGFiYXNlIEluYzEeMBwGA1UEAwwVU3VwYWJhc2Ug
Um9vdCAyMDIxIENBMIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEAqQXW
QyHOB+qR2GJobCq/CBmQ40G0oDmCC3mzVnn8sv4XNeWtE5XcEL0uVih7Jo4Dkx1Q
DmGHBH1zDfgs2qXiLb6xpw/CKQPypZW1JssOTMIfQppNQ87K75Ya0p25Y3ePS2t2
GtvHxNjUV6kjOZjEn2yWEcBdpOVCUYBVFBNMB4YBHkNRDa/+S4uywAoaTWnCJLUi
cvTlHmMw6xSQQn1UfRQHk50DMCEJ7Cy1RxrZJrkXXRP3LqQL2ijJ6F4yMfh+Gyb4
O4XajoVj/+R4GwywKYrrS8PrSNtwxr5StlQO8zIQUSMiq26wM8mgELFlS/32Uclt
NaQ1xBRizkzpZct9DwIDAQABo2AwXjALBgNVHQ8EBAMCAQYwHQYDVR0OBBYEFKjX
uXY32CztkhImng4yJNUtaUYsMB8GA1UdIwQYMBaAFKjXuXY32CztkhImng4yJNUt
aUYsMA8GA1UdEwEB/wQFMAMBAf8wDQYJKoZIhvcNAQELBQADggEBAB8spzNn+4VU
tVxbdMaX+39Z50sc7uATmus16jmmHjhIHz+l/9GlJ5KqAMOx26mPZgfzG7oneL2b
VW+WgYUkTT3XEPFWnTp2RJwQao8/tYPXWEJDc0WVQHrpmnWOFKU/d3MqBgBm5y+6
jB81TU/RG2rVerPDWP+1MMcNNy0491CTL5XQZ7JfDJJ9CCmXSdtTl4uUQnSuv/Qx
Cea13BX2ZgJc7Au30vihLhub52De4P/4gonKsNHYdbWjg7OWKwNv/zitGDVDB9Y2
CMTyZKG3XEu5Ghl1LEnI3QmEKsqaCLv12BnVjbkSeZsMnevJPs1Ye6TjjJwdik5P
o/bKiIz+Fq8=
-----END CERTIFICATE-----`;

/* SSL settings in the connection string itself would OVERRIDE the `ssl`
   object (pg merges the parsed string over its config), and `sslmode=require`
   in current pg means "verify against the system's roots", which refuses
   Supabase's certificate. So they are removed, and this module is the one
   place that decides. */
const SSL_PARAMS = ["sslmode", "sslrootcert", "sslcert", "sslkey", "sslcrl", "uselibpqcompat", "ssl"];

export function withDatabaseTls(connectionString: string): {
  connectionString: string;
  ssl: { ca: string; rejectUnauthorized: true };
} {
  let cs = connectionString;
  if (SSL_PARAMS.some((p) => new RegExp(`[?&]${p}=`, "i").test(cs))) {
    const url = new URL(cs);
    for (const p of [...url.searchParams.keys()]) {
      if (SSL_PARAMS.includes(p.toLowerCase())) url.searchParams.delete(p);
    }
    cs = url.toString();
  }
  return { connectionString: cs, ssl: { ca: SUPABASE_ROOT_CA_2021, rejectUnauthorized: true } };
}
