# Kubernetes Persistent Storage

Socho tumne ek Postgres database ka pod bana diya Kubernetes mein. Sab kuch chal raha hai, data insert ho raha hai, sab badhiya. Ab achanak wo pod crash ho gaya — kya hota hai? Kubernetes turant ek naya pod spin up kar deta hai (self-healing, remember?), lekin us naye pod ke andar tumhara saara data **gayab** hai. Kyun? Kyunki container ka filesystem by default **ephemeral** hota hai — matlab container mit गया toh uske andar likha hua data bhi mit gaya.

Yeh bilkul waise hai jaise tum Ola/Uber mein baithe ho aur apna phone seat pe hi bhool gaye — gaadi (pod) badal gayi, driver (container) badal gaya, aur tumhara phone (data) us purani gaadi ke saath hi chala gaya. Agar tumhe apna saamaan har trip mein saath rakhna hai, toh use gaadi se **alag** rakhna padega — apne bag mein, jo tum khud carry karte ho gaadi badalne pe bhi.

Kubernetes mein yeh "bag jo gaadi se independent hai" wahi cheez hai jise hum **Persistent Volume** kehte hain. Databases, file uploads, logs — jahan bhi data **survive** karna chahiye pod restarts/crashes ke baad, wahan yeh concept zaruri hai.

> [!info]
> Stateless apps (jaise ek simple REST API jo sirf request process karke response deta hai) ko persistent storage ki zarurat nahi hoti. Lekin stateful apps — databases (Postgres, MySQL, MongoDB), message queues (Kafka, RabbitMQ), search engines (Elasticsearch) — inhe hamesha persistent storage chahiye.

## PersistentVolume (PV) — Kya hota hai?

**PersistentVolume (PV)** ek cluster-level storage resource hai — yeh admin (ya cloud provider) ne provision kiya hua actual physical/virtual storage hai (AWS EBS disk, GCP Persistent Disk, NFS share, ya on-prem storage). Isko socho jaise ek **warehouse ka godown** — building ke bahar ek alag storage unit jo apne aap mein hi exist karta hai, chahe koi tenant (pod) use kare ya na kare.

```yaml
apiVersion: v1
kind: PersistentVolume
metadata:
  name: db-pv
spec:
  capacity:
    storage: 10Gi
  accessModes:
    - ReadWriteOnce
  storageClassName: fast
  awsElasticBlockStore:
    volumeID: vol-123456
    fsType: ext4
```

Yahan breakdown samjho:
- **`capacity.storage: 10Gi`** — yeh disk 10GB ka hai. Bilkul waise jaise tum BigBasket pe koi storage box order karte ho, uski size fix hoti hai.
- **`accessModes`** — yeh define karta hai ki yeh volume kitne pods ek saath use kar sakte hain aur kaise:
  - `ReadWriteOnce (RWO)` — sirf **ek node** se ek waqt mein read-write ho sakta hai. Zyada tar block storage (AWS EBS, GCP PD) is type ke hote hain. Postgres jaisi single-instance database ke liye perfect.
  - `ReadOnlyMany (ROX)` — multiple nodes se sirf read kar sakte ho, likh nahi sakte. Jaise ek static config file jo saare pods share kar rahe hain.
  - `ReadWriteMany (RWX)` — multiple nodes se ek saath read-write ho sakta hai. Yeh NFS, EFS jaisi network file systems mein milta hai — matlab jaise Google Drive ka shared folder jisme office ke saare log ek saath likh-padh sakte hain.
- **`awsElasticBlockStore`** — yeh batata hai ki actual storage kahan hai (yahan AWS EBS volume `vol-123456`). Cloud provider ke hisaab se yeh field alag hoga (GCP ke liye `gcePersistentDisk`, Azure ke liye `azureDisk`, on-prem ke liye `nfs` ya `hostPath`).

> [!tip]
> Real production clusters mein PV manually kabhi-kabhi hi banate hain — zyadatar **dynamic provisioning** use hota hai jahan PVC banate hi StorageClass automatically PV create kar deta hai. Neeche StorageClass section mein yeh dekhenge.

## PersistentVolumeClaim (PVC) — Kyun zaruri hai?

Ab yahan interesting part aata hai. PV toh ek raw storage resource hai — lekin ek developer directly PV ka naam pod mein hardcode nahi karna chahta, kyunki har cluster mein alag PV hoga, alag cloud provider hoga. Isliye Kubernetes mein ek indirection layer hai: **PersistentVolumeClaim (PVC)**.

Socho aise — PV ek godown hai jisme jagah available hai, aur PVC tumhara **"request form"** hai jisme tum likhte ho "mujhe 10GB storage chahiye, fast speed wali". Tumhe pata nahi konsa exact godown (PV) allot hoga — Kubernetes khud match kar dega tumhari request ko available PV se. Bilkul Swiggy pe order karne jaisa — tum order karte ho "2 plate biryani chahiye", tumhe pata nahi kaunsa restaurant assign hoga, Swiggy khud nearest available restaurant match kar deta hai.

```yaml
apiVersion: v1
kind: PersistentVolumeClaim
metadata:
  name: db-data
spec:
  accessModes:
    - ReadWriteOnce
  storageClassName: fast
  resources:
    requests:
      storage: 10Gi
```

Yahan PVC keh raha hai: "mujhe `ReadWriteOnce` access mode wala, `fast` storage class ka, kam se kam `10Gi` size ka volume chahiye." Kubernetes ka control plane background mein isse match karega ek available PV se (jiska size >= 10Gi ho aur access mode match kare), aur **binding** kar dega. Ek baar bind ho gaya, toh PVC-PV pair ek-dusre se exclusively bandh jaate hain — dusra koi PVC us PV ko claim nahi kar sakta.

> [!warning]
> Agar tumhare paas koi bhi matching PV available nahi hai aur dynamic provisioning bhi configure nahi hai, toh PVC `Pending` state mein atka reh jayega. `kubectl get pvc` chalao aur `STATUS` column check karo — agar `Pending` dikhe toh `kubectl describe pvc <name>` se events check karo, usually storage class ya capacity mismatch hoti hai.

## Pod Mein Use Karna

Ab is PVC ko actually pod ke andar mount karna hota hai, taaki container ka process is storage ko file system ki tarah access kar sake.

```yaml
apiVersion: v1
kind: Pod
metadata:
  name: postgres
spec:
  containers:
  - name: postgres
    image: postgres:15
    volumeMounts:
    - name: data
      mountPath: /var/lib/postgresql/data
  volumes:
  - name: data
    persistentVolumeClaim:
      claimName: db-data
```

Do cheezein ho rahi hain yahan:
1. **`volumes`** — pod level pe define karte ho ki `data` naam ka volume `db-data` PVC se aayega.
2. **`volumeMounts`** — container ke andar batate ho ki yeh volume kis path pe **mount** hoga. Postgres apna data `/var/lib/postgresql/data` mein likhta hai — toh hum wahi path point karte hain.

Ab agar yeh `postgres` pod kabhi crash ho jaaye ya delete karke naya banaya jaaye (same PVC ke saath), toh naya pod bhi wahi `db-data` PVC mount karega aur **saara purana data waapas mil jayega** — jaise tumne apna bag ek gaadi se utaar ke doosri gaadi mein rakh liya, saamaan wahi ka wahi hai.

## StorageClass — Automatic Provisioning

Manually PV banana painful hai, especially cloud environments mein jahan disks on-demand create ho sakte hain. Isiliye **StorageClass** hai — yeh ek "template/blueprint" hai jo batata hai ki jab bhi koi PVC is class ko refer kare, toh **automatically** ek naya PV kaise provision karna hai.

```yaml
apiVersion: storage.k8s.io/v1
kind: StorageClass
metadata:
  name: fast
provisioner: ebs.csi.aws.com
parameters:
  type: gp3
  iops: "3000"
  throughput: "125"
allowVolumeExpansion: true
```

Isko IRCTC ke Tatkal booking jaisa socho — tum form bharte ho (PVC), aur backend automatically tumhare liye seat (PV) allocate kar deta hai kisi predefined rule ke hisaab se (StorageClass), bina kisi manual intervention ke.

- **`provisioner`** — kaunsa system actual disk banayega. `ebs.csi.aws.com` matlab AWS EBS CSI driver naya EBS volume banayega. GCP ke liye `pd.csi.storage.gke.io`, Azure ke liye `disk.csi.azure.com` hoga.
- **`parameters`** — disk ki specific properties: yahan `gp3` type ka EBS volume with `3000` IOPS aur `125 MB/s` throughput.
- **`allowVolumeExpansion: true`** — bahut important flag! Isse baad mein volume ko **resize** (bada) kar sakte ho bina data loss ke, downtime ke bina.

> [!tip]
> Most managed Kubernetes services (EKS, GKE, AKS) mein ek default StorageClass already installed hoti hai. `kubectl get storageclass` chalao aur dekho — agar ek StorageClass ke saamne `(default)` likha hai toh PVC mein `storageClassName` mention na karne pe wahi use hogi.

## StatefulSet — Databases Ke Liye Special Workload

Ab yahan ek zaruri sawaal — humne pod mein directly PVC mount kiya, lekin production mein toh Deployment use karte hain scaling ke liye, right? Postgres ka ek Deployment banaye 3 replicas ke saath toh?

Yahan dikkat hai: agar 3 replicas ek hi PVC (`ReadWriteOnce`) ko mount karne ki koshish karein, toh sirf ek pod usse attach kar payega (kyunki RWO sirf ek node se attach hota hai) — baaki fail ho jayenge. Aur agar teeno alag PVC lein bhi, Deployment mein pods ke naam random hote hain (`postgres-7d9f8b6c-x2k9p` jaisa) — restart hone pe naam badal jaata hai, toh "kaunsa pod kaunsa PVC use kare" yeh track karna mushkil ho jaata hai.

Isi problem ko solve karne ke liye Kubernetes mein **StatefulSet** hai. Yeh Deployment jaisa hi hai, lekin stateful applications ke liye designed hai:
- Har pod ko ek **stable, predictable naam** milta hai: `postgres-0`, `postgres-1`, `postgres-2` (index ke saath, random hash nahi).
- Har pod ka apna **dedicated PVC** hota hai jo us specific pod ke saath permanently jud jaata hai — `postgres-0` hamesha apni hi PVC use karega, chahe wo kitni baar bhi restart ho.
- Pods **ek order mein** create/delete hote hain (0, phir 1, phir 2) — jo master-replica database setups mein zaruri hota hai.

```yaml
apiVersion: apps/v1
kind: StatefulSet
metadata:
  name: postgres
spec:
  serviceName: postgres
  replicas: 1
  selector:
    matchLabels:
      app: postgres
  template:
    metadata:
      labels:
        app: postgres
    spec:
      containers:
      - name: postgres
        image: postgres:15
        volumeMounts:
        - name: data
          mountPath: /var/lib/postgresql/data
  volumeClaimTemplates:
  - metadata:
      name: data
    spec:
      accessModes: [ReadWriteOnce]
      storageClassName: fast
      resources:
        requests:
          storage: 20Gi
```

Sabse important part yahan **`volumeClaimTemplates`** hai. Yeh ek "template" hai — StatefulSet har replica ke liye is template se **apna alag PVC** khud-ba-khud bana deta hai. Agar `replicas: 3` hota, toh teen PVCs banti: `data-postgres-0`, `data-postgres-1`, `data-postgres-2` — har ek apne respective pod ke saath permanently bandhi hui.

Isko socho apartment building ki tarah — Deployment ek hostel jaisa hai jahan koi bhi bed le sakta hai (interchangeable), jabki StatefulSet ek **owned flat** jaisa hai jahan Flat 101 ka maalik hamesha wahi rahega, uska naam badalta nahi, aur uska saaman (PVC) sirf usi flat ke saath judaa rehta hai.

> [!info]
> `serviceName: postgres` field ek **headless Service** ko point karta hai (jisme `clusterIP: None` hota hai) — yeh har pod ko ek stable DNS name deta hai jaise `postgres-0.postgres.default.svc.cluster.local`, jisse dusre services specific replica se directly connect kar sakein (jaise primary database se connect karna hai toh `postgres-0` se hi karo).

## CLI Commands — Roz Kaam Aane Wale

```bash
# List PVs
kubectl get pv

# List PVCs
kubectl get pvc

# Describe
kubectl describe pvc db-data

# Resize
kubectl patch pvc db-data -p '{"spec":{"resources":{"requests":{"storage":"20Gi"}}}}'
```

- **`kubectl get pv`** — cluster mein saare available PVs dikhayega, unka status (`Available`, `Bound`, `Released`), capacity, aur access mode.
- **`kubectl get pvc`** — namespace ke PVCs dikhayega, unka binding status.
- **`kubectl describe pvc db-data`** — yeh sabse zyada debug karte waqt kaam aata hai. `Pending` state mein atke PVC ke events yahin milenge — konsi StorageClass fail hui, quota exceed hui, ya koi aur reason.
- **Resize/Expand** — agar `allowVolumeExpansion: true` hai StorageClass mein, toh tum live volume ko resize kar sakte ho **bina downtime ke**! `kubectl patch` se PVC ka size badhao, aur cloud provider background mein disk expand kar dega. Filesystem expansion ke liye kabhi-kabhi pod restart chahiye hota hai (CSI driver pe depend karta hai).

> [!warning]
> Volume **shrink** (chota) nahi kar sakte — sirf **expand** kar sakte ho. Agar galti se zyada size allocate kar diya, toh naya PVC banake data migrate karna padega. Toh capacity planning karte waqt zyada conservative raho, thoda buffer rakh ke start karo.

## Common Gotchas

1. **Access mode mismatch** — agar tumne `ReadWriteOnce` wale PVC ko multiple pods (multiple nodes pe scheduled) se mount karne ki koshish ki, second pod `ContainerCreating` mein hi atka reh jayega with a volume attach error.
2. **StorageClass na milna** — agar PVC mein galat ya non-existent `storageClassName` diya, PVC `Pending` reh jayega forever.
3. **Delete policy** — PV ke `reclaimPolicy` (default `Delete` dynamic PVs ke liye) yeh decide karta hai ki PVC delete hone pe actual disk data delete hoga ya `Retain` hoke bacha rahega. Production databases ke liye `Retain` policy set karna smart hai — accidental delete se data loss bachega.
4. **StatefulSet delete karne se PVC delete nahi hoti** — yeh design se hai! Agar tum StatefulSet delete karte ho, uske PVCs waise hi reh jaate hain (safety ke liye), tumhe manually `kubectl delete pvc` chalana padta hai agar data bhi hatana hai.

## Key Takeaways

- **PersistentVolume (PV)** actual storage resource hai — cluster ka ek godown jisme jagah hoti hai.
- **PersistentVolumeClaim (PVC)** ek request hai storage ke liye — developer bas itna bolta hai "mujhe itna storage chahiye", exact PV se matlab nahi.
- **StorageClass** dynamic provisioning ka blueprint hai — PVC banate hi automatically naya PV provision ho jaata hai, manual kaam nahi karna padta.
- **Access modes** (`ReadWriteOnce`, `ReadOnlyMany`, `ReadWriteMany`) decide karte hain volume kitne nodes se kaise access ho sakta hai.
- **StatefulSet** databases jaise stateful workloads ke liye use hota hai — stable pod names + dedicated per-pod PVC via `volumeClaimTemplates`.
- **Volume expansion** live kar sakte ho (`allowVolumeExpansion: true`), lekin shrink nahi kar sakte.
- **`reclaimPolicy: Retain`** production data ke liye zaruri hai taaki accidental PVC delete se real disk data na ud jaaye.

Next: [EKS (AWS Kubernetes)](./07_eks_aws_kubernetes.md)
