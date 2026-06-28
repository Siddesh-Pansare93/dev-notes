# Amazon EKS

> Managed Kubernetes on AWS with Elastic Kubernetes Service.

## Create EKS Cluster

```bash
# Create cluster
aws eks create-cluster \
  --name my-cluster \
  --version 1.28 \
  --role-arn arn:aws:iam::ACCOUNT:role/eks-service-role \
  --resources-vpc-config subnetIds=subnet-1a,subnet-1b,subnet-2a,subnet-2b

# Wait for cluster (10-15 minutes)
aws eks wait cluster-active --name my-cluster

# Update kubeconfig
aws eks update-kubeconfig --region us-east-1 --name my-cluster

# Verify
kubectl get nodes
```

## Node Groups

```bash
# Create node group
aws eks create-nodegroup \
  --cluster-name my-cluster \
  --nodegroup-name my-nodes \
  --subnets subnet-1a subnet-1b \
  --node-role arn:aws:iam::ACCOUNT:role/NodeInstanceRole \
  --instance-types t3.medium \
  --scaling-config minSize=1,maxSize=10,desiredSize=3
```

## Add-ons

```bash
# VPC CNI (networking)
aws eks create-addon \
  --cluster-name my-cluster \
  --addon-name vpc-cni

# CoreDNS (DNS)
aws eks create-addon \
  --cluster-name my-cluster \
  --addon-name coredns

# kube-proxy
aws eks create-addon \
  --cluster-name my-cluster \
  --addon-name kube-proxy
```

## IAM Roles for Service Accounts (IRSA)

```bash
# Enable IRSA
aws eks create-addon \
  --cluster-name my-cluster \
  --addon-name ebs-csi-driver \
  --service-account-role-arn arn:aws:iam::ACCOUNT:role/ebs-csi-driver

# Pods can now assume IAM roles
```

---

## Summary

- **EKS** is managed Kubernetes on AWS
- **Cluster** contains control plane (AWS managed)
- **Node groups** are worker nodes (EC2)
- **Add-ons** provide essential components
- **IRSA** enables pods to use AWS IAM
- **Fargate** option available for serverless pods

Next: [Helm Package Manager](./08_helm_package_manager.md)
