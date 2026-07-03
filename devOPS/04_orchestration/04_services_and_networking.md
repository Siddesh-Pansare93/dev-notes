# Kubernetes Services & Networking

> Applications ko expose karna aur pods ke beech communication set up karna — yeh Kubernetes Services ka kaam hai.

Socho ek scenario — tumne apna app Kubernetes mein deploy kar diya, Pods bhi ban gaye, sab kuch running hai. Lekin ek problem hai: **Pods ephemeral hote hain**. Matlab agar ek Pod crash ho jaye ya restart ho, uska IP address change ho jaata hai. Ab agar tumhara frontend Pod, backend Pod ke IP ko hardcode karke rakhta hai, toh backend restart hote hi sab tut jaayega.

Yeh bilkul waise hi hai jaise Swiggy delivery partner ka phone number roz change ho jaye — restaurant use kaise track karega ki order kis rider ko dena hai? Isiliye Swiggy ek **stable order-ID / dispatch system** use karta hai jo automatically sahi rider ko route kar deta hai, chahe rider ka number kuch bhi ho. Kubernetes **Service** bilkul yehi role play karta hai — ek **stable, permanent address** deta hai jo underlying Pods ke IP change hone par bhi kaam karta rahega.

## Service Types

Kya hota hai Service ka kaam? Service ek **abstraction layer** hai jo ek stable IP/DNS name deta hai aur uske peeche multiple Pods ko load-balance karta hai (using label selectors). Kubernetes mein 4 major service types hain — chalo ek-ek karke samjhte hain.

### ClusterIP (Default)

Kyun zaruri hai? Jab tumhara ek microservice sirf **cluster ke andar hi** doosre services se baat karega — jaise backend API sirf database se baat karta hai, use internet se koi lena dena nahi — tab `ClusterIP` use hota hai. Yeh Kubernetes ka **default** service type hai (agar `type` specify na karo toh yehi milta hai).

```yaml
apiVersion: v1
kind: Service
metadata:
  name: myapp
spec:
  type: ClusterIP
  selector:
    app: myapp
  ports:
  - protocol: TCP
    port: 80
    targetPort: 3000
```

Yahan `selector: app: myapp` ka matlab hai — jitne bhi Pods ka label `app: myapp` hai, unhe is Service ke peeche group kar do. `port: 80` woh port hai jispe Service khud sunta hai, aur `targetPort: 3000` woh port hai jispe tumhara actual container (Pod ke andar) listen kar raha hai.

- **Internal only** — bahar se (internet se) koi access nahi kar sakta, sirf cluster ke andar ke Pods hi ise reach kar sakte hain
- **DNS**: `myapp.default.svc.cluster.local` — is naam se koi bhi Pod isse call kar sakta hai

> [!info]
> Isko aise socho — yeh tumhare company ke internal intranet jaisa hai. Sirf employees (cluster ke andar ke Pods) access kar sakte hain, bahar wala koi random banda nahi.

Zyaadatar internal microservices (jaise auth-service, payment-service jo sirf doosre backend services se baat karte hain) ClusterIP use karte hain.

### NodePort

Kya hota hai? `NodePort` ek static port (30000-32767 range mein) har **node** pe expose kar deta hai. Matlab agar tumhare paas 3 worker nodes hain, toh teeno ke IP pe usi port se app access ho jaayega.

```yaml
apiVersion: v1
kind: Service
metadata:
  name: myapp
spec:
  type: NodePort
  selector:
    app: myapp
  ports:
  - protocol: TCP
    port: 80
    targetPort: 3000
    nodePort: 30000  # Exposed on every node
```

- Access via `node-ip:30000`
- **Good for local testing** — jaise Minikube ya kind cluster pe quickly kuch expose karke check karna hai

> [!warning]
> Production mein directly NodePort use karna generally recommend nahi kiya jata — yeh raw hai, SSL/TLS handling nahi hai, load balancing bhi basic hai. Isko socho ek chai ki tapri jaisa — kaam chal jaayega local testing ke liye, lekin ek proper restaurant (LoadBalancer/Ingress) chahiye production scale ke liye.

### LoadBalancer

Kyun zaruri hai? Jab tumhe apna app **public internet** pe expose karna hai aur tumhare paas cloud provider hai (AWS, GCP, Azure), tab `LoadBalancer` type use hota hai. Yeh cloud provider ko bolta hai "bhai, ek real load balancer bana do (jaise AWS ELB ya GCP LB) aur usse mere Service tak traffic bhejo."

```yaml
apiVersion: v1
kind: Service
metadata:
  name: myapp
spec:
  type: LoadBalancer
  selector:
    app: myapp
  ports:
  - protocol: TCP
    port: 80
    targetPort: 3000
```

- Creates cloud load balancer (AWS ELB, GCP LB)
- **External IP assigned** — cloud provider tumhe ek public IP deta hai jispe internet se koi bhi access kar sakta hai

Socho isko Zomato ke customer-facing app jaisa — jo bhi customer order karna chahta hai, usko ek single, stable entry point milta hai (jaise app ka domain), aur backend mein Zomato ke servers alag-alag ho sakte hain, load balance hota rehta hai automatically.

> [!warning]
> Har `LoadBalancer` Service ek naya cloud load balancer create karta hai, aur cloud providers **isका paisa charge karte hain** per LB. Agar tumhare paas 10 services hain jo sab public expose karne hain, toh 10 LoadBalancers matlab costly ho jaayega. Isi problem ka solution hai — **Ingress**.

### Ingress

Kya hota hai? Ingress ek smart **traffic router** hai jo HTTP/HTTPS level pe kaam karta hai (Layer 7), aur ek hi entry point se multiple services ko route kar sakta hai based on hostname ya path. Isse tumhe har service ke liye alag LoadBalancer nahi chahiye — sirf **ek** LoadBalancer (jo Ingress Controller ke saamne khada hota hai), aur baaki sab routing rules ke through handle ho jaata hai.

```yaml
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: myapp
  annotations:
    cert-manager.io/cluster-issuer: "letsencrypt-prod"
spec:
  ingressClassName: nginx
  tls:
  - hosts:
    - myapp.com
    secretName: myapp-tls
  rules:
  - host: myapp.com
    http:
      paths:
      - path: /
        pathType: Prefix
        backend:
          service:
            name: myapp
            port:
              number: 80
      - path: /api
        pathType: Prefix
        backend:
          service:
            name: api-service
            port:
              number: 5000
```

Isko IRCTC ke ticket counter system jaisa socho — ek hi building (single entry — Ingress) hai, lekin andar alag-alag counters hain: "General Booking" counter (`/`) aur "Tatkal Booking" counter (`/api`). Customer bahar se ek hi jagah aata hai, aur security guard (Ingress Controller) usko sahi counter (service) tak route kar deta hai based on uski need (path).

Breakdown karte hain config ka:
- `ingressClassName: nginx` — batata hai kaunsa Ingress Controller (NGINX, Traefik, etc.) is Ingress ko handle karega. Ingress sirf ek **spec/rule** hai — actual traffic routing karne wala controller alag se cluster mein deploy hona chahiye.
- `tls` section — `myapp.com` ke liye HTTPS certificate `myapp-tls` secret se use hoga
- `cert-manager.io/cluster-issuer` annotation — yeh `cert-manager` tool ko bolta hai ki Let's Encrypt se automatically SSL certificate generate/renew karte raho
- `rules` — path-based routing: `/` pe aane wala traffic `myapp` service ko jaayega, `/api` pe aane wala traffic `api-service` ko

> [!tip]
> Real-world production setups mein **Ingress hi standard tareeka hai** external traffic ko manage karne ka — kyunki isme SSL termination, path/host-based routing, aur rate-limiting jaisi cheezein ek jagah configure ho jaati hain, without cost of multiple LoadBalancers.

## DNS & Discovery

Kaise ek Pod doosre Pod ko dhoondhta hai bina IP jaane? Iska jawab hai Kubernetes ka built-in **DNS system** — jise `CoreDNS` (ya purane clusters mein `kube-dns`) handle karta hai. Jab bhi tum ek Service banate ho, Kubernetes automatically ek DNS record create kar deta hai.

```bash
# Service DNS names
# myapp.default.svc.cluster.local
# myapp.default.svc
# myapp.default
# myapp

# In pods
curl http://myapp/api
```

Format samjho: `<service-name>.<namespace>.svc.cluster.local`. Agar tumhara Pod usi namespace mein hai jaha `myapp` service hai, toh sirf `myapp` naam se hi call kar sakte ho — Kubernetes ke DNS resolver ko pata hai baaki suffix kaise append karna hai (jaise tum office mein kisi colleague ko sirf first name se bulate ho, poora legal name nahi bolte).

Yeh bilkul UPI VPA (`name@bank`) jaisa hai — tumhe kisi ka bank account number yaad nahi rakhna, sirf ek human-readable ID (`myapp`) yaad rakho, backend mein resolution automatically ho jaata hai actual IP tak.

> [!info]
> Cross-namespace communication ke liye poora naam use karna padta hai: `myapp.other-namespace.svc.cluster.local`. Sirf `myapp` bolne se woh apne hi current namespace mein dhoondhega.

## Network Policies

Kya hota hai? By default, Kubernetes cluster mein **saare Pods ek doosre se baat kar sakte hain** — koi restriction nahi hoti. Yeh security ke liye risky hai. Socho agar tumhare CRED app mein koi bhi random microservice directly tumhare payment database se baat kar sake — bina kisi check ke! Isi wajah se **NetworkPolicy** aata hai, jo firewall rules jaisa kaam karta hai — kaun kisse baat kar sakta hai, yeh define karta hai.

```yaml
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: allow-api
spec:
  podSelector:
    matchLabels:
      app: api
  policyTypes:
  - Ingress
  - Egress
  ingress:
  - from:
    - podSelector:
        matchLabels:
          app: web
    ports:
    - protocol: TCP
      port: 5000
  egress:
  - to:
    - podSelector:
        matchLabels:
          app: db
    ports:
    - protocol: TCP
      port: 5432
```

Is policy ka matlab hai:
- Yeh rule `app: api` label wale Pods pe apply hota hai
- **Ingress** (incoming traffic): sirf `app: web` label wale Pods hi `api` Pods ko port `5000` pe call kar sakte hain — baaki koi nahi
- **Egress** (outgoing traffic): `api` Pods sirf `app: db` label wale Pods ko port `5432` (Postgres ka default port) pe call kar sakte hain — kahin aur nahi

Isko socho ek railway station ke security zones jaisa — General public sirf platform tak access kar sakta hai, staff-only areas mein sirf badge-holders enter kar sakte hain, aur control room sirf specific authorized logon ke liye hai. Har zone ka apna access-control rule hai.

> [!warning]
> NetworkPolicy tabhi kaam karti hai jab tumhare cluster ka **CNI plugin** (jaise Calico, Cilium) ise support karta ho. Sab CNI plugins NetworkPolicy enforce nahi karte — jaise basic `kubenet` ye support nahi karta. Agar tumne policy likh di lekin CNI support nahi karta, toh silently kuch effect nahi hoga — yeh ek common gotcha hai jisme log confuse ho jaate hain "maine policy toh likhi thi, kaam kyun nahi kar rahi?"

> [!tip]
> Best practice yeh hai ki production clusters mein **default-deny** policy laga do (sab kuch block, phir explicitly allow karo jo chahiye) — isse "zero trust" architecture milta hai, jahan koi bhi accidental communication allowed nahi hota.

---

## Key Takeaways

- **ClusterIP** — cluster ke andar internal communication ke liye, default type, bahar se access nahi
- **NodePort** — har node pe ek fixed port expose karta hai (30000-32767 range), mostly local testing ke liye useful
- **LoadBalancer** — cloud provider ka real load balancer bana ke public IP deta hai, but har service ke liye alag cost aata hai
- **Ingress** — single entry point se multiple services ko host/path ke basis pe route karta hai, SSL/TLS bhi handle karta hai, production ka standard tareeka
- **DNS discovery** — har Service ko automatic DNS name milta hai (`service.namespace.svc.cluster.local`), isliye Pods IP yaad rakhne ki bajaye naam se baat kar sakte hain
- **NetworkPolicy** — firewall jaisa kaam karta hai, define karta hai kaun kisse baat kar sakta hai (ingress/egress rules); CNI plugin ka support hona zaruri hai

Next: [ConfigMaps & Secrets](./05_configmaps_and_secrets.md)
