# Kubernetes Deployments

Socho tumne apna Node.js app Docker container mein daal diya, image bana li, aur ab usko production mein chalana hai — but sirf ek container chalana kaafi nahi hai. Agar woh container crash ho gaya toh? Agar tumhe naya version deploy karna hai bina downtime ke toh? Agar traffic badh gaya toh scale kaise karoge?

Yehi sab problems solve karta hai Kubernetes ka **Deployment** object. Isko aise socho — tum Zomato ke ops team ho, aur tumhare paas ek "manager" chahiye jo yeh sunishchit kare ki hamesha 3 delivery riders (pods) online rahein, koi crash ho jaye toh turant naya spawn ho jaye, aur jab naya app version release karna ho toh customers ko koi dikkat na ho (zero downtime). Deployment exactly yehi manager hai — yeh ReplicaSets ko manage karta hai, jo aage jaake actual Pods ko manage karte hain.

> [!info]
> Layering samjho: **Deployment → ReplicaSet → Pods**. Deployment tumhara high-level "declare karo kya chahiye" object hai. ReplicaSet uska "kitne copies chahiye" wala worker hai. Pod actual running container(s) hai. Tum kabhi bhi ReplicaSet ko directly touch nahi karte — Deployment usko khud manage karta hai.

## Deployment Basics

**Kya hota hai?** Deployment ek YAML manifest hai jisme tum batate ho — "mujhe is image ka, itne replicas ka, is configuration ka app chahiye" — aur Kubernetes control loop (controller) hamesha is desired state ko match karne ki koshish karta rehta hai. Yeh declarative approach hai, imperative nahi — matlab tum "yeh karo, phir woh karo" nahi bolte, balki "mujhe final result yeh chahiye" bolte ho, aur Kubernetes khud figure out karta hai kaise pahunche wahan.

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: myapp
  labels:
    app: myapp
spec:
  replicas: 3
  revisionHistoryLimit: 10  # Keep last 10 revisions
  selector:
    matchLabels:
      app: myapp
  strategy:
    type: RollingUpdate
    rollingUpdate:
      maxSurge: 1        # One extra pod during update
      maxUnavailable: 1  # Max one pod down
  template:
    metadata:
      labels:
        app: myapp
    spec:
      containers:
      - name: myapp
        image: myapp:1.0.0
        ports:
        - containerPort: 3000
        env:
        - name: NODE_ENV
          value: production
        livenessProbe:
          httpGet:
            path: /health
            port: 3000
          initialDelaySeconds: 30
          periodSeconds: 10
        readinessProbe:
          httpGet:
            path: /ready
            port: 3000
          initialDelaySeconds: 5
          periodSeconds: 5
        resources:
          requests:
            cpu: 100m
            memory: 128Mi
          limits:
            cpu: 500m
            memory: 512Mi
```

Ab is YAML ko line-by-line samjhte hain, kyunki har field ka apna purpose hai:

- **`replicas: 3`** — hamesha 3 pods running rehne chahiye. Agar ek crash ho jaye, Kubernetes turant naya spawn karega taaki count 3 wapas ho jaye. Yeh IRCTC ke reservation counters jaisa hai — agar ek counter down ho jaye, system automatically dusra counter activate kar deta hai taaki total capacity maintain rahe.

- **`revisionHistoryLimit: 10`** — Kubernetes purani ReplicaSets (revisions) ko history mein rakhta hai taaki tum rollback kar sako. Yeh number batata hai kitni purani revisions store rakhni hain. Zyada rakhoge toh etcd (K8s ka database) mein zyada clutter hoga, isliye 10 ek sensible default hai.

- **`selector.matchLabels`** — yeh batata hai Deployment ko kaunse Pods "mere hain" yeh pehchanne ke liye. Yeh label `app: myapp` template ke labels se match hona chahiye — warna Deployment create hi nahi hoga (Kubernetes error dega "selector does not match template labels").

- **`strategy.type: RollingUpdate`** — update kaise hoga uska tareeka. Do options hoti hain:
  - `RollingUpdate` (default) — ek-ek karke purane pods ko naye se replace karo, zero downtime ke saath.
  - `Recreate` — pehle saare purane pods maar do, phir naye banao. Isme downtime hota hai, but kabhi zaruri hota hai (jaise jab ek hi time pe old aur new version dono chalna DB migration ki wajah se allowed nahi hai).

- **`maxSurge: 1`** — update ke dauraan kitne EXTRA pods temporarily bana sakte hain replica count se upar. `maxSurge: 1` matlab agar tumhare 3 replicas hain, toh update ke time max 4 pods ek saath chal sakte hain (3 purane + 1 naya, phir gradually replace).

- **`maxUnavailable: 1`** — update ke dauraan max kitne pods "down" (unavailable) ho sakte hain. `maxUnavailable: 1` matlab kabhi bhi 2 se kam pods available nahi honge agar replicas 3 hain.

  > [!tip]
  > `maxSurge` aur `maxUnavailable` dono ka combination decide karta hai rollout kitna "aggressive" ya "conservative" hoga. Agar tumhe zero risk chahiye (bilkul bhi availability drop na ho), toh `maxUnavailable: 0` aur `maxSurge: 1` set karo — matlab pehle naya pod banao, ready hone do, tabhi purana hatao. Yeh Swiggy jaisa hai jab woh naya delivery partner app version rollout karte hain — pehle nayi app version wale riders ready karte hain, tab purane version wale riders ko gradually hatate hain, taaki kabhi bhi total riders available count kam na ho.

- **`livenessProbe`** — Kubernetes periodically check karta hai "kya yeh container abhi bhi zinda hai?" `/health` endpoint pe HTTP GET call karega. Agar yeh probe fail ho jaye (kai baar continuously), Kubernetes maan lega container "stuck" ho gaya hai aur usko **restart** kar dega. `initialDelaySeconds: 30` matlab container start hone ke baad pehle 30 second tak check hi nahi karega (app ko boot hone ka time dene ke liye).

- **`readinessProbe`** — yeh check karta hai "kya yeh container abhi traffic serve karne ke liye ready hai?" Agar fail ho jaaye, Kubernetes us pod ko Service ke load balancer se **temporarily hata dega** (restart nahi karega, bas traffic bhejna band kar dega) jab tak woh dobara ready na ho. Yeh farak samajhna important hai:
  - **Liveness fail = restart the container** ("yeh mar gaya hai, naya lao")
  - **Readiness fail = stop sending traffic** ("yeh abhi busy/warming-up hai, thoda ruko")

  > [!warning]
  > Bahut common mistake yeh hoti hai ki log liveness aur readiness dono ke liye same endpoint aur same config use kar lete hain. Isse dikkat yeh hoti hai — agar tumhara app DB connection ke wajah se temporarily slow ho (readiness fail hona chahiye), aur agar yeh liveness bhi fail kar de, toh Kubernetes container ko restart kar dega jabki restart se problem solve hi nahi hogi (DB abhi bhi slow hai) — result: **crash loop**. Isliye liveness ko halka rakho (bas "process chal raha hai kya" check karo), aur readiness ko heavier rakh sakte ho (DB connection, downstream dependencies check karo).

- **`resources.requests`** — yeh minimum guarantee hai jo container ko milega. Scheduler is value ko dekh kar decide karta hai kis node pe pod fit hoga. `cpu: 100m` matlab 0.1 CPU core (milli-cpu unit hai, 1000m = 1 core).

- **`resources.limits`** — yeh maximum hai jo container use kar sakta hai. Agar CPU limit cross kare, container **throttle** ho jayega (slow ho jayega but marega nahi). Agar memory limit cross kare, container ko **OOMKilled** (Out Of Memory killed) kar diya jayega aur restart hoga.

  > [!tip]
  > Requests aur limits set karna production mein mandatory samjho. Bina inke, ek buggy pod (jaise memory leak wala Node.js process) puri node ka resource kha sakta hai aur baaki sabhi pods ko affect kar sakta hai — "noisy neighbor" problem. Yeh bilkul waise hai jaise ek PG mein agar ek roommate poora bandwidth WiFi ka use kar le toh baaki sabka Netflix buffer hone lagta hai. Resource limits us roommate ko ek fixed bandwidth quota de dete hain.

### Deploy

```bash
# Create deployment
kubectl apply -f deployment.yaml

# Check rollout
kubectl rollout status deployment/myapp

# View pods
kubectl get pods -l app=myapp

# View deployment
kubectl describe deployment myapp
```

`kubectl apply` command idempotent hai — matlab tum isko baar-baar chala sakte ho, agar kuch change nahi hua toh kuch nahi hoga, agar YAML mein kuch update hua toh Kubernetes uss diff ko apply karega. Yeh `kubectl create` se better hai kyunki `create` dobara chalane pe error dega "already exists".

`kubectl rollout status` command block ho jaati hai terminal mein jab tak rollout complete na ho jaaye ya fail na ho jaaye — CI/CD pipelines mein yeh command bahut useful hai kyunki isse pata chal jata hai deployment successful hua ya nahi (exit code check karke).

## Updates & Rollbacks

**Kyun zaruri hai?** Production mein bugs aana normal hai. Sawaal yeh nahi ki bug aayega ya nahi, sawaal yeh hai ki jab aaye tab tum kitni jaldi purane, stable version pe wapas ja sakte ho. Kubernetes har deployment change ka ek **revision history** rakhta hai (jaise Git commits), isliye rollback ek single command hai.

### Update Image

```bash
# Update image
kubectl set image deployment/myapp \
  myapp=myapp:2.0.0 --record

# Check rollout
kubectl rollout status deployment/myapp

# View history
kubectl rollout history deployment/myapp

# Rollback to previous version
kubectl rollout undo deployment/myapp

# Rollback to specific revision
kubectl rollout undo deployment/myapp --to-revision=2
```

Jab tum `kubectl set image` chalate ho, Kubernetes background mein yeh karta hai:

1. Ek **naya ReplicaSet** banata hai naye image ke saath (0 replicas se start).
2. `RollingUpdate` strategy follow karte hue, naye ReplicaSet ke pods gradually scale up karta hai aur purane ReplicaSet ke pods gradually scale down karta hai — `maxSurge`/`maxUnavailable` ke rules follow karte hue.
3. Jab naya ReplicaSet fully up ho jaaye (sab pods Ready), purana ReplicaSet 0 replicas pe aa jaata hai (but delete nahi hota — history ke liye rakha jaata hai, `revisionHistoryLimit` tak).

`--record` flag (purane Kubernetes versions mein) command ko revision history mein save kar deta tha taaki `kubectl rollout history` mein dikhe kis command se change hua — newer Kubernetes versions mein yeh deprecated hai, but concept samajhna zaruri hai: **har change ek naya revision banata hai**.

`kubectl rollout undo` — yeh sabse powerful safety net hai jo Kubernetes deta hai. Socho tumne CRED app ka naya version deploy kiya aur pata chala payment flow break ho gaya — panic karne ki jagah bas ek command chalao:

```bash
kubectl rollout undo deployment/myapp
```

Yeh turant purane, working ReplicaSet ko scale up kar dega aur naye buggy wale ko scale down. Same RollingUpdate mechanism use hota hai, isliye rollback bhi zero-downtime hota hai.

> [!warning]
> Rollback sirf Deployment spec (image, env vars, resources, etc.) ko revert karta hai. Agar naye version ne koi **destructive DB migration** (jaise column drop kar diya) chalayi thi, toh rollback se woh migration wapas nahi hogi. Isliye DB schema changes ko hamesha backward-compatible rakho jab tak tumhe pakka yakeen na ho rollback ki zaroorat nahi padegi (blue-green migration pattern: pehle naya column add karo, dono versions ko chalne do, phir purana column hatao baad mein).

### Pause & Resume

```bash
# Pause deployment (prevents rollouts)
kubectl rollout pause deployment/myapp

# Make multiple changes
kubectl set image deployment/myapp myapp=myapp:2.0.0
kubectl set resources deployment/myapp -c=myapp --limits=cpu=500m

# Resume rollout
kubectl rollout resume deployment/myapp
```

**Kya hota hai?** Normally, jaise hi tum `kubectl set image` ya koi bhi spec change karte ho, Kubernetes turant naya rollout trigger kar deta hai. Lekin agar tumhe **multiple changes ek saath batch** karke deploy karne hain (jaise image update + resource limits change + env var change), toh har chhoti change pe alag rollout trigger hona wasteful hai — har change apna khud ka rolling update cycle start kar degi.

`kubectl rollout pause` batata hai Kubernetes ko "abhi rollout mat karo, bas spec accept karlo." Phir tum saari changes ek ke baad ek kar sakte ho — koi bhi actual pod restart nahi hoga tab tak. Jab sab changes ho jayein, `kubectl rollout resume` chalao aur Kubernetes **ek hi combined rollout** karega saari changes ke saath. Yeh IRCTC ke Tatkal booking jaisa hai — jab tak "Book" button na dabao, form mein saari details fill karte raho, ek hi baar mein submit hoga na ki har field ke baad.

## Scaling

**Kya hota hai?** Traffic badhne ya kam hone pe pods ki count change karna. Do tareeke hain — manual aur automatic.

```bash
# Scale to 5 replicas
kubectl scale deployment/myapp --replicas=5

# Autoscale
kubectl autoscale deployment myapp --min=2 --max=10 --cpu-percent=80
```

`kubectl scale` manual scaling hai — tum khud decide karte ho kitne replicas chahiye. Yeh useful hai jab tumhe pata ho traffic spike aa raha hai (jaise Big Billion Day sale se pehle Flipkart manually scale kar sakta hai).

`kubectl autoscale` **HPA (Horizontal Pod Autoscaler)** create karta hai — yeh ek controller hai jo automatically replicas ko adjust karta hai based on CPU usage (ya custom metrics jaise requests-per-second). Upar wala command bolta hai: "CPU average usage 80% se upar jaaye toh scale up karo (max 10 tak), aur kam ho jaaye toh scale down karo (min 2 tak)." Yeh bilkul Swiggy/Zomato ke peak lunch-hour aur dinner-hour scaling jaisa hai — automatically zyada delivery capacity online karo jab order volume badhta hai, aur off-peak hours mein resources bacha lo.

> [!tip]
> HPA CPU-based metrics ke liye Kubernetes Metrics Server ka hona zaroori hai cluster mein (jyaadatar managed clusters — EKS, GKE, AKS — mein pehle se installed hota hai). Production-grade setups mein log CPU ki jagah custom metrics (jaise queue length, request latency) use karte hain kyunki CPU hamesha accurate load indicator nahi hota — especially I/O-bound Node.js apps ke liye jahan CPU low reh sakta hai but requests queue mein stuck ho sakti hain.

> [!info]
> Yeh ek `HorizontalPodAutoscaler` YAML jaisa dikhega jo `kubectl autoscale` command background mein banata hai:
> ```yaml
> apiVersion: autoscaling/v2
> kind: HorizontalPodAutoscaler
> metadata:
>   name: myapp
> spec:
>   scaleTargetRef:
>     apiVersion: apps/v1
>     kind: Deployment
>     name: myapp
>   minReplicas: 2
>   maxReplicas: 10
>   metrics:
>   - type: Resource
>     resource:
>       name: cpu
>       target:
>         type: Utilization
>         averageUtilization: 80
> ```
> Isse tumhe pura control milta hai — imperative command se declarative YAML banake tum isko Git mein commit bhi kar sakte ho (GitOps style).

## Common Gotchas

- **Selector immutable hai** — ek baar Deployment ban jaaye, tum `spec.selector` change nahi kar sakte (labels wagera). Agar change karna hai toh Deployment delete karke naya banana padega.
- **`imagePullPolicy` bhool jaana** — agar tum `latest` tag use kar rahe ho aur `imagePullPolicy: Always` set nahi kiya, toh Kubernetes kabhi-kabhi purani cached image use kar lega, naya rollout ho hi nahi payega properly.
- **Readiness probe na hona** — agar readiness probe define nahi ki, toh Kubernetes container start hote hi usko "Ready" maan lega, chahe app abhi bhi boot ho raha ho — result: naye rollout ke dauraan requests fail hongi kyunki traffic un pods pe bhej diya jayega jo abhi ready nahi hain.
- **`maxUnavailable: 0` aur single replica** — agar tumhare paas sirf 1 replica hai aur `maxUnavailable: 0` set kiya hai, toh rollout kabhi complete hi nahi hoga (kyunki naya pod schedule hone ke liye resources chahiye but purana hata nahi sakte "0 unavailable" ke rule ki wajah se) — jab tak `maxSurge` kaafi na ho.

## Key Takeaways

- **Deployment** ek declarative object hai jo ReplicaSets aur Pods manage karta hai — tum "desired state" batate ho, Kubernetes usko maintain karta hai.
- **RollingUpdate strategy** (`maxSurge` + `maxUnavailable`) zero-downtime updates deta hai — production mein yeh default hona chahiye.
- **Liveness probe** = "restart karo agar mar gaya," **Readiness probe** = "traffic mat bhejo agar busy hai" — dono alag purpose serve karte hain, inhe mix mat karo.
- **Resource requests/limits** production mein mandatory hain — warna ek buggy pod poori node ke resources kha sakta hai.
- **`kubectl rollout undo`** ek single-command safety net hai bad deployments se recover karne ke liye — but DB migrations ko rollback nahi karta.
- **Pause/Resume** batch multiple changes ko ek single rollout mein combine karne ke liye use hota hai.
- **HPA (Horizontal Pod Autoscaler)** automatic scaling deta hai based on CPU ya custom metrics — Swiggy/Zomato jaisa peak-hour scaling.
- **`revisionHistoryLimit`** control karta hai kitni purani revisions rollback ke liye available rahengi.

Next: [Services & Networking](./04_services_and_networking.md)
