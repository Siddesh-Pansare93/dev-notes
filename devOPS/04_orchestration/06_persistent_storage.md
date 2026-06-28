# Kubernetes Persistent Storage

> Manage stateful data with PersistentVolumes and PersistentVolumeClaims.

## PersistentVolume (PV)

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

## PersistentVolumeClaim (PVC)

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

## Use in Pod

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

## StorageClass

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

---

## StatefulSet (for Databases)

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

## CLI

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

---

## Summary

- **PersistentVolumes** provide storage
- **PersistentVolumeClaims** request storage
- **StatefulSets** manage stateful workloads
- **StorageClasses** define storage types
- **Expansion** grows volumes without downtime

Next: [EKS (AWS Kubernetes)](./07_eks_aws_kubernetes.md)
