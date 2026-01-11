# Kubernetes Deployment Guide

## Prerequisites

- Kubernetes cluster (v1.24+)
- kubectl configured
- Ingress controller (nginx-ingress recommended)
- cert-manager (for TLS)

## Quick Start

```bash
# Create namespace
kubectl create namespace vis-o

# Apply configurations
kubectl apply -f k8s/ -n vis-o
```

## Files

| File | Description |
|------|-------------|
| `deployment.yaml` | Main application deployment |
| `service.yaml` | ClusterIP service |
| `ingress.yaml` | Ingress with TLS |
| `configmap.yaml` | Non-sensitive configuration |
| `secrets.yaml` | Sensitive configuration (template) |
| `hpa.yaml` | Horizontal Pod Autoscaler |

## Configuration

### Update Secrets

```bash
# Create secrets from .env file
kubectl create secret generic vis-o-secrets \
  --from-env-file=.env.production \
  -n vis-o
```

### Update ConfigMap

```bash
kubectl create configmap vis-o-config \
  --from-literal=VITE_APP_ENV=production \
  -n vis-o
```

## Monitoring

```bash
# Check pods
kubectl get pods -n vis-o

# Check logs
kubectl logs -f deployment/vis-o -n vis-o

# Check HPA status
kubectl get hpa -n vis-o
```

## Scaling

```bash
# Manual scale
kubectl scale deployment vis-o --replicas=5 -n vis-o

# Check autoscaling
kubectl describe hpa vis-o -n vis-o
```

## Troubleshooting

```bash
# Describe pod
kubectl describe pod <pod-name> -n vis-o

# Check events
kubectl get events -n vis-o --sort-by='.lastTimestamp'

# Port forward for debugging
kubectl port-forward svc/vis-o 8080:80 -n vis-o
```
