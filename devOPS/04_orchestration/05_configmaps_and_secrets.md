# ConfigMaps & Secrets

Socho tumne apna Node.js app Docker image mein bana diya — but us image ke andar `DATABASE_HOST`, `LOG_LEVEL`, `API_URL` jaisi values hardcode kar di. Ab kal ko staging environment mein deploy karna hai jahan database ka host alag hai, production mein alag. Kya karoge? Image dobara build karoge sirf ek config value badalne ke liye? Bilkul nahi — yeh bahut hi bekar approach hai.

Yahi problem solve karne ke liye Kubernetes deta hai **ConfigMaps** aur **Secrets**. Dono ka kaam ek hi hai — configuration ko application code se **alag** rakhna — bas fark itna hai ki ek non-sensitive data ke liye hai aur doosra sensitive data (password, tokens, keys) ke liye.

Socho isko Zomato ke restaurant onboarding jaisa — restaurant ka menu (config) publicly dikh sakta hai, but restaurant ka bank account number ya UPI PIN (secret) kabhi bhi publicly nahi dikhega. Dono hi restaurant ke "settings" hain, lekin unko handle karne ka tareeka alag hona chahiye.

> [!info]
> **12-Factor App** methodology ka teesra principle yehi kehta hai — "Store config in the environment". Matlab config kabhi bhi code ke andar hardcode nahi hona chahiye, balki environment ke through inject hona chahiye. ConfigMaps aur Secrets Kubernetes mein isi principle ko implement karne ka tareeka hain.

---

## ConfigMaps

### Kya hota hai ConfigMap?

ConfigMap ek Kubernetes object hai jisme tum apni **non-sensitive** configuration data ko key-value pairs ki form mein store karte ho — jaise `LOG_LEVEL`, `API_URL`, database ka hostname, ya poora ka poora ek config file (`config.yaml`, `nginx.conf` etc). Yeh data phir pod ke andar **environment variable** ki tarah ya **file** ki tarah mount ho sakta hai.

### Kyun zaruri hai?

Bina ConfigMap ke, agar tumhe config change karni ho, toh tumhe:
1. Docker image dobara build karni padegi (naya config baked in karke)
2. Registry pe push karni padegi
3. Sabhi pods ko restart/redeploy karna padega

Yeh process slow bhi hai aur risky bhi — production mein ek chhoti si config change ke liye pura CI/CD pipeline chalana padega. ConfigMap ke saath tum sirf ConfigMap update karte ho aur pods ko restart karte ho (ya kuch cases mein automatically pick ho jaata hai) — image touch tak nahi karni padti.

Ek IRCTC jaisa example lo — agar unhe tatkal booking window ka time (`TATKAL_OPEN_TIME: "10:00"`) change karna ho, toh unhe poori booking service ka Docker image rebuild nahi karna chahiye. Bas ek ConfigMap value change karo, service restart karo, done.

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: app-config
data:
  LOG_LEVEL: info
  DATABASE_HOST: postgres.default.svc
  API_URL: https://api.example.com
  config.yaml: |
    server:
      port: 3000
      workers: 4
```

Yahan gaur karo — `data` field ke andar tum simple key-value bhi rakh sakte ho (`LOG_LEVEL: info`) aur poori ki poori multi-line file bhi (`config.yaml: |`) — matlab ConfigMap sirf environment variables ke liye nahi, poore config files store karne ke liye bhi use hota hai.

### Pod mein ConfigMap Use Karna

ConfigMap se data lene ke do main tareeke hain:

1. **Environment variable ki tarah** — single key-value pick karna
2. **Volume mount ki tarah** — poori file ko container ke andar ek path pe mount karna

```yaml
apiVersion: v1
kind: Pod
metadata:
  name: myapp
spec:
  containers:
  - name: app
    image: myapp
    env:
    - name: LOG_LEVEL
      valueFrom:
        configMapKeyRef:
          name: app-config
          key: LOG_LEVEL
    volumeMounts:
    - name: config
      mountPath: /etc/config
  volumes:
  - name: config
    configMap:
      name: app-config
```

Is example mein do cheezein ho rahi hain saath saath:
- `env` block mein `LOG_LEVEL` environment variable ban raha hai, jiski value ConfigMap ke `LOG_LEVEL` key se aa rahi hai
- `volumes` + `volumeMounts` block se poora ConfigMap `/etc/config` directory ke andar files ki tarah mount ho jaata hai — matlab `/etc/config/LOG_LEVEL`, `/etc/config/DATABASE_HOST`, `/etc/config/config.yaml` — sab alag-alag files ban jayengi container ke andar

> [!tip]
> Agar tumhare paas ek poori config file hai (jaise `nginx.conf` ya `application.properties`), toh usko volume mount karna better hai — tumhara application code file read karega jaise normal filesystem se karta hai, use environment variable parsing ki tension nahi. Agar sirf chhoti-chhoti individual values hain toh environment variable approach clean rehti hai.

### CLI Usage

Kabhi-kabhi tumhe YAML likhne ka mann nahi karta — direct CLI se bhi ConfigMap bana sakte ho:

```bash
# File se banao
kubectl create configmap app-config --from-file=config.yaml

# Key-value se banao
kubectl create configmap app-config \
  --from-literal=LOG_LEVEL=info \
  --from-literal=DATABASE_HOST=db.default
```

`--from-file` poori file ko ek key bana deta hai (key ka naam filename hota hai by default), jabki `--from-literal` seedhe key-value pair specify karne deta hai — quick testing ya scripts mein kaafi kaam aata hai.

> [!warning]
> ConfigMap update karne ke baad, jo pods pehle se running hain unke environment variables **automatically refresh nahi hote** — env vars sirf pod start hone ke time inject hote hain. Volume-mounted ConfigMaps thoda better hain — kuch der (kubelet sync period, ~1 minute) mein file content update ho jaata hai bina pod restart kiye. Lekin agar tumhara application file changes ko dynamically re-read nahi karta, toh pod restart karna hi safest option hai.

---

## Secrets

### Kya hota hai Secret?

Secret bhi ConfigMap jaisa hi object hai — same structure, same usage pattern — bas iska use case hai **sensitive data**: database passwords, API keys, TLS certificates, private keys, tokens waghera.

Zomato ke example ko aage badhate hain — ConfigMap restaurant ka public menu hai, Secret uska payment gateway ka secret key hai jo Razorpay/PayU ko backend se call karne ke liye chahiye. Yeh kabhi bhi kisi bhi log file, kisi bhi dashboard, kisi bhi git repo mein publicly nahi dikhna chahiye.

```yaml
apiVersion: v1
kind: Secret
metadata:
  name: app-secrets
type: Opaque
stringData:
  DATABASE_PASSWORD: secret123
  API_KEY: sk_live_xyz
  PRIVATE_KEY: |
    -----BEGIN PRIVATE KEY-----
    ...
    -----END PRIVATE KEY-----
```

`type: Opaque` ka matlab hai "generic secret" — Kubernetes mein aur bhi types hote hain jaise `kubernetes.io/tls` (TLS certs ke liye), `kubernetes.io/dockerconfigjson` (private registry credentials ke liye), etc, lekin `Opaque` sabse common hai jab tumhe apni khud ki custom sensitive data store karni ho.

Gaur karo — humne yahan `stringData` use kiya hai (base64-encoded `data` nahi). `stringData` mein tum plain text likh sakte ho aur Kubernetes khud usko base64 mein convert karke store kar leta hai — likhne mein aasan hai. `data` field mein tumhe khud base64-encode karke value daalni padti hai.

> [!warning]
> **Base64 encoding encryption NAHI hai!** Yeh sirf ek encoding format hai — koi bhi `echo "c2VjcmV0MTIz" | base64 -d` chala ke tumhara password decode kar sakta hai. Secret object ko "secret" isliye kaha jaata hai kyunki Kubernetes RBAC se access control kar sakta hai, aur etcd (jahan yeh store hota hai) mein encryption-at-rest enable kiya ja sakta hai — base64 khud koi security nahi deta. Yeh galatfehmi bahut common hai naye developers mein, isse door raho.

### Pod mein Secret Use Karna

Yeh bilkul ConfigMap jaisa hi pattern hai — bas `configMapKeyRef` ki jagah `secretKeyRef` aur `configMap` ki jagah `secret` use hota hai:

```yaml
apiVersion: v1
kind: Pod
metadata:
  name: myapp
spec:
  containers:
  - name: app
    image: myapp
    env:
    - name: DATABASE_PASSWORD
      valueFrom:
        secretKeyRef:
          name: app-secrets
          key: DATABASE_PASSWORD
    volumeMounts:
    - name: keys
      mountPath: /etc/keys
      readOnly: true
  volumes:
  - name: keys
    secret:
      secretName: app-secrets
      items:
      - key: PRIVATE_KEY
        path: private.key
```

Do cheezein alag se notice karo yahan:
- `DATABASE_PASSWORD` environment variable ki tarah inject ho raha hai — kaam ke liye aasan hai, lekin environment variables `kubectl describe pod`, crash logs, aur kabhi-kabhi child processes mein leak ho sakte hain
- `PRIVATE_KEY` ko **volume mount** ki tarah `readOnly: true` ke saath mount kiya hai — private keys jaise sensitive files ke liye yeh zyada safe pattern hai, kyunki file sirf container ke filesystem mein hi rehti hai, env var ki tarah expose nahi hoti

> [!tip]
> Jab bhi possible ho, credentials aur private keys ko **volume mount** karo, environment variable nahi. `items` field se tum yeh bhi control kar sakte ho ki Secret ka koi specific key hi mount ho (poora secret nahi) — jaise upar sirf `PRIVATE_KEY` ko `private.key` naam ki file bana ke mount kiya.

### CLI Usage

```bash
# Literal se banao
kubectl create secret generic app-secrets \
  --from-literal=DATABASE_PASSWORD=secret123

# File se banao
kubectl create secret generic app-secrets \
  --from-file=./private.key

# Secret dekho (base64 encoded milega)
kubectl get secret app-secrets -o yaml

# Decode karo
kubectl get secret app-secrets -o jsonpath='{.data.DATABASE_PASSWORD}' | base64 -d
```

Yeh last command bahut important hai samajhna — `kubectl get secret -o yaml` chalane se tumhe values base64-encoded milengi (jaise `c2VjcmV0MTIz`), plaintext nahi. Lekin jaisa upar bataya, base64 decode karna trivial hai — isliye kabhi yeh mat sochna ki "secret" object apne aap secure hai bina RBAC aur encryption-at-rest configure kiye.

---

## Best Practices

- **ConfigMaps** configuration ke liye, **Secrets** sensitive data ke liye — dono ko kabhi mix mat karo. Agar koi doubt ho ki "yeh sensitive hai ya nahi", toh Secret hi use karo (safer default)
- **Secrets ko kabhi git mein commit mat karo** — CRED app jaisa socho, jahan credit card ka CVV kabhi bhi database mein plaintext store nahi hota, waise hi tumhare secrets kabhi bhi git history mein plaintext nahi jaane chahiye. Agar galti se commit ho gaya, sirf file delete karna kaafi nahi — git history se bhi purge karna padega aur us secret ko turant **rotate** (badal) karna padega, kyunki ek baar git history mein aa gaya toh maano leak ho hi gaya
- **External secret management use karo** production ke liye — HashiCorp Vault, AWS Secrets Manager, GCP Secret Manager jaise tools. Kubernetes ke native Secrets ek baseline hain, lekin bade production systems (jaise Paytm ya PhonePe scale ke) mein aksar external vault use hota hai jo automatic rotation, audit logging, aur fine-grained access control deta hai
- **Encrypt secrets at rest** with `--encryption-provider` — by default, etcd (jahan Kubernetes apna saara state store karta hai) mein secrets plaintext-ish (base64) form mein hi baithe hote hain. Encryption-at-rest enable karne se etcd disk compromise hone par bhi secrets safe rehte hain
- **RBAC se secret access restrict karo** — sirf woh service accounts/users jinko zaruri hai unhi ko `get`/`list` permission do secrets pe. Ek intern ka access token pura production database password read kar sake — yeh nightmare scenario hai jo RBAC missing hone se hota hai
- **Secrets regularly rotate karo** — jaise tum apna UPI PIN kabhi-kabhi change karte ho security ke liye, waise hi API keys, database passwords, TLS certs ko periodically rotate karna chahiye. Agar koi employee leave kar gaya jiske paas access tha, turant rotate karo

---

## Key Takeaways

- **ConfigMap** non-sensitive configuration store karta hai (env vars, config files); **Secret** sensitive data store karta hai (passwords, API keys, certs) — dono ka structure/usage almost same hai, bas intent alag hai
- Dono ko pod mein **environment variable** (`configMapKeyRef` / `secretKeyRef`) ya **volume mount** ki tarah inject kiya ja sakta hai
- Sensitive files (private keys, certs) ke liye **volume mount** better hai environment variable ke comparison mein — kam leak surface
- **Base64 encoding encryption nahi hai** — Secret object apne aap secure nahi hota jab tak RBAC aur encryption-at-rest configure na ho
- ConfigMap update karne se running pods ke environment variables automatically refresh nahi hote — restart chahiye hota hai (volume mounts thoda automatic sync ho sakte hain)
- Production scale par native Kubernetes Secrets ke bajaye **external secret managers** (Vault, AWS Secrets Manager) prefer kiye jaate hain rotation aur audit trail ke liye
- Secrets **kabhi git mein commit** mat karo — accidental commit ho jaaye toh turant rotate karo, sirf delete karna kaafi nahi

Next: [Persistent Storage](./06_persistent_storage.md)
