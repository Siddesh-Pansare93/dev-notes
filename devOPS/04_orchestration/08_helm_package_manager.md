# Helm: Kubernetes Package Manager

> Simplify Kubernetes deployments with Helm charts and templating.

Socho ek second — tumne Kubernetes seekha, `kubectl apply -f deployment.yaml` chalaya, phir `service.yaml`, phir `configmap.yaml`, phir `ingress.yaml`... Ab agle project mein wahi cheez phir se karni hai, bas image name aur replica count change karke. Copy-paste karoge? Values hardcode karke naye YAML files banaoge? Yeh exactly wahi dard hai jo **Helm** solve karta hai.

**Kya hota hai Helm?** Yeh Kubernetes ka **package manager** hai — bilkul waise hi jaise Node.js mein `npm`, Python mein `pip`, ya Ubuntu mein `apt` hota hai. Jaise `npm install express` karke tumhe pura Express package mil jaata hai without manually files download kiye, waise hi `helm install` karke tumhe ek pura application (deployment + service + configmap + ingress + secrets, sab kuch) ek command mein mil jaata hai — properly configured.

**Kyun zaruri hai?** Real-world mein ek "application" sirf ek YAML file nahi hoti. Zomato jaisa system socho — ek microservice ke liye tumhe chahiye: Deployment, Service, ConfigMap, Secret, Ingress, HorizontalPodAutoscaler, aur shayad ek PersistentVolumeClaim bhi. Yeh 6-7 files har environment (dev, staging, prod) ke liye alag-alag values ke saath maintain karna nightmare hai. Helm inko ek **"Chart"** (package) mein bundle kar deta haita hai, aur templating ke through values sirf ek jagah (`values.yaml`) se control hoti hain.

Isko aise socho — agar raw Kubernetes YAML files "ek-ek sabzi khareed ke ghar pe khud banana" hai, toh Helm chart hai **Swiggy Instamart ka ready-to-cook meal kit** — sab ingredients pehle se packaged hain, bas quantity (values) tumhare taste ke hisaab se adjust kar sakte ho, aur "install" karte hi pura dish (application) ban jaata hai.

## Helm Basics

Pehle Helm install karo, phir "repositories" add karo jahan se pre-built charts milte hain (jaise npm registry se packages milte hain), phir install/upgrade/rollback karo.

```bash
# Install Helm
curl https://raw.githubusercontent.com/helm/helm/main/scripts/get-helm-3 | bash

# Add repository
helm repo add stable https://charts.helm.sh/stable
helm repo update

# Search chart
helm search repo nginx

# Install chart
helm install my-nginx stable/nginx --values values.yaml

# List releases
helm list

# Upgrade
helm upgrade my-nginx stable/nginx --values values.yaml

# Rollback
helm rollback my-nginx 1

# Uninstall
helm uninstall my-nginx
```

Yahan har command ka matlab samajh lo:

- `helm repo add` — jaise tum npm mein ek naya private registry add karte ho, waise hi yahan tum ek "chart repository" (jaise Bitnami, ya company ka apna internal repo) add karte ho.
- `helm install my-nginx stable/nginx` — `my-nginx` yeh tumhare **release name** hai (matlab is specific installation ka naam), aur `stable/nginx` chart ka naam hai. Ek hi chart ko multiple baar, alag release names ke saath install kar sakte ho — jaise ek hi "Zomato app" code base se multiple restaurants ke liye alag instances chala sakte ho.
- `helm upgrade` — values change kiye? Naya image version aaya? Bas upgrade chalao, Helm khud diff nikaal ke sirf jo changed hai wahi apply karega.
- `helm rollback my-nginx 1` — yeh Helm ka **superpower** hai. Production mein deploy kiya aur sab crash ho gaya? Ek command mein revision 1 (pehli working state) pe wapas chale jao. Git jaisa version history hai — har `install`/`upgrade` ek naya "revision" banata hai.
- `helm uninstall` — sab kuch clean remove ho jaata hai, koi orphan resources nahi bachte.

> [!tip]
> `helm list` chalao toh tumhe pata chalega ki cluster mein kaunse releases already installed hain, unka status (deployed/failed/pending) kya hai, aur kaunsa revision number chal raha hai — ek dashboard jaisa.

## Chart Structure

**Chart kya hota hai?** Ek folder structure jisme tumhara pura application template form mein defined hota hai. Isko socho jaise ek **recipe book** — `Chart.yaml` mein dish ka naam aur version hai, `values.yaml` mein default ingredients quantities hain, aur `templates/` folder mein actual recipe steps (Kubernetes manifests, but placeholders ke saath) hain.

```
my-chart/
├── Chart.yaml
├── values.yaml
├── templates/
│   ├── deployment.yaml
│   ├── service.yaml
│   ├── configmap.yaml
│   └── _helpers.tpl
└── charts/
```

Har folder/file ka role:

- **`Chart.yaml`** — chart ka metadata: naam, version, description. Jaise `package.json` hota hai npm project mein.
- **`values.yaml`** — default configuration values. Yeh "single source of truth" hai — replica count, image tag, resource limits, sab yahin define hote hain.
- **`templates/`** — actual Kubernetes YAML files, lekin static values ki jagah `{{ .Values.xyz }}` jaise placeholders hote hain (Go templating language use hoti hai).
- **`_helpers.tpl`** — reusable template snippets (jaise functions) — naam generate karna, common labels lagana, etc. Yeh DRY (Don't Repeat Yourself) principle follow karne mein help karta hai.
- **`charts/`** — agar tumhara chart kisi doosre chart pe depend karta hai (jaise PostgreSQL chart), toh uski copy yahan store hoti hai (sub-charts).

### Chart.yaml

```yaml
apiVersion: v2
name: myapp
version: 1.0.0
appVersion: "1.0"
description: My application Helm chart
```

Do version numbers pe dhyan do jo confuse karte hain shuru mein:
- `version` — **chart** ka version hai (packaging ka version, jaise npm package version). Agar tumne templates mein koi change kiya, toh yeh badhta hai.
- `appVersion` — tumhari **application** ka version hai (jo Docker image tag ho sakta hai). Chart same rahe but app ka naya version aaya, toh sirf yeh badhega.

### values.yaml

Yeh file wahi cheez hai jisse tum apna deployment "customize" karte ho bina templates ko chhue.

```yaml
replicaCount: 3

image:
  repository: myapp
  tag: "1.0.0"
  pullPolicy: IfNotPresent

service:
  type: LoadBalancer
  port: 80
  targetPort: 3000

resources:
  limits:
    cpu: 500m
    memory: 512Mi
  requests:
    cpu: 250m
    memory: 256Mi

ingress:
  enabled: true
  hosts:
    - host: myapp.com
      paths:
        - path: /
```

Isko socho jaise Zomato ke ek microservice ka config — kitne replicas chahiye (traffic ke hisaab se), kaunsi image use karni hai, kitna CPU/memory allocate karna hai, aur ingress (domain routing) kaisa hoga. Dev environment mein `replicaCount: 1` rakh sakte ho, prod mein `replicaCount: 10` — bas alag `values-dev.yaml` aur `values-prod.yaml` files banao, template same rahega.

### deployment.yaml Template

Yeh hai asli jaadu — Go templating syntax (`{{ }}`) use karke values inject hoti hain.

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: {{ include "myapp.fullname" . }}
spec:
  replicas: {{ .Values.replicaCount }}
  template:
    spec:
      containers:
      - name: app
        image: "{{ .Values.image.repository }}:{{ .Values.image.tag }}"
        ports:
        - containerPort: {{ .Values.service.targetPort }}
        resources: {{ toYaml .Values.resources | nindent 10 }}
```

Line by line samjho:

- `{{ include "myapp.fullname" . }}` — yeh `_helpers.tpl` mein defined ek "function" call kar raha hai jo consistent naming banata hai (jaise `myapp-release-name`). `include` matlab kisi doosri jagah define ki hui template ko yahan "include" karo, aur `.` current context (sab values) pass kar raha hai.
- `{{ .Values.replicaCount }}` — `values.yaml` se `replicaCount` field uthaya. `.Values` matlab "values.yaml ka root object".
- `{{ .Values.image.repository }}:{{ .Values.image.tag }}` — nested fields bhi easily access ho jaate hain, dot notation se — bilkul JavaScript object access jaisa (`values.image.repository`).
- `{{ toYaml .Values.resources | nindent 10 }}` — `toYaml` function ek pura object (resources) YAML string mein convert karta hai, phir `nindent 10` usko 10 spaces indent karke insert karta hai. Yeh isliye zaruri hai kyunki `resources` block khud nested YAML hai — direct substitute karoge toh indentation bigad jaayega.

> [!info]
> Helm templating engine Go ke `text/template` package pe based hai. `|` (pipe) operator bilkul Unix pipe jaisa kaam karta hai — left side ka output right side function ko pass ho jaata hai.

## Advanced Features

### Values Overrides

**Kyun zaruri hai?** Default values.yaml ek baseline deta hai, lekin real deployments mein har baar kuch chhota-mota change karna padta hai (jaise CI/CD pipeline se image tag inject karna). Poore values.yaml file ko edit karna waste hai — Helm tumhe command-line se hi override karne deta hai.

```bash
# Override during install
helm install my-app myapp \
  --set replicaCount=5 \
  --set image.tag=2.0.0 \
  -f custom-values.yaml
```

Priority order samajh lo (jo baad mein specify hota hai wahi jeetta hai):
1. Chart ka default `values.yaml` (lowest priority)
2. `-f custom-values.yaml` se pass ki gayi file
3. `--set` flags (highest priority)

CI/CD pipeline mein yeh bahut common pattern hai — GitHub Actions se `--set image.tag=$GIT_SHA` pass karke automatically latest commit ka image deploy kar dena, bina koi file edit kiye.

> [!warning]
> `--set` ke through nested arrays/objects set karna thoda tricky hota hai (comma-escaping wagera). Complex overrides ke liye hamesha `-f` (values file) prefer karo, `--set` sirf chhote single-value changes ke liye use karo.

### Hooks

**Kya hota hai Hook?** Kabhi tumhe application deploy karne se **pehle** ya **baad** mein koi extra kaam karna padta hai — jaise database migration chalana, cache warm-up karna, ya cleanup karna. Helm hooks exactly yeh solve karte hain — Kubernetes Jobs ko lifecycle ke specific point pe trigger karte hain.

```yaml
apiVersion: batch/v1
kind: Job
metadata:
  name: db-migration
  annotations:
    "helm.sh/hook": pre-install
    "helm.sh/hook-weight": "-5"
spec:
  template:
    spec:
      containers:
      - name: migrate
        image: myapp:1.0.0
        command: ["./migrate.sh"]
```

Real example: IRCTC jaisa system deploy karte waqt agar naya database column add hua hai, toh application start hone se pehle migration script chalni chahiye — warna app crash ho jaayegi kyunki column exist nahi karta. `"helm.sh/hook": pre-install` annotation Helm ko bolta hai — "is Job ko main application install hone se **pehle** chalao".

Common hook types:
- `pre-install` / `post-install` — install se pehle/baad
- `pre-upgrade` / `post-upgrade` — upgrade se pehle/baad
- `pre-delete` / `post-delete` — uninstall se pehle/baad
- `pre-rollback` / `post-rollback` — rollback se pehle/baad

`hook-weight` batata hai order — agar multiple hooks same phase pe hain, toh lower weight pehle chalta hai (jaise queue priority).

### Dependencies

**Kya hota hai?** Kai baar tumhara application khud standalone nahi chalta — usko ek database (PostgreSQL), cache (Redis), ya message queue chahiye hota hai. Helm dependencies feature se tum in "sub-charts" ko apne chart mein declare kar sakte ho, aur Helm khud unko download/install kar dega.

```yaml
# Chart.yaml
dependencies:
  - name: postgresql
    version: "12.x"
    repository: "https://charts.bitnami.com/bitnami"
```

Socho tum CRED jaisa payment app bana rahe ho — usko ek PostgreSQL database chahiye. Tum khud se PostgreSQL ka poora deployment/statefulset/service likhne ke bajaye, Bitnami ka battle-tested PostgreSQL chart dependency ke tarah add kar lete ho. `helm dependency update` chalao, aur woh chart tumhare `charts/` folder mein download ho jaata hai. Ab `helm install my-app` karte hi tumhara app **aur** uska PostgreSQL, dono ek saath deploy ho jaate hain.

> [!tip]
> Dependencies ki values bhi override kar sakte ho apne `values.yaml` mein — sub-chart ke naam ke under nested karke. Jaise:
> ```yaml
> postgresql:
>   auth:
>     password: "supersecret"
> ```

---

## Popular Helm Charts

Yeh kuch battle-tested, production-grade charts hain jo community maintain karti hai — inhe khud se likhne ki zaroorat nahi, bas `helm install` karo:

- **nginx** - Web server
- **PostgreSQL/MySQL** - Databases
- **Redis** - Caching
- **Prometheus** - Monitoring
- **ELK** - Logging
- **Cert-Manager** - SSL certificates
- **Ingress-NGINX** - Ingress controller

Jaise npm mein tum `lodash` reinvent nahi karte, waise hi Kubernetes ecosystem mein yeh charts already itni baar test ho chuki hain (edge cases, security patches, best practices sab included) ki khud se likhna time waste karna hi hoga.

> [!warning]
> Purana `stable/` repository (jo isi note ke examples mein use hua hai) **deprecated** ho chuka hai. Real projects mein Bitnami (`https://charts.bitnami.com/bitnami`) ya official project repos (jaise `https://kubernetes.github.io/ingress-nginx`) use karo.

---

## Key Takeaways

- **Helm** Kubernetes ka package manager hai — npm/pip jaisa — jo multiple YAML manifests ko ek reusable "Chart" mein bundle karta hai.
- **Chart** ek folder structure hai (`Chart.yaml` + `values.yaml` + `templates/`) jo application ka blueprint define karta hai.
- **values.yaml** single source of truth hai configuration ke liye — dev/staging/prod ke liye alag values files bana ke same chart reuse kar sakte ho.
- **Templating** (`{{ .Values.xyz }}`) static YAML ko dynamic banata hai, taaki ek hi template se multiple environments serve ho sakein.
- **Hooks** lifecycle events (pre-install, post-upgrade, etc.) pe custom Jobs (jaise DB migrations) trigger karte hain.
- **Dependencies** doosre charts (jaise PostgreSQL, Redis) ko apne chart ke andar embed karne ka tareeka hai.
- **`helm rollback`** production ka safety net hai — ek command mein pichli working state pe wapas ja sakte ho, Git ki tarah revision history maintain hoti hai.
- **Repositories** community-maintained charts share karne ka mechanism hain — khud se common infra (nginx, Redis, monitoring stack) likhne ki zaroorat nahi.

Next: [Infrastructure as Code](../05_infrastructure_as_code/01_iac_concepts.md)
