# Persistent Volumes

## What You'll Learn

- Why Pods need external storage
- PersistentVolumes (PV) and PersistentVolumeClaims (PVC)
- StorageClasses
- Running a database with persistent storage

---

## The Problem

Container storage is ephemeral. When a Pod is deleted or rescheduled, its data is lost — bad for databases.

```
Pod: postgres (deleted) → data GONE
Pod: postgres (new)     → starts fresh, empty database
```

Kubernetes solves this with **PersistentVolumes** — storage that exists independently of Pods.

---

## The Three Objects

```
StorageClass → PersistentVolume (PV) → PersistentVolumeClaim (PVC) → Pod
```

| Object | What it is |
|--------|-----------|
| **StorageClass** | A type of storage (e.g., "fast SSD", "standard disk"). Defines how volumes are provisioned |
| **PersistentVolume (PV)** | An actual piece of storage (a disk, NFS share, etc.) |
| **PersistentVolumeClaim (PVC)** | A request for storage. Your Pod asks for "5GB of standard storage" |

Think of it like this:
- StorageClass = Amazon EC2 storage type (gp2, io1, sc1)
- PV = an actual EBS volume
- PVC = "please give my Pod 10GB of storage"

---

## StorageClass

Docker Desktop has a default StorageClass that uses your local disk:

```bash
kubectl get storageclass
# NAME                 PROVISIONER          RECLAIMPOLICY   VOLUMEBINDINGMODE
# docker-desktop (default)  docker.io/hostpath   Delete          Immediate
```

On cloud providers, you'd have: `standard`, `premium-ssd`, `gp2`, `gp3`, etc.

---

## Dynamic Provisioning (the easy way)

When you create a PVC with a StorageClass, Kubernetes automatically creates a PV for you:

```yaml
# pvc.yaml
apiVersion: v1
kind: PersistentVolumeClaim
metadata:
  name: postgres-pvc
spec:
  accessModes:
    - ReadWriteOnce       # one node can mount it at a time
  storageClassName: docker-desktop  # or 'standard', 'gp2', etc.
  resources:
    requests:
      storage: 1Gi        # 1 gigabyte
```

```bash
kubectl apply -f pvc.yaml

kubectl get pvc
# NAME          STATUS   VOLUME        CAPACITY   ACCESS MODES   STORAGECLASS     AGE
# postgres-pvc  Bound    pvc-xxx-yyy   1Gi        RWO            docker-desktop   5s
# STATUS=Bound means a PV was created and attached
```

---

## Access Modes

| Mode | Meaning | Use case |
|------|---------|----------|
| `ReadWriteOnce` (RWO) | One node, read+write | Databases, single-instance apps |
| `ReadOnlyMany` (ROX) | Many nodes, read only | Shared config files |
| `ReadWriteMany` (RWX) | Many nodes, read+write | Shared file storage (NFS) |

Most cloud block storage (EBS, GCP Persistent Disk) only supports RWO.

---

## Using a PVC in a Pod

```yaml
spec:
  containers:
    - name: postgres
      image: postgres:16-alpine
      env:
        - name: POSTGRES_PASSWORD
          valueFrom:
            secretKeyRef:
              name: postgres-secret
              key: password
      volumeMounts:
        - name: postgres-storage
          mountPath: /var/lib/postgresql/data

  volumes:
    - name: postgres-storage
      persistentVolumeClaim:
        claimName: postgres-pvc    # reference the PVC
```

---

## Complete PostgreSQL Deployment

```yaml
# postgres-all.yaml

# Secret for the password
apiVersion: v1
kind: Secret
metadata:
  name: postgres-secret
type: Opaque
stringData:
  password: mysecretpassword

---
# PVC for data persistence
apiVersion: v1
kind: PersistentVolumeClaim
metadata:
  name: postgres-pvc
spec:
  accessModes:
    - ReadWriteOnce
  resources:
    requests:
      storage: 5Gi

---
# Deployment
apiVersion: apps/v1
kind: Deployment
metadata:
  name: postgres
spec:
  replicas: 1        # databases typically have 1 replica (use StatefulSet for HA)
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
          image: postgres:16-alpine
          env:
            - name: POSTGRES_DB
              value: myapp
            - name: POSTGRES_USER
              value: appuser
            - name: POSTGRES_PASSWORD
              valueFrom:
                secretKeyRef:
                  name: postgres-secret
                  key: password
            - name: PGDATA
              value: /var/lib/postgresql/data/pgdata
          ports:
            - containerPort: 5432
          volumeMounts:
            - name: postgres-storage
              mountPath: /var/lib/postgresql/data
          readinessProbe:
            exec:
              command: ["pg_isready", "-U", "appuser", "-d", "myapp"]
            initialDelaySeconds: 5
            periodSeconds: 10
      volumes:
        - name: postgres-storage
          persistentVolumeClaim:
            claimName: postgres-pvc

---
# Service (ClusterIP for internal access)
apiVersion: v1
kind: Service
metadata:
  name: postgres
spec:
  selector:
    app: postgres
  ports:
    - port: 5432
      targetPort: 5432
```

```bash
kubectl apply -f postgres-all.yaml

kubectl get pods
# NAME                        READY   STATUS    AGE
# postgres-5d8c6b7f9-xyz12    1/1     Running   30s

kubectl get pvc
# NAME          STATUS   VOLUME   CAPACITY   AGE
# postgres-pvc  Bound    pvc-...  5Gi        30s

# Connect
kubectl port-forward service/postgres 5432:5432 &
psql -h localhost -U appuser -d myapp
```

---

## What Happens When the Pod is Deleted?

```bash
kubectl delete pod postgres-5d8c6b7f9-xyz12
# Deployment creates a new pod: postgres-5d8c6b7f9-abc34

# The PVC still exists — the new pod re-attaches to the same storage
# All your data is still there!

kubectl port-forward service/postgres 5432:5432 &
psql -h localhost -U appuser -d myapp
# \dt  → tables still exist, data intact
```

---

## StatefulSet for Databases

For production databases with multiple replicas, use a **StatefulSet** instead of Deployment:

- Pods get stable, predictable names (`postgres-0`, `postgres-1`, `postgres-2`)
- Each Pod gets its own PVC (not shared)
- Ordered startup and shutdown

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
    # ... same pod spec as above
  volumeClaimTemplates:         # PVC created for each pod
    - metadata:
        name: postgres-storage
      spec:
        accessModes: ["ReadWriteOnce"]
        resources:
          requests:
            storage: 5Gi
```

---

**Next**: [Namespaces](./03_namespaces.md) — organize and isolate workloads
