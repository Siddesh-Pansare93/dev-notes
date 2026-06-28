---
tags: [deployment, ci-cd, github-actions]
aliases: [CI/CD, GitHub Actions, Pipeline]
stage: intermediate
---

# CI/CD Pipeline Example

> [!info] For the Express/TS dev
> Same idea as your Node CI: install deps, lint, test, build, push image, deploy. The Java differences: caching `~/.m2/repository`, uploading test reports (Surefire/JUnit XML), publishing JAR artifacts, and using Buildpacks/Jib instead of `docker build`.

## GitHub Actions: full pipeline

```yaml
name: ci-cd

on:
  push:
    branches: [main]
    tags: ['v*']
  pull_request:

permissions:
  contents: read
  packages: write
  id-token: write   # for OIDC to cloud

env:
  IMAGE: ghcr.io/${{ github.repository }}/orders-api

jobs:
  build-test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Set up JDK
        uses: actions/setup-java@v4
        with:
          distribution: temurin
          java-version: '21'
          cache: maven

      - name: Verify (compile + tests)
        run: ./mvnw -B verify

      - name: Upload test results
        if: always()
        uses: actions/upload-artifact@v4
        with:
          name: surefire-reports
          path: '**/target/surefire-reports/*.xml'

      - name: Publish test report
        if: always()
        uses: dorny/test-reporter@v1
        with:
          name: JUnit
          path: '**/target/surefire-reports/*.xml'
          reporter: java-junit

      - name: SonarQube
        if: github.event_name == 'push'
        env:
          SONAR_TOKEN: ${{ secrets.SONAR_TOKEN }}
        run: ./mvnw -B sonar:sonar

      - name: Upload JAR
        uses: actions/upload-artifact@v4
        with:
          name: app-jar
          path: target/*.jar

  build-image:
    needs: build-test
    if: github.event_name == 'push'
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-java@v4
        with: { distribution: temurin, java-version: '21', cache: maven }

      - name: Login to GHCR
        uses: docker/login-action@v3
        with:
          registry: ghcr.io
          username: ${{ github.actor }}
          password: ${{ secrets.GITHUB_TOKEN }}

      - name: Compute tag
        id: tag
        run: |
          if [[ "${{ github.ref }}" == refs/tags/v* ]]; then
            echo "tag=${GITHUB_REF#refs/tags/v}" >> $GITHUB_OUTPUT
          else
            echo "tag=${GITHUB_SHA::7}" >> $GITHUB_OUTPUT
          fi

      - name: Build & push image (Buildpacks)
        run: |
          ./mvnw -B spring-boot:build-image \
            -Dspring-boot.build-image.imageName=$IMAGE:${{ steps.tag.outputs.tag }} \
            -Dspring-boot.build-image.publish=true \
            -Ddocker.publishRegistry.username=${{ github.actor }} \
            -Ddocker.publishRegistry.password=${{ secrets.GITHUB_TOKEN }}

      - name: Sign image (cosign)
        uses: sigstore/cosign-installer@v3
      - run: cosign sign --yes $IMAGE:${{ steps.tag.outputs.tag }}

  deploy-staging:
    needs: build-image
    if: github.ref == 'refs/heads/main'
    runs-on: ubuntu-latest
    environment: staging
    steps:
      - uses: actions/checkout@v4
      - uses: azure/setup-kubectl@v4
      - run: |
          echo "${{ secrets.KUBECONFIG }}" > kubeconfig
          export KUBECONFIG=$PWD/kubeconfig
          kubectl set image deploy/orders-api app=$IMAGE:${GITHUB_SHA::7} -n staging
          kubectl rollout status deploy/orders-api -n staging --timeout=5m
```

## Caching tips

- `actions/setup-java@v4` with `cache: maven` covers `~/.m2/repository`
- For Gradle: `cache: gradle` does the same for `~/.gradle/caches`
- Cache hit usually saves 1-3 min on dependency resolution

## Speed wins

- Run unit + integration tests in parallel modules (`mvn -T 2C`)
- Use **Testcontainers reuse** between PR runs (mark containers as `withReuse(true)` and set `testcontainers.reuse.enable=true`)
- Skip image build for PRs — only on `main`/tags

## PR-only checks

Add a separate workflow that runs `./mvnw verify -Pquick` (skips slow integration tests).

## Quality gates

- **JaCoCo** for coverage (`./mvnw verify -Pcoverage`)
- **Spotless** for formatting (`./mvnw spotless:check`)
- **OWASP Dependency-Check** for known CVEs
- **Trivy** for image vulnerability scanning

```yaml
      - name: Trivy image scan
        uses: aquasecurity/trivy-action@master
        with:
          image-ref: ${{ env.IMAGE }}:${{ steps.tag.outputs.tag }}
          severity: CRITICAL,HIGH
          exit-code: '1'
```

## Deployment strategies

- **Rolling** (default in K8s) — usually fine
- **Blue/Green** — cut over via Service selector swap
- **Canary** — Argo Rollouts, Flagger, or Istio traffic split
- **GitOps** — push manifests to a config repo; ArgoCD reconciles

## Secrets

Use OIDC federation (no long-lived keys):
- AWS: `aws-actions/configure-aws-credentials@v4`
- GCP: `google-github-actions/auth@v2`
- Azure: `azure/login@v2`

## Related
- [[02-Docker-for-Spring-Boot]]
- [[04-Kubernetes-Basics]]
- [[01-Maven-Basics]]
- [[06-Profiles-Per-Environment]]
- [[01-Testing-Strategy]]
